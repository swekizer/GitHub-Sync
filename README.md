# Obsidian GitHub Sync

This plugin allows you to seamlessly sync your Obsidian vault with a private GitHub repository across both **Desktop** and **Mobile (iOS/Android)**.

By leveraging `isomorphic-git`, it performs Git operations natively inside Obsidian using web technologies. This means it **does not rely on a native Git installation** on your device, making it fully portable and perfect for mobile syncing!

## ✨ Features
- **Complete Sync loop in one click**: `Stage All -> Commit -> Fetch -> Merge -> Push`.
- **Cross-platform**: Works flawlessly on Desktop and Mobile. It bypasses mobile CORS restrictions by utilizing native HTTP network calls.
- **No Git installation required**: Everything runs inside Obsidian.

---

## 🚀 Step-by-Step Setup Guide

New to GitHub or Obsidian syncing? Follow this detailed guide to get your vault synced across all your devices.

### Step 1: Create a GitHub Account & Repository
If you don't have a GitHub account yet, you'll need one to store your vault.
1. Go to [GitHub](https://github.com/) and click **Sign up** to create a free account.
2. Once logged in, click the **+** icon in the top right corner and select **New repository**.
3. Name your repository (e.g., `my-obsidian-vault`).
4. **Important:** Set the repository to **Private** so your notes remain secure.
5. Click **Create repository**.
6. Copy the repository URL (it should look like `https://github.com/your-username/my-obsidian-vault.git`). You will need this later!

### Step 2: Generate a Personal Access Token (PAT)
To allow the plugin to talk to your GitHub account securely, you need a token.
1. On GitHub, click your profile picture in the top right and go to **Settings**.
2. Scroll to the bottom of the left sidebar and click **Developer settings**.
3. Click on **Personal access tokens** and select **Tokens (classic)**.
4. Click **Generate new token (classic)**.
5. Give your token a note (e.g., `Obsidian Sync`).
6. Under **Expiration**, select **No expiration** (or another timeline you prefer, but you'll have to update it when it expires).
7. Under **Scopes**, check the box next to **`repo`** (Full control of private repositories).
8. Scroll down and click **Generate token**.
9. **Copy the token immediately!** You won't be able to see it again once you leave the page. Keep it somewhere safe.

### Step 3: Install the Plugin
1. Open Obsidian on your main device (usually your Desktop).
2. Go to **Settings** (gear icon) > **Community plugins**.
3. Turn off **Safe mode** if it's currently on.
4. Click **Browse** and search for `GitHub Sync` (or install manually if not yet in the community directory).
5. Click **Install**, and then once installed, click **Enable**.

### Step 4: Configure the Plugin
1. In Obsidian, go to **Settings** > **GitHub Sync** (under Community Plugins).
2. Paste the **GitHub Repository URL** you copied from Step 1.
3. Paste the **Personal Access Token (PAT)** you generated in Step 2.
4. Enter your **Author Name** and **Author Email** (this will be used for your commit history on GitHub).

### Step 5: Setup on Mobile (Phones/Tablets)
To access your vault on your phone:
1. Download the **Obsidian app** from the App Store (iOS) or Google Play Store (Android).
2. Open the app and create a **new, empty vault**.
3. Go to **Settings** (gear icon) > **Community plugins**, turn off **Safe mode**, and install & enable the **GitHub Sync** plugin just like you did in Step 3.
4. Go to the plugin settings and **paste the exact same Repository URL and PAT** you used on Desktop. Fill in your author details as well.
5. Click the **"Sync with GitHub" button** (the refresh icon) on the ribbon menu. 
6. Watch the toast notifications. The plugin will fetch all your notes from GitHub and populate your new mobile vault!

---

## 🔄 How to Use
Whenever you finish taking notes or want to pull updates from another device:
- Click the **"Sync with GitHub" icon** (refresh symbol) in the left/right Ribbon menu.
- The plugin will automatically save your local changes, pull any new changes from GitHub, merge them, and push your latest notes to the cloud.
- Watch the toast notifications in Obsidian to see the progress.

---

## ⚠️ Important Limitations
* **Conflict Resolution ("Local Wins")**:
  If a merge conflict occurs during the Sync process (i.e., you edited the exact same line in the exact same file on both your phone and computer without syncing in between), this plugin currently aborts the automated merge to prevent data loss or weird conflict markers in your files. If you get a merge conflict error, you will need to resolve the conflict manually outside of this plugin for now. Future updates will bring built-in conflict resolution.
* **Authentication**: Currently only supports GitHub Personal Access Tokens via HTTP. SSH keys are not supported.
