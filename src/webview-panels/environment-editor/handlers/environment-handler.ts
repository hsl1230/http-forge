/**
 * Environment Handler
 * 
 * Handles environment CRUD operations (add, delete, duplicate).
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles environment management operations
 * - Open/Closed: Can be extended without modification
 * - Dependency Inversion: Depends on IWebviewMessenger abstraction
 */

import { IEnvironmentConfigService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';
import { ReadyHandler } from './ready-handler';

/**
 * Handler for environment CRUD operations
 */
export class EnvironmentCrudHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['addEnvironment', 'deleteEnvironment', 'duplicateEnvironment'];

    constructor(
        private readonly configService: IEnvironmentConfigService,
        private readonly readyHandler: ReadyHandler
    ) {}

    getSupportedCommands(): string[] {
        return EnvironmentCrudHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'addEnvironment':
                await this.handleAddEnvironment(message.environmentName, messenger);
                return true;
            case 'deleteEnvironment':
                await this.handleDeleteEnvironment(message.environmentName, messenger);
                return true;
            case 'duplicateEnvironment':
                await this.handleDuplicateEnvironment(message.environmentName, messenger);
                return true;
            default:
                return false;
        }
    }

    /**
     * Handle adding a new environment
     */
    private async handleAddEnvironment(environmentName: string, messenger: IWebviewMessenger): Promise<void> {
        const sharedConfig = this.configService.getSharedConfig();
        if (!sharedConfig) {
            vscode.window.showErrorMessage('No shared configuration found');
            return;
        }

        if (sharedConfig.environments[environmentName]) {
            vscode.window.showErrorMessage(`Environment "${environmentName}" already exists`);
            return;
        }

        sharedConfig.environments[environmentName] = {
            variables: {}
        };

        this.configService.saveSharedConfig(sharedConfig);
        await this.readyHandler.sendInitialData(messenger);
    }

    /**
     * Handle deleting an environment
     */
    private async handleDeleteEnvironment(environmentName: string, messenger: IWebviewMessenger): Promise<void> {
        const sharedConfig = this.configService.getSharedConfig();
        if (!sharedConfig) {
            vscode.window.showErrorMessage('No shared configuration found');
            return;
        }

        if (!sharedConfig.environments[environmentName]) {
            vscode.window.showErrorMessage(`Environment "${environmentName}" not found`);
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Delete environment "${environmentName}"?`,
            { modal: true },
            'Delete'
        );

        if (confirm === 'Delete') {
            delete sharedConfig.environments[environmentName];
            this.configService.saveSharedConfig(sharedConfig);
            await this.readyHandler.sendInitialData(messenger);
        }
    }

    /**
     * Handle duplicating an environment
     */
    private async handleDuplicateEnvironment(environmentName: string, messenger: IWebviewMessenger): Promise<void> {
        const sharedConfig = this.configService.getSharedConfig();
        if (!sharedConfig) {
            vscode.window.showErrorMessage('No shared configuration found');
            return;
        }

        const env = sharedConfig.environments[environmentName];
        if (!env) {
            vscode.window.showErrorMessage(`Environment "${environmentName}" not found`);
            return;
        }

        const newName = await vscode.window.showInputBox({
            prompt: 'Enter name for the new environment',
            value: `${environmentName}-copy`,
            validateInput: (value) => {
                if (!value) return 'Name is required';
                if (sharedConfig.environments[value]) {
                    return 'An environment with this name already exists';
                }
                return null;
            }
        });

        if (newName) {
            sharedConfig.environments[newName] = JSON.parse(JSON.stringify(env));
            this.configService.saveSharedConfig(sharedConfig);
            await this.readyHandler.sendInitialData(messenger);
        }
    }
}
