import git from 'isomorphic-git';
import { obsidianHttpClient as http } from './httpClient';
import { ObsidianFS } from './fs';

export class GitManager {
    fs: ObsidianFS;
    dir: string;
    author: { name: string; email: string };
    
    constructor(fs: ObsidianFS) {
        this.fs = fs;
        this.dir = '/'; // Vault root
        this.author = { name: 'Obsidian User', email: 'user@example.com' };
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
        
        // Use clone for simplicity on empty vaults
        // Because clone implies the repo is empty. If the vault is NOT empty,
        // clone will fail if the directory is not empty.
        // If it's a non-empty vault, we should `init`, `add remote`, `fetch` and `checkout` but it could overwrite files.
        // For simplicity, we'll try to init and add remote.
        await git.init({ fs: this.fs, dir: this.dir });
        await git.addRemote({ fs: this.fs, dir: this.dir, remote: 'origin', url });
    }

    async stageAll() {
        const matrix = await git.statusMatrix({ fs: this.fs, dir: this.dir });
        for (const row of matrix) {
            const filepath = row[0];
            const workdirStatus = row[2];
            
            // we don't commit .obsidian workspace files usually, but let's just commit everything for now
            // or we could filter out `.obsidian/workspace` strings

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
                abortOnConflict: false,
                author: this.author
            });
        } catch (e: unknown) {
            if (e instanceof Error && e.name === 'MergeNotSupportedError') {
                throw new Error("Conflict detected during the auto-merge. For now, please resolve manually!");
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
