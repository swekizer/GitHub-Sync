import { DataAdapter, Stat } from "obsidian";

class ENOENTError extends Error {
    code = 'ENOENT';
    constructor(path: string) {
        super(`ENOENT: no such file or directory, stat '${path}'`);
    }
}

class ENOTDIRError extends Error {
    code = 'ENOTDIR';
    constructor(path: string) {
        super(`ENOTDIR: not a directory, scandir '${path}'`);
    }
}

class EISDIRError extends Error {
    code = 'EISDIR';
    constructor(path: string) {
        super(`EISDIR: illegal operation on a directory, read '${path}'`);
    }
}

class NodeStat {
    type: 'file' | 'folder';
    ctimeMs: number;
    mtimeMs: number;
    size: number;

    constructor(stat: Stat) {
        this.type = stat.type;
        this.ctimeMs = stat.ctime;
        this.mtimeMs = stat.mtime;
        this.size = stat.size;
    }

    isFile() {
        return this.type === 'file';
    }

    isDirectory() {
        return this.type === 'folder';
    }

    isSymbolicLink() {
        return false;
    }
}

// normalizes path by removing leading slash as Obsidian expects
function normalize(path: string) {
    let normalized = path.replace(/\\/g, '/');
    if (normalized.startsWith('/')) {
        normalized = normalized.substring(1);
    }
    return normalized;
}

export class ObsidianFS {
    adapter: DataAdapter;

    constructor(adapter: DataAdapter) {
        this.adapter = adapter;
    }

    get promises() {
        return this;
    }

    async readFile(path: string, options?: { encoding?: string } | string) {
        const normalized = normalize(path);
        const encoding = typeof options === 'string' ? options : options?.encoding;
        
        const stat = await this.adapter.stat(normalized);
        if (!stat) throw new ENOENTError(normalized);
        if (stat.type === 'folder') throw new EISDIRError(normalized);

        if (encoding === 'utf8') {
            return await this.adapter.read(normalized);
        } else {
            const buffer = await this.adapter.readBinary(normalized);
            return new Uint8Array(buffer);
        }
    }

    async writeFile(path: string, data: Uint8Array | string, options?: any) {
        const normalized = normalize(path);
        
        // Ensure parent directories exist
        const parts = normalized.split('/');
        parts.pop(); // remove filename
        let currentPath = '';
        for (const part of parts) {
            currentPath = currentPath === '' ? part : currentPath + '/' + part;
            const stat = await this.adapter.stat(currentPath);
            if (!stat) {
                await this.adapter.mkdir(currentPath);
            }
        }

        if (typeof data === 'string') {
            await this.adapter.write(normalized, data);
        } else {
            // Must slice the buffer in case it's a view of a larger shared buffer
            const exactBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            await this.adapter.writeBinary(normalized, exactBuffer as ArrayBuffer);
        }
    }

    async unlink(path: string) {
        const normalized = normalize(path);
        const stat = await this.adapter.stat(normalized);
        if (!stat) throw new ENOENTError(normalized);
        await this.adapter.remove(normalized);
    }

    async readdir(path: string) {
        const normalized = normalize(path);
        const stat = await this.adapter.stat(normalized);
        if (!stat) throw new ENOENTError(normalized);
        if (stat.type !== 'folder') throw new ENOTDIRError(normalized);

        const list = await this.adapter.list(normalized);
        // list returns { files: ['dir/file1'], folders: ['dir/folder1'] }
        // we need to return just the basenames
        const basenames: string[] = [];
        
        for (const f of list.files) {
            basenames.push(f.replace(/\\/g, '/').split('/').pop()!);
        }
        for (const d of list.folders) {
            basenames.push(d.replace(/\\/g, '/').split('/').pop()!);
        }
        return basenames;
    }

    async mkdir(path: string) {
        const normalized = normalize(path);
        const stat = await this.adapter.stat(normalized);
        if (!stat) {
            await this.adapter.mkdir(normalized);
        }
    }

    async rmdir(path: string) {
        const normalized = normalize(path);
        const stat = await this.adapter.stat(normalized);
        if (!stat) throw new ENOENTError(normalized);
        await this.adapter.rmdir(normalized, false);
    }

    async stat(path: string) {
        const normalized = normalize(path);
        // isomorphic-git root directory hack
        if (normalized === '') {
            return new NodeStat({ type: 'folder', ctime: 0, mtime: 0, size: 0 });
        }
        const stat = await this.adapter.stat(normalized);
        if (!stat) throw new ENOENTError(normalized);
        return new NodeStat(stat);
    }

    async lstat(path: string) {
        return this.stat(path);
    }

    async symlink(target: string, path: string) {
        throw new Error('Symlinks are not supported in ObsidianFS');
    }

    async readlink(path: string) {
        throw new Error('Symlinks are not supported in ObsidianFS');
    }
}
