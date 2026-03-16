/**
 * File Handler
 * 
 * Handles opening configuration files in the editor.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles file open operations
 * - Open/Closed: Can be extended without modification
 * - Dependency Inversion: Depends on IWebviewMessenger abstraction
 */

import { IEnvironmentConfigService } from '@http-forge/core';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';

/**
 * Handler for opening config files
 */
export class FileHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['openConfigFile'];

    constructor(
        private readonly configService: IEnvironmentConfigService
    ) {}

    getSupportedCommands(): string[] {
        return FileHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, _messenger: IWebviewMessenger): Promise<boolean> {
        if (command === 'openConfigFile') {
            await this.handleOpenConfigFile(message.fileType, message.environmentName);
            return true;
        }
        return false;
    }

    /**
     * Handle opening a config file in the editor
     */
    private async handleOpenConfigFile(fileType: 'shared' | 'local' | 'env' | 'envLocal', environmentName?: string): Promise<void> {
        let configPath: string;

        if (fileType === 'env' && environmentName) {
            // Get path to specific environment shared config file (dev.json)
            configPath = this.configService.getEnvironmentConfigPath(environmentName);
        } else if (fileType === 'envLocal' && environmentName) {
            // Get path to specific environment local config file (dev.local.json)
            configPath = this.configService.getEnvLocalPath(environmentName);
            // Create file if it doesn't exist
            if (!fs.existsSync(configPath)) {
                fs.writeFileSync(configPath, JSON.stringify({ variables: {} }, null, 2));
            }
        } else if (fileType === 'shared') {
            configPath = this.configService.getSharedConfigPath();
        } else {
            configPath = this.configService.getLocalConfigPath();
        }

        if (fs.existsSync(configPath)) {
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
        } else {
            vscode.window.showErrorMessage(`Config file not found: ${configPath}`);
        }
    }
}
