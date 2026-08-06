import { CollectionFolderItem, CollectionItem, CollectionRequestItem, CollectionService } from '@http-forge/core';
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../../../shared/constants';
import { ensureRequestDefaults, RequestContext } from '../../../shared/utils';
import { CollectionsDragAndDropController, COLLECTION_ITEM_MIME_TYPE } from './collections-drag-drop-controller';

/**
 * Tree item representing a collection, folder, or request
 */
export class CollectionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'collection' | 'folder' | 'request',
        public readonly collectionId: string,
        public readonly itemPath: string[] = [],
        public readonly requestData?: CollectionItem,
        public readonly folderId?: string,   // ID of the folder (for folder items)
        public readonly requestId?: string   // ID of the request (for request items)
    ) {
        super(label, collapsibleState);
        
        this.contextValue = itemType;
        this.tooltip = this.getTooltip();
        this.iconPath = this.getIcon();
        
        // Consistent behavior: all tree items (collection, folder, request) open in edit mode on click
        if (itemType === 'collection') {
            this.command = {
                command: COMMAND_IDS.editCollection,
                title: 'Edit Collection',
                arguments: [this]
            };
        } else if (itemType === 'folder' && requestData) {
            // Folder items: open folder editor (treat as editable entity)
            this.command = {
                command: COMMAND_IDS.editCollection,
                title: 'Edit Folder',
                arguments: [this]
            };
        } else if (itemType === 'request' && requestData) {
            this.description = (requestData as CollectionRequestItem).method;
            // Request items: always open in edit mode (Request Tester panel)
            const requestContext: RequestContext = {
                title: requestData.name || 'HTTP Request',
                collectionId,
                folderPath: itemPath.join('/'),
                requestId: requestData.id,
                request: ensureRequestDefaults(requestData),
                readonly: false
            };
            this.command = {
                command: COMMAND_IDS.openRequest,
                title: 'Edit Request',
                arguments: [requestContext]
            };
        }
    }

    private getTooltip(): string {
        if (this.itemType === 'request' && this.requestData) {
            const requestData = this.requestData as CollectionRequestItem;
            return `${requestData.method} ${requestData.url || ''}`;
        }
        return this.label;
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.itemType) {
            case 'collection':
                return new vscode.ThemeIcon('archive');
            case 'folder':
                return new vscode.ThemeIcon('folder');
            case 'request':
                return this.getMethodIcon();
        }
    }

    private getMethodIcon(): vscode.ThemeIcon {
        const requestData = this.requestData as CollectionRequestItem;
        const method = requestData?.method?.toUpperCase() || 'GET';
        switch (method) {
            case 'GET':
                return new vscode.ThemeIcon('arrow-down', new vscode.ThemeColor('charts.green'));
            case 'POST':
                return new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('charts.yellow'));
            case 'PUT':
                return new vscode.ThemeIcon('arrow-swap', new vscode.ThemeColor('charts.orange'));
            case 'PATCH':
                return new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.purple'));
            case 'DELETE':
                return new vscode.ThemeIcon('trash', new vscode.ThemeColor('charts.red'));
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}

/**
 * Tree Data Provider for Collections
 */
