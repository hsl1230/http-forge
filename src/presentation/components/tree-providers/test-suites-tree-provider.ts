/**
 * Test Suites Tree Provider
 *
 * Provides a hierarchical tree view for Test Suites in the HTTP Forge sidebar.
 * Suites can be organized in nested folders (derived from their on-disk location).
 */

import { TestSuite, TestSuiteService } from '@http-forge/core';
import * as vscode from 'vscode';

/**
 * Tree item representing a Test Suite folder
 */
export class TestSuiteFolderTreeItem extends vscode.TreeItem {
    constructor(
        public readonly folderPath: string,
        public readonly folderName: string,
        public readonly collectionId?: string
    ) {
        super(folderName, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'testSuiteFolder';
        this.iconPath = new vscode.ThemeIcon('folder');
        this.tooltip = folderPath;
    }
}

/**
 * Tree item representing a Test Suite
 */
export class TestSuiteTreeItem extends vscode.TreeItem {
    constructor(
        public readonly suite: TestSuite,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(suite.name, collapsibleState);

        this.contextValue = 'testSuite';
        this.tooltip = this.getTooltip();
        this.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.blue'));

        // Single-click opens the suite
        this.command = {
            command: 'httpForge.openTestSuite',
            title: 'Open Test Suite',
            arguments: [suite]
        };

        // Show request count in description
        this.description = `${this.getRequestCount()} requests`;
    }

    private getRequestCount(): number {
        return Array.isArray((this.suite as any).nodes)
            ? (this.suite as any).nodes.filter((n: any) => n.type === 'request').length
            : (Array.isArray((this.suite as any).requests) ? (this.suite as any).requests.length : 0);
    }

    private getTooltip(): string {
        const lines = [this.suite.name];
        if (this.suite.description) {
            lines.push(this.suite.description);
        }
        lines.push(`${this.getRequestCount()} requests`);
        lines.push(`Iterations: ${this.suite.config?.iterations ?? 1}`);
        return lines.join('\n');
    }
}

type TestSuiteNode = TestSuiteTreeItem | TestSuiteFolderTreeItem;

/**
 * Tree Data Provider for Test Suites
 */
export class TestSuitesTreeProvider implements vscode.TreeDataProvider<TestSuiteNode>, vscode.TreeDragAndDropController<TestSuiteNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TestSuiteNode | undefined | null | void> =
        new vscode.EventEmitter<TestSuiteNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TestSuiteNode | undefined | null | void> =
        this._onDidChangeTreeData.event;

    readonly dragMimeTypes = ['application/vnd.code.tree.httpforge.testsuites'];
    readonly dropMimeTypes = ['application/vnd.code.tree.httpforge.testsuites'];

    private _refreshDebounce?: NodeJS.Timeout;

    constructor(private testSuiteService: TestSuiteService) {}

    refresh(debounceMs = 80): void {
        if (this._refreshDebounce) clearTimeout(this._refreshDebounce);
        this._refreshDebounce = setTimeout(() => {
            this._refreshDebounce = undefined;
            this._onDidChangeTreeData.fire();
        }, debounceMs);
    }

    refreshImmediate(): void {
        if (this._refreshDebounce) {
            clearTimeout(this._refreshDebounce);
            this._refreshDebounce = undefined;
        }
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TestSuiteNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TestSuiteNode): Promise<TestSuiteNode[]> {
        try {
            const suites = await this.testSuiteService.getAllSuites();
            const visibleSuites = suites.filter(s => !s.isTemporary);

            if (!element) {
                // Root level — group by top-level folder
                return this.buildLevel(visibleSuites, '');
            }

            if (element instanceof TestSuiteFolderTreeItem) {
                return this.buildLevel(visibleSuites, element.folderPath);
            }

            return [];
        } catch (error) {
            console.error('[TestSuitesTreeProvider] Error in getChildren:', error);
            return [];
        }
    }

