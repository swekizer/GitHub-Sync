import {Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, GithubSyncSettings, GithubSyncSettingTab} from "./settings";

import { ObsidianFS } from "./fs";
import { GitManager } from "./gitManager";

export default class GithubSyncPlugin extends Plugin {
	settings: GithubSyncSettings;
	gitManager: GitManager;
	autoSyncIntervalId: number | null = null;
	isSyncing = false;
	statusBarItemEl: HTMLElement;

	async onload() {
		await this.loadSettings();

		const obsFs = new ObsidianFS(this.app.vault.adapter);
		this.gitManager = new GitManager(obsFs, this.app.vault.configDir);

		this.addRibbonIcon('refresh-cw', 'Sync with GitHub', async () => {
			await this.runSync();
		});

		this.addSettingTab(new GithubSyncSettingTab(this.app, this));

		// Status bar
		this.statusBarItemEl = this.addStatusBarItem();
		this.setStatus('idle');

		// Start auto-sync if enabled
		this.restartAutoSync();
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

	async runSync() {
		if (!this.settings.githubRepoUrl || !this.settings.githubPat) {
			new Notice('Please configure GitHub repo URL and PAT in settings first.');
			this.setStatus('unconfigured');
			return;
		}

		if (this.isSyncing) {
			new Notice('Sync already in progress...');
			return;
		}

		this.isSyncing = true;
		new Notice('Sync started...');
		this.setStatus('syncing', 'starting...');
		this.gitManager.setAuthor(this.settings.authorName || 'Obsidian User', this.settings.authorEmail || 'user@example.com');

		try {
			// 1. Init/Clone fallback
			this.setStatus('syncing', 'initializing...');
			await this.gitManager.initOrClone(this.settings.githubRepoUrl, this.settings.githubPat);
			
			// 2. Stage & Commit
			this.setStatus('syncing', 'staging...');
			new Notice('Staging & committing...');
			await this.gitManager.stageAll();
			await this.gitManager.commit(`Sync from Obsidian on ${new Date().toLocaleString()}`);

			// 3. Fetch & Merge
			this.setStatus('syncing', 'fetching...');
			new Notice('Fetching from GitHub...');
			const fetchHead = await this.gitManager.fetch(this.settings.githubRepoUrl, this.settings.githubPat);
			
			this.setStatus('syncing', 'merging...');
			new Notice('Merging changes...');
			await this.gitManager.merge(fetchHead);

			// 4. Push
			this.setStatus('syncing', 'pushing...');
			new Notice('Pushing to GitHub...');
			await this.gitManager.push(this.settings.githubRepoUrl, this.settings.githubPat);

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
		if (this.settings.autoSyncEnabled && this.settings.autoSyncInterval >= 1) {
			const intervalMs = this.settings.autoSyncInterval * 60 * 1000;
			this.autoSyncIntervalId = window.setInterval(() => {
				void this.runSync();
			}, intervalMs);
			// Register interval with Obsidian so it's cleaned up automatically
			this.registerInterval(this.autoSyncIntervalId);
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
	}
}


