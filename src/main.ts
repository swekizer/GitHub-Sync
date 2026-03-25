/* eslint-disable obsidianmd/ui/sentence-case */
import {Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, GithubSyncSettings, GithubSyncSettingTab} from "./settings";

import { ObsidianFS } from "./fs";
import { GitManager } from "./gitManager";

export default class GithubSyncPlugin extends Plugin {
	settings: GithubSyncSettings;
	gitManager: GitManager;

	async onload() {
		await this.loadSettings();

		const obsFs = new ObsidianFS(this.app.vault.adapter);
		this.gitManager = new GitManager(obsFs);

		this.addRibbonIcon('refresh-cw', 'Sync with GitHub', async (evt: MouseEvent) => {
			if (!this.settings.githubRepoUrl || !this.settings.githubPat) {
				new Notice('Please configure GitHub Repo URL and PAT in settings first.');
				return;
			}

			new Notice('Sync started...');
			this.gitManager.setAuthor(this.settings.authorName || 'Obsidian User', this.settings.authorEmail || 'user@example.com');

			try {
				// 1. Init/Clone fallback
				await this.gitManager.initOrClone(this.settings.githubRepoUrl, this.settings.githubPat);
				
				// 2. Stage & Commit
				new Notice('Staging & Committing...');
				await this.gitManager.stageAll();
				await this.gitManager.commit(`Sync from Obsidian on ${new Date().toLocaleString()}`);

				// 3. Fetch & Merge
				new Notice('Fetching from GitHub...');
				const fetchHead = await this.gitManager.fetch(this.settings.githubRepoUrl, this.settings.githubPat);
				
				new Notice('Merging changes...');
				await this.gitManager.merge(fetchHead);

				// 4. Push
				new Notice('Pushing to GitHub...');
				await this.gitManager.push(this.settings.githubRepoUrl, this.settings.githubPat);

				new Notice('Sync complete! ✔️');
			} catch (e: unknown) {
				console.error(e);
				new Notice(`Sync failed: ${(e as Error).message}`, 5000);
			}
		});

		this.addSettingTab(new GithubSyncSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<GithubSyncSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
