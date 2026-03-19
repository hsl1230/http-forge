/**
 * Ready Handler
 * 
 * Handles the 'ready' message from webview when it's initialized.
 * Sends initial folder data to the webview.
 */

import { ICollectionService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { FolderData } from '../interfaces';

export class ReadyHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['ready'];

    constructor(
        private readonly collectionService: ICollectionService,
        private readonly collectionId: string,
        private readonly folderId: string
    ) {}

    getSupportedCommands(): string[] {
        return ReadyHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, _message: any, messenger: IWebviewMessenger): Promise<boolean> {
        if (command === 'ready') {
            await this.sendInitialData(messenger);
            return true;
        }
        return false;
    }

    /**
     * Send initial folder data to webview
     */
    public async sendInitialData(messenger: IWebviewMessenger): Promise<void> {
        const collection = this.collectionService.getCollection(this.collectionId);
        
        if (!collection) {
            vscode.window.showErrorMessage('Collection not found');
            return;
        }

        // Find the folder in the collection
        const folder = this.findFolderById(collection.items, this.folderId);
        
        if (!folder) {
            vscode.window.showErrorMessage('Folder not found');
            return;
        }

        // Count items in folder
        const stats = this.countItems(folder.items || []);

        const folderData: FolderData = {
            id: folder.id,
            name: folder.name,
            description: folder.description,
            auth: folder.auth,
            scripts: folder.scripts,
            requestCount: stats.requests,
            folderCount: stats.folders
        };

        messenger.postMessage({
            type: 'init',
            folder: folderData,
            collectionName: collection.name
        });
    }

    private findFolderById(items: any[], id: string): any | undefined {
        for (const item of items) {
            if (item.id === id && item.type === 'folder') {
                return item;
            }
            if (item.type === 'folder' && item.items) {
                const found = this.findFolderById(item.items, id);
                if (found) return found;
            }
        }
        return undefined;
    }

    private countItems(items: any[]): { requests: number; folders: number } {
        let requests = 0;
        let folders = 0;
        for (const item of items) {
            if (item.type === 'folder') {
                folders++;
                const sub = this.countItems(item.items || []);
                requests += sub.requests;
                folders += sub.folders;
            } else if (item.type === 'request') {
                requests++;
            }
        }
        return { requests, folders };
    }
}
