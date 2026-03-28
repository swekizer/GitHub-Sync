/* eslint-disable obsidianmd/ui/sentence-case */
import {Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, GithubSyncSettings, GithubSyncSettingTab} from "./settings";

import { ObsidianFS } from "./fs";
import { GitManager } from "./gitManager";
import { SyncModal } from "./syncModal";

export default class GithubSyncPlugin extends Plugin {
	settings: GithubSyncSettings;
	gitManager: GitManager;
	autoSyncIntervalId: number | null = null;
	isSyncing = false;
	localChangesExist = true;
	statusBarItemEl: HTMLElement;

	async onload() {
		await this.loadSettings();

		const obsFs = new ObsidianFS(this.app.vault.adapter);
		this.gitManager = new GitManager(obsFs, this.app.vault.configDir);
		await this.gitManager.updateGitIgnore(this.settings.ignoredPaths);

		this.addRibbonIcon('refresh-cw', 'Sync with GitHub', async () => {
			await this.runSync();
		});

		this.addCommand({
			id: 'show-sync-status',
			name: 'Show Pending Changes',
			callback: () => {
				new SyncModal(this.app, this).open();
			}
		});

		this.addSettingTab(new GithubSyncSettingTab(this.app, this));

		// Status bar
		this.statusBarItemEl = this.addStatusBarItem();
		this.setStatus('idle');

		// Start auto-sync if enabled
		this.restartAutoSync();

		// Track local changes to avoid deep status checks when idle
		const setLocalChangesTrue = () => { this.localChangesExist = true; };
		this.registerEvent(this.app.vault.on('modify', setLocalChangesTrue));
		this.registerEvent(this.app.vault.on('create', setLocalChangesTrue));
		this.registerEvent(this.app.vault.on('delete', setLocalChangesTrue));
		this.registerEvent(this.app.vault.on('rename', setLocalChangesTrue));
	}

	onunload() {
		this.clearAutoSync();
	}

	setStatus(state: 'idle' | 'syncing' | 'failed' | 'unconfigured', detail?: string) {
		const labels = {
			idle: 'Git: ✓ synced',
			syncing: `Git: ⟳ ${detail || 'syncing...'}`,
			failed: 'Git: ✗ sync failed',
			unconfigured: 'Git: ⚠ not configured',
		};
		this.statusBarItemEl.setText(labels[state]);
	}

	async runSync(isAuto = false) {
		if (!this.settings.githubRepoUrl || !this.settings.githubPat) {
			new Notice('Please configure your GitHub repository URL and personal access token in settings.');
			this.setStatus('unconfigured');
			return;
		}

		if (this.isSyncing) {
			new Notice('Sync already in progress...');
			return;
		}

		try {
			this.isSyncing = true;
			this.setStatus('syncing', 'verifying connection...');

			// 0. Verify credentials and repo before proceeding
			try {
				await this.gitManager.getRemoteInfo(this.settings.githubRepoUrl, this.settings.githubPat);
			} catch (e: unknown) {
				const err = e as { statusCode?: number, message?: string };
				let msg = 'Connection failed';
				// Isomorphic-git throws HttpError with statusCode, but we fallback to message matching just in case
				if (err.statusCode === 401 || err.statusCode === 403 || err.message?.includes('401') || err.message?.includes('403')) {
					msg = 'Authentication failed — check your GitHub token.';
				} else if (err.statusCode === 404 || err.message?.includes('404')) {
					msg = 'Repository not found — check your GitHub Repository URL.';
				} else {
					msg = `Connection error: ${err.message || String(e)}`;
				}
				new Notice(`❌ ${msg}`, 7000);
				this.setStatus('failed');
				this.isSyncing = false;
				return;
			}

			new Notice('Sync started...');
			this.setStatus('syncing', 'starting...');
			this.gitManager.setAuthor(this.settings.authorName || 'Obsidian User', this.settings.authorEmail || 'user@example.com');

			// 1. Init/Clone fallback
			this.setStatus('syncing', 'initializing...');
			const localBackups = await this.gitManager.initOrClone(this.settings.githubRepoUrl, this.settings.githubPat);
			if (localBackups.length > 0) {
				new Notice(
					`⚠️ First-time setup: ${localBackups.length} local file(s) were backed up before being overwritten by remote.\n` +
					localBackups.map(f => `• ${f}`).join('\n'),
					12000
				);
			}

			// 2. Stage & Commit (skip if automated sync and no local changes detected)
			if (!isAuto || this.localChangesExist) {
				this.localChangesExist = false;
				
				this.setStatus('syncing', 'staging...');
				new Notice('Staging changes...');
				const hasChanges = await this.gitManager.stageAll();
				if (hasChanges) {
					new Notice('Committing...');
					await this.gitManager.commit(`Sync from Obsidian on ${new Date().toLocaleString()}`);
				}
			} else {
				console.debug('[DirectGitSync] Skipping local status check; no changes detected.');
			}

			// 3. Fetch & Merge
			this.setStatus('syncing', 'fetching...');
			new Notice('Fetching from GitHub...');
			const fetchHead = await this.gitManager.fetch(this.settings.githubRepoUrl, this.settings.githubPat);
			
			this.setStatus('syncing', 'merging...');
			new Notice('Merging changes...');
			const conflictCopies = await this.gitManager.merge(fetchHead);

			if (conflictCopies.length > 0) {
				// Conflict resolution: commit the staged files (local kept + remote copies)
				this.setStatus('syncing', 'resolving conflicts...');
				await this.gitManager.commit(`Sync: conflict resolved on ${new Date().toLocaleString()}`);
				new Notice(
					`⚠️ Conflict in ${conflictCopies.length} file(s).\n` +
					`Your local version was kept. Remote version saved as:\n` +
					conflictCopies.map(f => `• ${f}`).join('\n'),
					12000
				);
			}

			// 4. Push
			this.setStatus('syncing', 'pushing...');
			new Notice('Pushing to GitHub...');
			await this.gitManager.push(this.settings.githubRepoUrl, this.settings.githubPat);

			this.settings.lastSyncTime = Date.now();
			await this.saveSettings();

			this.setStatus('idle');
			new Notice('Sync complete! ✔️');
		} catch (e: unknown) {
			console.error(e);
			this.setStatus('failed');
			new Notice(`Sync failed: ${(e as Error).message}`, 5000);
		} finally {
			this.isSyncing = false;
		}
	}

	restartAutoSync() {
		this.clearAutoSync();
		if (this.settings.autoSyncEnabled && this.settings.autoSyncInterval >= 5) {
			const intervalMs = this.settings.autoSyncInterval * 60 * 1000;
			const id = window.setInterval(() => {
				void this.runSync(true);
			}, intervalMs);
			this.registerInterval(id);
			this.autoSyncIntervalId = id;
		}
	}

	clearAutoSync() {
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
			this.autoSyncIntervalId = null;
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<GithubSyncSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.gitManager.updateGitIgnore(this.settings.ignoredPaths);
	}
}


