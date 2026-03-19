/**
 * Config Handler
 * 
 * Handles saving shared and local configuration files.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles config save operations
 * - Open/Closed: Can be extended without modification
 * - Dependency Inversion: Depends on IWebviewMessenger abstraction
 */

import { IEnvironmentConfigService, LocalConfig, SharedConfig } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

/**
 * Handler for configuration save operations
 */
export class ConfigHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['saveSharedConfig', 'saveLocalConfig'];

    constructor(
        private readonly configService: IEnvironmentConfigService
    ) {}

    getSupportedCommands(): string[] {
        return ConfigHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'saveSharedConfig':
                await this.handleSaveSharedConfig(message.config, messenger);
                return true;
            case 'saveLocalConfig':
                await this.handleSaveLocalConfig(message.config, messenger);
                return true;
            default:
                return false;
        }
    }

    /**
     * Handle saving shared configuration
     */
    private async handleSaveSharedConfig(config: SharedConfig, messenger: IWebviewMessenger): Promise<void> {
        try {
            this.configService.saveSharedConfig(config);
            vscode.window.showInformationMessage('Shared environment configuration saved');
            messenger.postMessage({ type: 'saveSuccess', configType: 'shared' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to save shared config: ${message}`);
            messenger.postMessage({ type: 'saveError', configType: 'shared', error: message });
        }
    }

    /**
     * Handle saving local configuration
     */
    private async handleSaveLocalConfig(config: LocalConfig, messenger: IWebviewMessenger): Promise<void> {
        try {
            this.configService.saveLocalConfig(config);
            vscode.window.showInformationMessage('Local environment configuration saved');
            messenger.postMessage({ type: 'saveSuccess', configType: 'local' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to save local config: ${message}`);
            messenger.postMessage({ type: 'saveError', configType: 'local', error: message });
        }
    }
}
