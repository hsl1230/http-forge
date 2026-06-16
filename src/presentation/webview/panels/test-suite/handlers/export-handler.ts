/**
 * Export Handler
 *
 * Handles exporting test suite run reports.
 * HTML reports are opened directly from the pre-generated file produced by
 * ResultStorageService.finalizeRun() -- the same rich report the MCP server uses.
 * JSON/statistics exports use a save-dialog to write to a user-chosen location.
 */

import * as fs from 'fs';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

export type ExportFormat = 'json' | 'html' | 'statistics';

interface ExportData {
    suite?: any;
    results?: any[];
    statistics?: any;
}

export class ExportHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['exportReport'];

    getSupportedCommands(): string[] {
        return ExportHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, _messenger: IWebviewMessenger): Promise<boolean> {
        if (command === 'exportReport') {
            await this.exportReport(message.format, message.reportPath, message.data || message.content);
            return true;
        }
        return false;
    }

    private async exportReport(
        format: ExportFormat,
        reportPath: string | null | undefined,
        data: ExportData | string | undefined
    ): Promise<void> {
        if (format === 'html') {
            if (!reportPath) {
                vscode.window.showWarningMessage(
                    'No HTML report available. Run the test suite first to generate a report.'
                );
                return;
            }
            // Open the pre-generated rich HTML report in the system browser
            await vscode.env.openExternal(vscode.Uri.file(reportPath));
            return;
        }

        // JSON / statistics -- save-dialog export
        let content: string;
        let extension: string;

        if (typeof data === 'string') {
            content = data;
            extension = format;
        } else {
            switch (format) {
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    extension = 'json';
                    break;
                case 'statistics':
                    content = JSON.stringify((data as ExportData).statistics, null, 2);
                    extension = 'json';
                    break;
                default:
                    content = JSON.stringify(data, null, 2);
                    extension = 'json';
            }
        }

        const defaultFileName = 'test-suite-run-' + Date.now() + '.' + extension;
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultFileName),
            filters: { 'JSON Files': ['json'] }
        });

        if (saveUri) {
            await fs.promises.writeFile(saveUri.fsPath, content, 'utf8');
            vscode.window.showInformationMessage('Report saved to ' + saveUri.fsPath);
        }
    }
}
