import { App, Modal, setIcon } from "obsidian";
import GithubSyncPlugin from "./main";

type SyncStatus = 'synced' | 'pending';

interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    status: SyncStatus;
    children: Record<string, TreeNode>;
}

export class SyncModal extends Modal {
    plugin: GithubSyncPlugin;

    constructor(app: App, plugin: GithubSyncPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("github-sync-modal");

        // Header
        const headerContainer = contentEl.createDiv({ cls: "sync-modal-header" });
        headerContainer.style.display = "flex";
        headerContainer.style.justifyContent = "space-between";
        headerContainer.style.alignItems = "center";
        headerContainer.style.marginBottom = "1rem";
        headerContainer.style.borderBottom = "1px solid var(--background-modifier-border)";
        headerContainer.style.paddingBottom = "0.5rem";
        
        headerContainer.createEl("h2", { text: "Sync Status", cls: "sync-modal-title", attr: { style: "margin: 0;" } });
        
        const syncBtn = headerContainer.createEl("button", { text: "Sync Now", cls: "mod-cta" });
        syncBtn.onclick = async () => {
            this.close();
            await this.plugin.runSync();
        };

        const listContainer = contentEl.createDiv({ cls: "sync-modal-list" });
        listContainer.style.maxHeight = "60vh";
        listContainer.style.overflowY = "auto";
        listContainer.createEl("p", { text: "Loading status..." });

        try {
            const matrix = await this.plugin.gitManager.getStatusMatrix();
            listContainer.empty();
            
            const root: TreeNode = {
                name: "Vault",
                path: "/",
                type: "folder",
                status: "synced",
                children: {}
            };

            let fileCount = 0;

            // Build Tree
            for (const row of matrix) {
                const filepath = row[0];
                const head = row[1];
                const workdir = row[2];
                const stage = row[3];

                if (this.plugin.gitManager.isIgnored(filepath)) continue;

                // unmodified means head===1 && workdir===2 && stage===2
                const isSynced = (head === 1 && workdir === 2 && stage === 2);
                const status: SyncStatus = isSynced ? 'synced' : 'pending';

                this.addNodeToTree(root, filepath, status);
                fileCount++;
            }

            if (fileCount === 0) {
                listContainer.createEl("p", { text: "No files found or Git is not initialized." });
                return;
            }

            // Render Tree
            this.renderTree(listContainer, root, 0);

        } catch (e) {
            listContainer.empty();
            listContainer.createEl("p", { text: "Error loading status: " + (e as Error).message });
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private addNodeToTree(root: TreeNode, filepath: string, status: SyncStatus) {
        const parts = filepath.split('/');
        let current = root;

        if (status === 'pending') {
            root.status = 'pending';
        }

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!part) continue;

            const isFile = i === parts.length - 1;
            const nodePath = parts.slice(0, i + 1).join('/');

            let child = current.children[part];
            if (!child) {
                child = {
                    name: part,
                    path: nodePath,
                    type: isFile ? 'file' : 'folder',
                    status: 'synced', // default, update if needed
                    children: {}
                };
                current.children[part] = child;
            }

            if (status === 'pending') {
                child.status = 'pending';
            }

            current = child;
        }
    }

    private renderTree(container: HTMLElement, node: TreeNode, level: number) {
        // Skip root element rendering, just render children
        if (level === 0) {
            for (const childName of Object.keys(node.children).sort(this.sortNodes(node))) {
                const childNode = node.children[childName];
                if (childNode) {
                    this.renderTree(container, childNode, level + 1);
                }
            }
            return;
        }

        const itemEl = container.createDiv({ 
            cls: "tree-item",
            attr: { style: `margin-left: ${(level - 1) * 20}px; display: flex; align-items: center; padding: 4px 0;` }
        });

        const iconEl = itemEl.createSpan({ attr: { style: "display: flex; align-items: center; justify-content: center; margin-right: 8px; width: 16px; height: 16px;" } });
        
        if (node.status === 'synced') {
            setIcon(iconEl, 'check-circle');
            iconEl.style.color = 'var(--text-success)';
        } else {
            setIcon(iconEl, 'x-circle');
            iconEl.style.color = 'var(--text-error)';
        }

        // Add file/folder icon
        const typeIconEl = itemEl.createSpan({ attr: { style: "display: flex; align-items: center; justify-content: center; margin-right: 6px; width: 16px; height: 16px; opacity: 0.7;" } });
        if (node.type === 'folder') {
            setIcon(typeIconEl, 'folder');
        } else {
            setIcon(typeIconEl, 'file');
        }

        itemEl.createSpan({ text: node.name, cls: "tree-item-inner", attr: { style: "line-height: 1;" } });

        if (node.type === 'folder') {
            const childrenContainer = container.createDiv({ cls: "tree-item-children" });
            for (const childName of Object.keys(node.children).sort(this.sortNodes(node))) {
                const childNode = node.children[childName];
                if (childNode) {
                    this.renderTree(childrenContainer, childNode, level + 1);
                }
            }
        }
    }

    private sortNodes(parent: TreeNode) {
        return (a: string, b: string) => {
            const aNode = parent.children[a];
            const bNode = parent.children[b];
            if (!aNode || !bNode) return 0;
            if (aNode.type !== bNode.type) {
                return aNode.type === 'folder' ? -1 : 1;
            }
            return a.localeCompare(b);
        };
    }
}