export class CollectionsTreeProvider implements vscode.TreeDataProvider<CollectionTreeItem>, vscode.TreeDragAndDropController<CollectionTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CollectionTreeItem | undefined | null | void> = new vscode.EventEmitter<CollectionTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CollectionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    // Drag and Drop support
    readonly dragMimeTypes = [COLLECTION_ITEM_MIME_TYPE];
    readonly dropMimeTypes = [COLLECTION_ITEM_MIME_TYPE];
    private dragDropController: CollectionsDragAndDropController;

    constructor(private collectionService: CollectionService) {
        this.dragDropController = new CollectionsDragAndDropController(
            collectionService,
            () => this.refresh()
        );
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    // Delegate drag and drop to controller
    handleDrag(
        source: readonly CollectionTreeItem[],
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): void {
        this.dragDropController.handleDrag(source, dataTransfer, token);
    }

    async handleDrop(
        target: CollectionTreeItem | undefined,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): Promise<void> {
        await this.dragDropController.handleDrop(target, dataTransfer, token);
    }

    getTreeItem(element: CollectionTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CollectionTreeItem): Promise<CollectionTreeItem[]> {
        try {
            if (!element) {
                // Root level - return all collections
                return this.getCollections();
            }

            if (element.itemType === 'collection') {
                // Return collection root items
                return this.getCollectionItems(element.collectionId, []);
            }

            if (element.itemType === 'folder') {
                // Return folder items
                return this.getCollectionItems(element.collectionId, element.itemPath);
            }

            return [];
        } catch (error) {
            console.error('[CollectionsTreeProvider] Error in getChildren:', error);
            return [];
        }
    }

    getParent(element: CollectionTreeItem): CollectionTreeItem | undefined {
        if (element.itemType === 'collection') {
            // Collections are at root level, no parent
            return undefined;
        }

        const collection = this.collectionService.getCollection(element.collectionId);
        if (!collection) {
            return undefined;
        }

        // For requests: itemPath is the parent folder path (does NOT include request name)
        // For folders: itemPath includes the folder itself, so parent path is itemPath.slice(0, -1)
        let parentFolderPath: string[];
        
        if (element.itemType === 'request') {
            // Request's itemPath is already the parent folder path
            parentFolderPath = element.itemPath;
        } else {
            // Folder's itemPath includes itself, so slice off the last element
            parentFolderPath = element.itemPath.slice(0, -1);
        }

        if (parentFolderPath.length === 0) {
            // Parent is the collection itself
            return new CollectionTreeItem(
                collection.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                'collection',
                element.collectionId
            );
        }

        // Navigate to find the parent folder
        let items = collection.items || [];
        for (let i = 0; i < parentFolderPath.length - 1; i++) {
            const folder = items.find(item => item.name === parentFolderPath[i] && item.type === 'folder') as CollectionFolderItem || undefined;
            if (folder && folder.items) {
                items = folder.items;
            } else {
                return undefined;
            }
        }

        // Find the actual parent folder
        const parentFolderName = parentFolderPath[parentFolderPath.length - 1];
        const parentFolder = items.find(item => item.name === parentFolderName && item.type === 'folder');
        if (parentFolder) {
            return new CollectionTreeItem(
                parentFolder.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                'folder',
                element.collectionId,
                parentFolderPath,  // Path to this folder (includes folder name)
                undefined,
                parentFolder.id,
                undefined
            );
        }

        return undefined;
    }

    private async getCollections(): Promise<CollectionTreeItem[]> {
        const collections = this.collectionService.getAllCollections();
        return collections.map(collection => new CollectionTreeItem(
            collection.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            'collection',
            collection.id
        ));
    }

    private async getCollectionItems(collectionId: string, parentPath: string[]): Promise<CollectionTreeItem[]> {
        const collection = this.collectionService.getCollection(collectionId);
        if (!collection) {
            return [];
        }

        // Navigate to the parent path
        let items = collection.items || [];
        for (const pathPart of parentPath) {
            const folder = items.find(item => item.name === pathPart && item.type === 'folder') as CollectionFolderItem || undefined;
            if (folder && folder.items) {
                items = folder.items;
            } else {
                return [];
            }
        }

        return items.map(item => {
            if (item.type === 'folder') {
                const folderPath = [...parentPath, item.name];
                return new CollectionTreeItem(
                    item.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'folder',
                    collectionId,
                    folderPath,
                    undefined,  // requestData
                    item.id,    // folderId
                    undefined   // requestId
                );
            } else {
                return new CollectionTreeItem(
                    item.name,
                    vscode.TreeItemCollapsibleState.None,
                    'request',
                    collectionId,
                    parentPath,
                    item,       // requestData
                    undefined,  // folderId
                    item.id     // requestId
                );
            }
        });
    }
}
