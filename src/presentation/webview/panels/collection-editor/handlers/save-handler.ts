/**
 * Save Handler
 * 
 * Handles full collection save operations.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles save operations
 */

import { ICollectionService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { CollectionUpdate } from '../interfaces';

export class SaveHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['save'];

    constructor(
        private readonly collectionService: ICollectionService,
        private readonly collectionId: string,
        private readonly onNameChange?: (name: string) => void
    ) {}

    getSupportedCommands(): string[] {
        return SaveHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        if (command === 'save') {
            await this.handleSave(message.collection, messenger);
            return true;
        }
        return false;
    }

    /**
     * Handle full collection save
     */
    private async handleSave(collectionData: CollectionUpdate, messenger: IWebviewMessenger): Promise<void> {
        try {
            const collection = this.collectionService.getCollection(this.collectionId);
            if (!collection) {
                console.error('[SaveHandler] Collection not found:', this.collectionId);
                throw new Error('Collection not found');
            }

            // Update collection properties
            if (collectionData.name !== undefined) collection.name = collectionData.name;
            if (collectionData.description !== undefined) collection.description = collectionData.description;
            if (collectionData.variables !== undefined) collection.variables = collectionData.variables;
            if (collectionData.auth !== undefined) collection.auth = collectionData.auth;
            if (collectionData.scripts !== undefined) collection.scripts = collectionData.scripts;

            await this.collectionService.saveCollection(collection);

            // Notify panel of name change
            if (collectionData.name && this.onNameChange) {
                this.onNameChange(collectionData.name);
            }

            messenger.postMessage({ type: 'saveSuccess' });
            vscode.window.showInformationMessage('Collection saved successfully');
        } catch (error) {
            console.error('[SaveHandler] Save failed:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to save collection: ${message}`);
            messenger.postMessage({ type: 'saveError', error: message });
        }
    }
}
