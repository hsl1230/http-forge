/**
 * Save Handler
 * 
 * Handles full folder save operations.
 */

import { ICollectionService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';
import { FolderUpdate } from '../interfaces';

export class SaveHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['save'];

    constructor(
        private readonly collectionService: ICollectionService,
        private readonly collectionId: string,
        private readonly folderId: string,
        private readonly onNameChange?: (name: string) => void
    ) {}

    getSupportedCommands(): string[] {
        return SaveHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        if (command === 'save') {
            await this.handleSave(message.folder, messenger);
            return true;
        }
        return false;
    }

    /**
     * Handle full folder save
     */
    private async handleSave(folderData: FolderUpdate, messenger: IWebviewMessenger): Promise<void> {
        try {
            const collection = this.collectionService.getCollection(this.collectionId);
            if (!collection) {
                console.error('[FolderSaveHandler] Collection not found:', this.collectionId);
                throw new Error('Collection not found');
            }

            // Find and update the folder
            const folder = this.findFolderById(collection.items, this.folderId);
            if (!folder) {
                console.error('[FolderSaveHandler] Folder not found:', this.folderId);
                throw new Error('Folder not found');
            }

            // Update folder properties
            if (folderData.name !== undefined) folder.name = folderData.name;
            if (folderData.description !== undefined) folder.description = folderData.description;
            if (folderData.auth !== undefined) folder.auth = folderData.auth;
            if (folderData.scripts !== undefined) folder.scripts = folderData.scripts;

            await this.collectionService.saveCollection(collection);

            // Notify panel of name change
            if (folderData.name && this.onNameChange) {
                this.onNameChange(folderData.name);
            }

            // Refresh tree view
            vscode.commands.executeCommand('httpForge.refreshCollections');

            messenger.postMessage({ type: 'saveSuccess' });
            vscode.window.showInformationMessage('Folder saved successfully');
        } catch (error) {
            console.error('[FolderSaveHandler] Save failed:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to save folder: ${message}`);
            messenger.postMessage({ type: 'saveError', error: message });
        }
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
}
