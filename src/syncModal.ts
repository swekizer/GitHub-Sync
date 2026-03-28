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
        const headerContainer = contentEl.createDiv({ 
            cls: "sync-modal-header",
            attr: { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;" }
        });
        
        headerContainer.createEl("h2", { text: "Git sync status", cls: "sync-modal-title", attr: { style: "margin: 0;" } });
        
        const syncBtn = headerContainer.createEl("button", { text: "Sync now", cls: "mod-cta" });
        syncBtn.onclick = async () => {
            this.close();
            await this.plugin.runSync();
        };

        // Tabs
        const tabBar = contentEl.createDiv({ 
            cls: "sync-modal-tabs",
            attr: { style: "display: flex; gap: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--background-modifier-border);" }
        });

        const pendingTabBtn = tabBar.createEl("div", { text: "Pending changes" });
        const historyTabBtn = tabBar.createEl("div", { text: "History" });

        const styleTabBtn = (btn: HTMLElement, isActive: boolean) => {
            btn.setCssStyles({
                padding: "0.5rem 1rem",
                cursor: "pointer",
                fontWeight: isActive ? "bold" : "normal",
                borderBottom: isActive ? "2px solid var(--interactive-accent)" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "all 0.2s ease"
            });
        };

        const tabContent = contentEl.createDiv({ 
            cls: "sync-modal-content",
            attr: { style: "max-height: 60vh; overflow-y: auto; padding-right: 10px;" }
        });

        const switchTab = async (tab: "pending" | "history") => {
            styleTabBtn(pendingTabBtn, tab === "pending");
            styleTabBtn(historyTabBtn, tab === "history");
            tabContent.empty();
            if (tab === "pending") {
                await this.renderPendingTab(tabContent);
            } else {
                await this.renderHistoryTab(tabContent);
            }
        };

        pendingTabBtn.onclick = async () => await switchTab("pending");
        historyTabBtn.onclick = async () => await switchTab("history");

        // Default to pending
        await switchTab("pending");
    }

    private async renderPendingTab(container: HTMLElement) {
        container.createEl("p", { text: "Loading status..." });

        try {
            const matrix = await this.plugin.gitManager.getStatusMatrix();
            container.empty();
            
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
                container.createEl("p", { text: "No files found or Git is not initialized." });
                return;
            }

            // Render Tree
            this.renderTree(container, root, 0);

        } catch (e) {
            container.empty();
            container.createEl("p", { text: "Error loading status: " + (e as Error).message });
        }
    }

    private async renderHistoryTab(container: HTMLElement) {
        // Render Last Sync Time
        const lastSyncTime = this.plugin.settings.lastSyncTime;
        const syncStatusDiv = container.createDiv({ attr: { style: "padding: 1rem; background-color: var(--background-secondary); border-radius: 8px; margin-bottom: 1rem;" } });
        
        const timeText = lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Never";
        syncStatusDiv.createEl("h4", { text: "Last successful sync", attr: { style: "margin-top: 0; margin-bottom: 0.5rem;" } });
        syncStatusDiv.createEl("p", { text: timeText, attr: { style: "margin: 0; color: var(--text-muted);" } });

        container.createEl("h3", { text: "Recent sync activity", attr: { style: "margin-bottom: 1rem;" } });
        container.createEl("p", { text: "Loading history..." });

        try {
            const history = await this.plugin.gitManager.getHistory(20);
            container.lastElementChild?.remove(); // remove loading text

            if (history.length === 0) {
                container.createEl("p", { text: "No sync history found." });
                return;
            }

            const listEl = container.createEl("ul", { attr: { style: "list-style-type: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;" } });
            
            for (const commit of history) {
                const li = listEl.createEl("li", { attr: { style: "padding: 10px; border: 1px solid var(--background-modifier-border); border-radius: 6px; background-color: var(--background-primary);" } });
                
                const headerObj = li.createDiv({ attr: { style: "display: flex; justify-content: space-between; margin-bottom: 4px;" } });
                
                const dateText = new Date(commit.commit.author.timestamp * 1000).toLocaleString();
                headerObj.createSpan({ text: dateText, attr: { style: "font-weight: 500; font-size: 0.9em;" } });
                
                const hash = commit.oid.substring(0, 7);
                headerObj.createSpan({ text: hash, attr: { style: "font-family: var(--font-monospace); font-size: 0.8em; color: var(--text-muted);" } });

                li.createEl("div", { text: commit.commit.message, attr: { style: "font-size: 0.9em; color: var(--text-normal); white-space: pre-wrap;" } });
            }

        } catch (e) {
            container.lastElementChild?.remove();
            container.createEl("p", { text: "Error loading history: " + (e as Error).message });
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
            iconEl.setCssStyles({ color: 'var(--text-success)' });
        } else {
            setIcon(iconEl, 'x-circle');
            iconEl.setCssStyles({ color: 'var(--text-error)' });
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
