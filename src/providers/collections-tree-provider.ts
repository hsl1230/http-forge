import { CollectionFolderItem, CollectionItem, CollectionRequestItem, CollectionService } from '@http-forge/core';
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../shared/constants';
import { ensureRequestDefaults, RequestContext } from '../shared/utils';

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
 * MIME type for drag and drop
 */
const COLLECTION_ITEM_MIME_TYPE = 'application/vnd.code.tree.httpForge.collections';

/**
 * Data transferred during drag
 */
interface DragData {
    collectionId: string;
    itemId: string;
    itemType: 'collection' | 'folder' | 'request';
}

/**
 * Drag and Drop Controller for Collections Tree
 * 
 * Drop behavior:
 * - Drop on request (no modifier): Insert BEFORE
 * - Drop on request + Shift: Insert AFTER
 * - Drop on folder (no modifier): Move INTO folder
 * - Drop on folder + Ctrl: Insert BEFORE folder
 * - Drop on folder + Shift: Insert AFTER folder
 */
class CollectionsDragAndDropController implements vscode.TreeDragAndDropController<CollectionTreeItem> {
    readonly dragMimeTypes = [COLLECTION_ITEM_MIME_TYPE];
    readonly dropMimeTypes = [COLLECTION_ITEM_MIME_TYPE];

    constructor(
        private collectionService: CollectionService,
        private refreshCallback: () => void
    ) {}

    handleDrag(
        source: readonly CollectionTreeItem[],
        dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken
    ): void {
        // Only allow dragging single items (not collections themselves)
        if (source.length !== 1) {
            return;
        }

        const item = source[0];
        
        // Don't allow dragging collections
        if (item.itemType === 'collection') {
            return;
        }

        const dragData: DragData = {
            collectionId: item.collectionId,
            itemId: item.requestId || item.folderId || '',
            itemType: item.itemType
        };

        dataTransfer.set(COLLECTION_ITEM_MIME_TYPE, new vscode.DataTransferItem(JSON.stringify(dragData)));
    }

    async handleDrop(
        target: CollectionTreeItem | undefined,
        dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken
    ): Promise<void> {
        const transferItem = dataTransfer.get(COLLECTION_ITEM_MIME_TYPE);
        if (!transferItem) {
            return;
        }

        const dragData: DragData = JSON.parse(transferItem.value);

        if (!target) {
            return;
        }

        // Check same collection
        if (dragData.collectionId !== target.collectionId) {
            vscode.window.showWarningMessage('Cannot move items between collections');
            return;
        }

        // Prevent dropping on self
        const targetId = target.requestId || target.folderId;
        if (targetId === dragData.itemId) {
            return;
        }

        // Simplified drop behavior:
        // - Drop on folder: Move INTO the folder
        // - Drop on request: Insert BEFORE the request
        if (target.itemType === 'folder') {
            // Move into folder
            await this.moveIntoFolder(dragData, targetId || '');
        } else {
            // Insert before request
            await this.insertAtPosition(dragData, target, false);
        }
    }

    private async moveIntoFolder(dragData: DragData, folderId: string): Promise<void> {
        const moved = await this.collectionService.moveItem(
            dragData.collectionId,
            dragData.itemId,
            folderId
        );
        
        if (moved) {
            this.refreshCallback();
        } else {
            vscode.window.showErrorMessage('Failed to move item');
        }
    }

    private async insertAtPosition(dragData: DragData, target: CollectionTreeItem, insertAfter: boolean): Promise<void> {
        const collection = this.collectionService.getCollection(dragData.collectionId);
        if (!collection) return;

        const targetId = target.requestId || target.folderId || '';
        
        // Find the parent that contains the target
        const { parent, items } = this.findParentContaining(collection, targetId);
        
        if (!items) return;

        // Get current order
        const orderedIds = items.map((item: any) => item.id);
        
        // Find positions
        const sourceIndex = orderedIds.indexOf(dragData.itemId);
        const targetIndex = orderedIds.indexOf(targetId);
        
        if (targetIndex === -1) return;

        // Check if source is in the same parent
        const sourceInSameParent = sourceIndex !== -1;
        
        if (sourceInSameParent) {
            // Reorder within same parent
            orderedIds.splice(sourceIndex, 1);
            
            // Recalculate target index after removal
            let newTargetIndex = orderedIds.indexOf(targetId);
            if (insertAfter) {
                newTargetIndex++;
            }
            
            orderedIds.splice(newTargetIndex, 0, dragData.itemId);
            
            await this.collectionService.reorderItems(
                dragData.collectionId,
                parent?.id,
                orderedIds
            );
        } else {
            // Moving from different parent - first move, then reorder
            const parentId = parent?.id;
            const moved = await this.collectionService.moveItem(
                dragData.collectionId,
                dragData.itemId,
                parentId
            );
            
            if (moved) {
                // Now reorder
                const updatedCollection = this.collectionService.getCollection(dragData.collectionId);
                if (updatedCollection) {
                    const { items: newItems } = this.findParentContaining(updatedCollection, targetId);
                    if (newItems) {
                        const newOrderedIds = newItems.map((item: any) => item.id);
                        const newSourceIndex = newOrderedIds.indexOf(dragData.itemId);
                        let newTargetIndex = newOrderedIds.indexOf(targetId);
                        
                        if (newSourceIndex !== -1 && newTargetIndex !== -1) {
                            newOrderedIds.splice(newSourceIndex, 1);
                            newTargetIndex = newOrderedIds.indexOf(targetId);
                            if (insertAfter) {
                                newTargetIndex++;
                            }
                            newOrderedIds.splice(newTargetIndex, 0, dragData.itemId);
                            
                            await this.collectionService.reorderItems(
                                dragData.collectionId,
                                parentId,
                                newOrderedIds
                            );
                        }
                    }
                }
            }
        }
        
        this.refreshCallback();
    }

    private findParentContaining(collection: any, itemId: string): { parent: any | undefined; items: any[] | undefined } {
        // Check root level
        if (collection.items.some((item: any) => item.id === itemId)) {
            return { parent: undefined, items: collection.items };
        }
        
        // Search in folders
        return this.findParentInItems(collection.items, itemId);
    }

    private findParentInItems(items: any[], itemId: string): { parent: any | undefined; items: any[] | undefined } {
        for (const item of items) {
            if (item.type === 'folder' && item.items) {
                if (item.items.some((child: any) => child.id === itemId)) {
                    return { parent: item, items: item.items };
                }
                const result = this.findParentInItems(item.items, itemId);
                if (result.items) {
                    return result;
                }
            }
        }
        return { parent: undefined, items: undefined };
    }

    private findItemById(items: any[], id: string): any {
        for (const item of items) {
            if (item.id === id) {
                return item;
            }
            if (item.items) {
                const found = this.findItemById(item.items, id);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
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
