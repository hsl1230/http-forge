import { ICollectionService, IEnvironmentConfigService } from '@http-forge/core';
import * as vscode from 'vscode';
import {
    applyEnvSuggestions,
    scanCollectionForEnvVars,
} from '../../../../../infrastructure/ai-env-suggester';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

export type { EnvSuggestion } from '../../../../../infrastructure/ai-env-suggester';

/**
 * Handles collection-wide "Suggest Env Variables" feature for the Collection Editor panel.
 *
 * Commands:
 *   scanCollectionForEnv  – AI scans the whole collection and returns hardcoded value suggestions
 *   applyEnvSuggestions   – replaces hardcoded values with {{varName}} across all requests
 *                           and adds the variables to the active environment
 */
export class SuggestEnvHandler implements IMessageHandler {
    constructor(
        private readonly collectionId: string,
        private readonly envConfigService: IEnvironmentConfigService,
        private readonly collectionService: ICollectionService
    ) {}

    getSupportedCommands(): string[] {
        return ['scanCollectionForEnv', 'applyEnvSuggestions'];
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'scanCollectionForEnv': await this.handleScan(messenger);           return true;
            case 'applyEnvSuggestions':  await this.handleApply(message, messenger); return true;
            default:                     return false;
        }
    }

    private async handleScan(messenger: IWebviewMessenger): Promise<void> {
        try {
            const { suggestions, collectionName } = await scanCollectionForEnvVars(
                this.collectionId,
                this.collectionService
            );
            messenger.postMessage({ type: 'envScanResult', suggestions, collectionName });
        } catch (err: any) {
            messenger.postMessage({ type: 'envScanResult', error: err?.message ?? 'Scan failed.' });
        }
    }

    private async handleApply(
        message: { selected: Array<{ value: string; varName: string }> },
        messenger: IWebviewMessenger
    ): Promise<void> {
        try {
            const { replacedCount, addedVars, envName } = await applyEnvSuggestions(
                this.collectionId,
                message.selected ?? [],
                this.collectionService,
                this.envConfigService
            );
            vscode.window.showInformationMessage(
                `✅ Added ${addedVars} variable${addedVars !== 1 ? 's' : ''} to "${envName}" ` +
                `and replaced ${replacedCount} occurrence${replacedCount !== 1 ? 's' : ''} in the collection.`
            );
            messenger.postMessage({ type: 'envApplyResult', success: true, addedVars, replacedCount });
        } catch (err: any) {
            messenger.postMessage({ type: 'envApplyResult', error: err?.message ?? 'Apply failed.' });
        }
    }
}
