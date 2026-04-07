# Obsidian Direct Git Sync

This plugin allows you to seamlessly sync your Obsidian vault with a private Git repository across both **Desktop** and **Mobile (iOS/Android)**.

By leveraging `isomorphic-git`, it performs Git operations natively inside Obsidian using web technologies. This means it **does not rely on a native Git installation** on your device, making it fully portable and perfect for mobile syncing!

## ✨ Features
- **Complete Sync Loop**: `Stage All -> Commit -> Fetch -> Merge -> Push` in one click.
- **Cross-platform**: Works flawlessly on Desktop and Mobile. It bypasses mobile CORS restrictions by utilizing native HTTP network calls.
- **No Git Installation Required**: Everything runs completely inside Obsidian.
- **Sync Modal UI**: View pending file changes in a tree view with sync status indicators, and check your sync history and last successful sync time.
- **Auto Sync**: Configure a background interval to keep your vault continuously synced without manual clicks.
- **Settings Validation**: The plugin verifies your Git credentials (URL and Token) before attempting to sync to prevent cryptic errors.
- **Safe Conflict Handling**: Instead of aborting on a merge conflict, it automatically keeps your local changes and saves the conflicting remote version as a separate file so no data is lost.

---

## 🚀 Step-by-Step Setup Guide

New to Git or Obsidian syncing? Follow this detailed guide to get your vault synced across all your devices. (We use GitHub in this example, but any HTTP Git provider supporting PATs should work!)

### Step 1: Create a Git Account & Repository
If you don't have a Git account yet, you'll need one to store your vault.
1. Go to [GitHub](https://github.com/) and click **Sign up** to create a free account.
2. Once logged in, click the **+** icon in the top right corner and select **New repository**.
3. Name your repository (e.g., `my-obsidian-vault`).
4. **Important:** Set the repository to **Private** so your notes remain secure.
5. Click **Create repository**.
6. Copy the repository URL (it should look like `https://github.com/your-username/my-obsidian-vault.git`).

### Step 2: Generate a Personal Access Token (PAT)
To allow the plugin to talk to your Git account securely, you need a token.
For GitHub:
1. On GitHub, click your profile picture in the top right and go to **Settings**.
2. Scroll to the bottom of the left sidebar and click **Developer settings**.
3. Click on **Personal access tokens** and select **Tokens (classic)**.
4. Click **Generate new token (classic)**.
5. Give your token a note (e.g., `Obsidian Sync`).
6. Under **Expiration**, select **No expiration** (or another timeline you prefer).
7. Under **Scopes**, check the box next to **`repo`** (Full control of private repositories).
8. Scroll down and click **Generate token**.
9. **Copy the token immediately!** Keep it safe.

### Step 3: Install the Plugin
1. Open Obsidian on your main device (usually your Desktop).
2. Go to **Settings** > **Community plugins**.
3. Turn off **Safe mode** if it's currently on.
4. Click **Browse** and search for `Direct Git Sync` (or install manually).
5. Click **Install**, and then once installed, click **Enable**.

### Step 4: Configure the Plugin
1. In Obsidian, go to **Settings** > **Direct Git Sync**.
2. Paste the **Git Repository URL** you copied from Step 1.
3. Paste the **Personal Access Token (PAT)** you generated in Step 2.
4. Enter your **Author Name** and **Author Email** (used for commit history).
5. (Optional) Set your **Auto Sync Interval** if you want the plugin to sync in the background automatically.
6. (Optional) In the **Advanced** section, specify custom **Files to ignore**. Note: The plugin automatically ignores core workspace files, `.trash/`, and its own `data.json` so you do not need to add these.

### Step 5: Setup on Mobile (Phones/Tablets)
To access your vault on your phone:
1. Download the **Obsidian app** from the App Store (iOS) or Google Play Store (Android).
2. Open the app and create a **new, empty vault**.
3. Install & enable the **Direct Git Sync** plugin just like you did in Step 3.
4. Go to the plugin settings and **paste the exact same Repository URL and PAT** you used on Desktop.
5. Click the **"Sync with GitHub" button** (the refresh icon) on the ribbon menu. 
6. The plugin will fetch all your notes from GitHub and populate your new mobile vault!

---

## 🔄 How to Use

- **Manual Sync**: Click the **"Sync with GitHub" icon** (refresh symbol) in the left/right Ribbon menu.
  - The plugin will verify credentials, save your local changes, pull any new changes, merge them, and push. Watch the status bar for progress!
- **Auto Sync**: If configured, the plugin will periodically sync in the background based on your specified interval.
- **Sync Status Modal**: Trigger the command palette (`Ctrl/Cmd + P`) and search for **"Direct Git Sync: Show pending changes"**. 
  - **Pending changes tab:** Shows a tree view of your vault highlighting files that are synced vs. pending.
  - **History tab:** Shows your last successful sync time and a list of recent Git commits.

---

## ⚠️ Important Notes

* **Conflict Resolution ("Local Wins")**:
  If a merge conflict occurs during the Sync process (i.e., you edited the exact same line in the exact same file on both devices simultaneously), the plugin resolves the conflict automatically keeping your local file. The conflicting file from the server will be downloaded and saved alongside it as a conflict copy so you can manually review it later.
* **Authentication**: Currently only supports Git Personal Access Tokens via HTTP. SSH keys are not supported.
* **Token Storage & Security**: Your Personal Access Token is stored **unencrypted** in the plugin's `data.json` file within your vault's `.obsidian` folder. However, **you do not need to manually ignore `.obsidian/plugins/github-sync/data.json`**. The plugin automatically adds it to the internal `.gitignore` so your credentials are never pushed to your repository.
