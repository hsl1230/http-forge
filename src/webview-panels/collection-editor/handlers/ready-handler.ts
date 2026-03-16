/**
 * Ready Handler
 * 
 * Handles the 'ready' message from webview when it's initialized.
 * Sends initial collection data to the webview.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles webview ready state
 */

import { ICollectionService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';

export class ReadyHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['ready'];

    constructor(
        private readonly collectionService: ICollectionService,
        private readonly collectionId: string
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
     * Send initial collection data to webview
     */
    public async sendInitialData(messenger: IWebviewMessenger): Promise<void> {
        const collection = this.collectionService.getCollection(this.collectionId);
        
        if (!collection) {
            console.error('[ReadyHandler] Collection not found:', this.collectionId);
            vscode.window.showErrorMessage('Collection not found');
            return;
        }

        messenger.postMessage({
            type: 'init',
            collection
        });
    }
}
