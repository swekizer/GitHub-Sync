# Obsidian GitHub Sync

This plugin allows you to sync your Obsidian vault with a private GitHub repository across both **Desktop** and **Mobile (iOS/Android)**.

By leveraging `isomorphic-git`, it does not rely on a native Git installation. It performs Git operations natively inside Obsidian using web technologies, making it fully portable.

## Features
- Complete Sync loop in one click: `Stage All -> Commit -> Fetch -> Merge -> Push`.
- Cross-platform: Bypasses mobile CORS restrictions by utilizing native HTTP network calls.

## How to Setup

1. **Install the Plugin**: Turn on the plugin in Obsidian Community Plugins.
2. **Generate GitHub PAT**:
   - Go to [GitHub Developer Settings](https://github.com/settings/tokens) > **Personal access tokens** (classic).
   - Generate a new token and give it the `repo` scope.
3. **Configure Plugin**:
   - Go to Obsidian Settings > GitHub Sync.
   - Paste in your Vault's **GitHub Repository URL** (e.g., `https://github.com/your-username/your-repo.git`).
   - Paste in your **Personal Access Token (PAT)**.
   - Set your **Author Name** and **Author Email** for commits.

## How to Use
Click the **"Sync with GitHub" icon** (refresh symbol) in the left/right Ribbon. The plugin will execute a total sync loop and show its progress using toast notifications.

## ⚠️ Important Limitations

* **Conflict Resolution ("Local Wins")**:
  If a merge conflict occurs during the Sync process (i.e., you edited the exact same file in two different places without syncing in between), this plugin currently aborts the automated merge without leaving conflict markers in your files. If you get a merge conflict error toast, you will need to resolve the conflict manually outside of this plugin for now. Future updates will introduce built-in conflict resolution dialogs.

* **Authentication**: Currently only supports GitHub Personal Access Tokens via HTTP. SSH is not supported.
