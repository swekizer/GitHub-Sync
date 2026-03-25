import git from 'isomorphic-git';
import { obsidianHttpClient as http } from './httpClient';
import { ObsidianFS } from './fs';

export class GitManager {
    fs: ObsidianFS;
    dir: string;
    configDir: string;
    author: { name: string; email: string };

    constructor(fs: ObsidianFS, configDir: string) {
        this.fs = fs;
        this.configDir = configDir;
        this.dir = '/'; // Vault root
        this.author = { name: 'Obsidian User', email: 'user@example.com' };
    }

    isIgnored(filepath: string): boolean {
        const ignoredPaths = [
            `${this.configDir}/workspace.json`,
            `${this.configDir}/workspace-mobile.json`,
            `${this.configDir}/workspace-cache/`,
            '.trash/',
        ];

        return ignoredPaths.some(pattern =>
            pattern.endsWith('/')
                ? filepath.startsWith(pattern) || filepath === pattern.slice(0, -1)
                : filepath === pattern
        );
    }

    setAuthor(name: string, email: string) {
        if (name) this.author.name = name;
        if (email) this.author.email = email;
    }

    async isInitialized() {
        try {
            await git.log({ fs: this.fs, dir: this.dir, depth: 1 });
            return true;
        } catch {
            return false;
        }
    }

    async getRemoteInfo(url: string, token: string) {
        return await git.getRemoteInfo({
            http,
            url,
            onAuth: () => ({ username: token })
        });
    }

    async initOrClone(url: string, token: string) {
        if (await this.isInitialized()) return;
        
        await git.init({ fs: this.fs, dir: this.dir });
        await git.addRemote({ fs: this.fs, dir: this.dir, remote: 'origin', url });

        // If the remote already has history, fetch it and use it as our starting point.
        // This avoids "unrelated histories" issues when merging later.
        // Local-only files stay in the working directory and get staged by stageAll().
        try {
            const result = await git.fetch({
                fs: this.fs,
                http,
                dir: this.dir,
                url,
                remote: 'origin',
                onAuth: () => ({ username: token }),
                singleBranch: true
            });

            if (result.fetchHead) {
                // Determine the branch name from the remote
                const branch = result.defaultBranch
                    ? result.defaultBranch.replace('refs/heads/', '')
                    : 'main';

                // Point our local branch at the remote's latest commit
                await git.writeRef({
                    fs: this.fs,
                    dir: this.dir,
                    ref: `refs/heads/${branch}`,
                    value: result.fetchHead,
                    force: true
                });

                // Checkout to sync the index with HEAD.
                // force: true ensures remote files are written even if locals conflict.
                // Local-only files (not in remote) remain untouched in the working dir.
                await git.checkout({
                    fs: this.fs,
                    dir: this.dir,
                    ref: branch,
                    force: true
                });
            }
        } catch (e) {
            // Remote is empty or unreachable — that's fine.
            // The first push will create the remote history.
            console.debug('Initial fetch during setup skipped:', (e as Error).message);
        }
    }

    async stageAll() {
        const matrix = await git.statusMatrix({ fs: this.fs, dir: this.dir });
        for (const row of matrix) {
            const filepath = row[0];
            const workdirStatus = row[2];

            if (this.isIgnored(filepath)) continue;

            if (workdirStatus === 0) {
                await git.remove({ fs: this.fs, dir: this.dir, filepath });
            } else if (workdirStatus === 2) {
                await git.add({ fs: this.fs, dir: this.dir, filepath });
            }
        }
    }

    async commit(message: string) {
        await git.commit({
            fs: this.fs,
            dir: this.dir,
            author: this.author,
            message
        });
    }

    async fetch(url: string, token: string) {
        const result = await git.fetch({
            fs: this.fs,
            http,
            dir: this.dir,
            url,
            remote: 'origin',
            onAuth: () => ({ username: token }),
            singleBranch: true
        });
        return result.fetchHead;
    }

    async merge(theirs: string | null) {
        if (!theirs) return; // Remote had no commits or branches yet
        try {
            const branch = await git.currentBranch({ fs: this.fs, dir: this.dir, fullname: false }) || 'main';
            await git.merge({
                fs: this.fs,
                dir: this.dir,
                ours: branch,
                theirs: theirs,
                abortOnConflict: true,
                author: this.author
            });
        } catch (e: unknown) {
            if (e instanceof Error && (e.name === 'MergeNotSupportedError' || e.name === 'MergeConflictError')) {
                throw new Error("Merge conflict detected! The same file was edited on both devices. Please resolve the conflict manually and sync again.");
            }
            throw e;
        }
    }

    async push(url: string, token: string) {
        await git.push({
            fs: this.fs,
            http,
            dir: this.dir,
            remote: 'origin',
            onAuth: () => ({ username: token })
        });
    }
}
