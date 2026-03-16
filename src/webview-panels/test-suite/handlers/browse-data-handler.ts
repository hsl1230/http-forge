/**
 * Browse Data Handler
 * 
 * Handles file browsing for data files (JSON/CSV) used in parameterized runs.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles data file browsing
 * - Open/Closed: Can be extended without modification
 * - Dependency Inversion: Depends on IWebviewMessenger abstraction
 */

import * as fs from 'fs';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';

/**
 * Handler for browsing and loading data files
 */
export class BrowseDataHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['browseDataFile'];

    getSupportedCommands(): string[] {
        return BrowseDataHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, _message: any, messenger: IWebviewMessenger): Promise<boolean> {
        if (command === 'browseDataFile') {
            await this.browseDataFile(messenger);
            return true;
        }
        return false;
    }

    /**
     * Open file dialog to browse for data file
     */
    private async browseDataFile(messenger: IWebviewMessenger): Promise<void> {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            filters: {
                'Data Files': ['json', 'csv'],
                'JSON Files': ['json'],
                'CSV Files': ['csv'],
                'All Files': ['*']
            },
            title: 'Select Data File'
        };

        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            const filePath = fileUri[0].fsPath;
            
            try {
                const content = await fs.promises.readFile(filePath, 'utf8');
                
                messenger.postMessage({
                    type: 'setDataFile',
                    filePath,
                    content
                });
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to read data file: ${error.message}`);
            }
        }
    }
}