    private buildLevel(suites: TestSuite[], parentPath: string): TestSuiteNode[] {
        const prefix = parentPath ? `${parentPath}/` : '';
        const folders = new Set<string>();
        const directSuites: TestSuite[] = [];

        for (const suite of suites) {
            const suitePath = suite.folderPath || '';
            if (suitePath === parentPath) {
                directSuites.push(suite);
            } else if (suitePath.startsWith(prefix)) {
                const rest = suitePath.slice(prefix.length);
                const firstSegment = rest.split('/')[0];
                if (firstSegment) {
                    folders.add(firstSegment);
                }
            }
        }

        // Include empty folders from disk
        try {
            const allFolders = this.testSuiteService.getAllFolders();
            for (const fp of allFolders) {
                if (parentPath === '') {
                    // Root level: top-level folders
                    if (!fp.includes('/')) {
                        folders.add(fp);
                    }
                } else if (fp.startsWith(prefix)) {
                    const rest = fp.slice(prefix.length);
                    const firstSegment = rest.split('/')[0];
                    if (firstSegment && rest === firstSegment) {
                        // Direct child folder (no deeper nesting at this level)
                        folders.add(firstSegment);
                    } else if (firstSegment) {
                        folders.add(firstSegment);
                    }
                }
            }
        } catch {
            // ignore
        }

        const folderItems = Array.from(folders).sort().map(folderName => {
            const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
            return new TestSuiteFolderTreeItem(folderPath, folderName);
        });

        const suiteItems = directSuites
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(suite => new TestSuiteTreeItem(suite));

        return [...folderItems, ...suiteItems];
    }

    getParent(element: TestSuiteNode): TestSuiteNode | undefined {
        if (element instanceof TestSuiteFolderTreeItem) {
            const parts = element.folderPath.split('/');
            if (parts.length <= 1) return undefined;
            const parentPath = parts.slice(0, -1).join('/');
            const parentName = parts[parts.length - 2];
            return new TestSuiteFolderTreeItem(parentPath, parentName);
        }

        if (element instanceof TestSuiteTreeItem) {
            const suite = element.suite;
            const folderPath = suite.folderPath || '';
            if (!folderPath) return undefined;
            const parts = folderPath.split('/');
            const parentPath = parts.slice(0, -1).join('/');
            const parentName = parts[parts.length - 1];
            return new TestSuiteFolderTreeItem(folderPath, parentName);
        }

        return undefined;
    }

    handleDrag(
        source: readonly TestSuiteNode[],
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): void {
        // Store both suite IDs and folder paths
        const suiteIds = source
            .filter((s): s is TestSuiteTreeItem => s instanceof TestSuiteTreeItem)
            .map(s => s.suite.id);
        const folderPaths = source
            .filter((s): s is TestSuiteFolderTreeItem => s instanceof TestSuiteFolderTreeItem)
            .map(s => s.folderPath);
        const payload = { suiteIds, folderPaths };
        dataTransfer.set('application/vnd.code.tree.httpforge.testsuites', new vscode.DataTransferItem(payload));
    }

    async handleDrop(
        target: TestSuiteNode | undefined,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): Promise<void> {
        const item = dataTransfer.get('application/vnd.code.tree.httpforge.testsuites');
        if (!item) return;
        const payload = item.value as { suiteIds: string[]; folderPaths: string[] };
        if (!payload) return;

        // Determine target folder path
        let targetFolder = '';
        if (target instanceof TestSuiteFolderTreeItem) {
            targetFolder = target.folderPath;
        } else if (target instanceof TestSuiteTreeItem) {
            targetFolder = target.suite.folderPath || '';
        }

        // Move folders first
        if (payload.folderPaths && payload.folderPaths.length > 0) {
            for (const folderPath of payload.folderPaths) {
                // Don't move a folder into itself or its own subfolder
                if (targetFolder === folderPath || targetFolder.startsWith(`${folderPath}/`)) continue;
                // Don't move to the same location
                const parentPath = folderPath.split('/').slice(0, -1).join('/');
                if (targetFolder === parentPath) continue;
                const folderName = folderPath.split('/').pop() || folderPath;
                const newPath = targetFolder ? `${targetFolder}/${folderName}` : folderName;
                try {
                    await this.testSuiteService.moveFolder(folderPath, newPath);
                } catch (e) {
                    console.error('[DragDrop] Failed to move folder:', e);
                }
            }
        }

        // Move suites
        if (payload.suiteIds && payload.suiteIds.length > 0) {
            for (const id of payload.suiteIds) {
                const suite = await this.testSuiteService.getSuite(id);
                if (!suite) continue;
                suite.folderPath = targetFolder || undefined;
                await this.testSuiteService.updateSuite(suite);
            }
        }

        this.refreshImmediate();
    }
}
