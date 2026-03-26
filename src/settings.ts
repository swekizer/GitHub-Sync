import {App, PluginSettingTab, Setting} from "obsidian";
import GithubSyncPlugin from "./main";

export interface GithubSyncSettings {
	githubRepoUrl: string;
	githubPat: string;
	authorName: string;
	authorEmail: string;
	autoSyncEnabled: boolean;
	autoSyncInterval: number; // in minutes
}

export const DEFAULT_SETTINGS: GithubSyncSettings = {
	githubRepoUrl: '',
	githubPat: '',
	authorName: '',
	authorEmail: '',
	autoSyncEnabled: false,
	autoSyncInterval: 5
}

export class GithubSyncSettingTab extends PluginSettingTab {
	plugin: GithubSyncPlugin;

	constructor(app: App, plugin: GithubSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('GitHub repository URL')
			.setDesc('Full URL to the repository (e.g., https://github.com/user/repo)')
			.addText(text => text
				.setPlaceholder('https://github.com/...')
				.setValue(this.plugin.settings.githubRepoUrl)
				.onChange(async (value) => {
					this.plugin.settings.githubRepoUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Personal access token (PAT)')
			.setDesc('GitHub PAT with repo permissions. Keep this secret!')
			.addText(text => {
				text.inputEl.type = 'password';
				text
				.setPlaceholder('ghp_...')
				.setValue(this.plugin.settings.githubPat)
				.onChange(async (value) => {
					this.plugin.settings.githubPat = value;
					await this.plugin.saveSettings();
				});
            });

		new Setting(containerEl)
			.setName('Author name')
			.setDesc('Name to use for Git commits')
			.addText(text => text
				.setPlaceholder('Your Name')
				.setValue(this.plugin.settings.authorName)
				.onChange(async (value) => {
					this.plugin.settings.authorName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Author email')
			.setDesc('Email to use for Git commits')
			.addText(text => text
				.setPlaceholder('you@example.com')
				.setValue(this.plugin.settings.authorEmail)
				.onChange(async (value) => {
					this.plugin.settings.authorEmail = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('Auto sync').setHeading();

		new Setting(containerEl)
			.setName('Enable auto sync')
			.setDesc('Automatically sync your vault at a regular interval.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSyncEnabled)
				.onChange(async (value) => {
					this.plugin.settings.autoSyncEnabled = value;
					await this.plugin.saveSettings();
					this.plugin.restartAutoSync();
				}));

		new Setting(containerEl)
			.setName('Sync interval (minutes)')
			.setDesc('How often to auto-sync. Minimum 1 minute.')
			.addText(text => text
				.setPlaceholder('5')
				.setValue(String(this.plugin.settings.autoSyncInterval))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num >= 1) {
						this.plugin.settings.autoSyncInterval = num;
						await this.plugin.saveSettings();
						this.plugin.restartAutoSync();
					}
				}));
	}
}

