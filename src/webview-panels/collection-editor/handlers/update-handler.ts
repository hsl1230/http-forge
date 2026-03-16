/**
 * Update Handler
 * 
 * Handles individual property update operations for collections.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles property updates
 */

import { ICollectionService, RequestAuth } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';

export class UpdateHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = [
        'updateName',
        'updateDescription',
        'updateVariables',
        'updateAuth',
        'updateScripts'
    ];

    constructor(
        private readonly collectionService: ICollectionService,
        private readonly collectionId: string,
        private readonly onNameChange?: (name: string) => void
    ) {}

    getSupportedCommands(): string[] {
        return UpdateHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, _messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'updateName':
                await this.handleUpdateName(message.name);
                return true;
            case 'updateDescription':
                await this.handleUpdateDescription(message.description);
                return true;
            case 'updateVariables':
                await this.handleUpdateVariables(message.variables);
                return true;
            case 'updateAuth':
                await this.handleUpdateAuth(message.auth);
                return true;
            case 'updateScripts':
                await this.handleUpdateScripts(message.scripts);
                return true;
            default:
                return false;
        }
    }

    /**
     * Handle name update
     */
    private async handleUpdateName(name: string): Promise<void> {
        try {
            const collection = this.collectionService.getCollection(this.collectionId);
            if (!collection) throw new Error('Collection not found');

            collection.name = name;
            this.collectionService.saveCollection(collection);
            
            if (this.onNameChange) {
                this.onNameChange(name);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to update name: ${message}`);
        }
    }

    /**
     * Handle description update
     */
    private async handleUpdateDescription(description: string): Promise<void> {
        try {
            const collection = this.collectionService.getCollection(this.collectionId);
            if (!collection) throw new Error('Collection not found');

            collection.description = description;
            this.collectionService.saveCollection(collection);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to update description: ${message}`);
        }
    }

    /**
     * Handle variables update
     */
    private async handleUpdateVariables(variables: Record<string, string>): Promise<void> {
        try {
            const collection = this.collectionService.getCollection(this.collectionId);
            if (!collection) throw new Error('Collection not found');

            collection.variables = variables;
            this.collectionService.saveCollection(collection);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to update variables: ${message}`);
        }
    }

    /**
     * Handle auth update
     */
    private async handleUpdateAuth(auth: RequestAuth): Promise<void> {
        try {
            const collection = this.collectionService.getCollection(this.collectionId);
            if (!collection) throw new Error('Collection not found');

            collection.auth = auth;
            this.collectionService.saveCollection(collection);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to update auth: ${message}`);
        }
    }

    /**
     * Handle scripts update
     */
    private async handleUpdateScripts(scripts: { preRequest?: string; postResponse?: string }): Promise<void> {
        try {
            const collection = this.collectionService.getCollection(this.collectionId);
            if (!collection) throw new Error('Collection not found');

            collection.scripts = scripts;
            this.collectionService.saveCollection(collection);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to update scripts: ${message}`);
        }
    }
}
