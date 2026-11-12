/**
 * Environment Overrides Handler
 *
 * Single Responsibility: manage script-set session overrides ("Current Values"
 * from `pm.environment.set()`) — per-variable revert and full reset to file
 * values. File editing stays in ConfigHandler; this handler never writes files.
 */

import * as vscode from 'vscode';
import { IEnvironmentConfigService } from '@http-forge/core';
import { COMMAND_IDS } from '../../../../../shared/constants';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { ReadyHandler } from './ready-handler';

/**
 * Handler for session-override operations
 */
export class EnvironmentOverridesHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['revertEnvironmentVariable', 'resetEnvironmentOverrides', 'clearRuntimeVariables', 'saveRuntimeVariables'];

    constructor(
        private readonly configService: IEnvironmentConfigService,
        private readonly readyHandler: ReadyHandler
    ) {}

    getSupportedCommands(): string[] {
        return EnvironmentOverridesHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'revertEnvironmentVariable':
                await this.handleRevertVariable(message.environmentName, message.key, messenger);
                return true;
            case 'resetEnvironmentOverrides':
                await this.handleResetOverrides(message.environmentName, messenger);
                return true;
            case 'clearRuntimeVariables':
                await vscode.commands.executeCommand(COMMAND_IDS.clearRuntimeVariables, { confirm: false });
                await this.readyHandler.sendInitialData(messenger);
                return true;
            case 'saveRuntimeVariables':
                await this.handleSaveRuntimeVariables(message, messenger);
                return true;
            default:
                return false;
        }
    }

    /**
     * Drop one session override so the file value shines through again.
     */
    private async handleRevertVariable(environmentName: string, key: string, messenger: IWebviewMessenger): Promise<void> {
        if (!environmentName || !key) {
            return;
        }
        this.configService.deleteEnvironmentVariable(key, environmentName);
        await this.readyHandler.sendInitialData(messenger);
    }

    /**
     * Drop all session overrides for one environment (Postman's "Reset All").
     */
    private async handleResetOverrides(environmentName: string, messenger: IWebviewMessenger): Promise<void> {
        await this.configService.resetEnvironmentOverrides(environmentName);
        await this.readyHandler.sendInitialData(messenger);
    }

    /**
     * Persist runtime values edited in the Environment Editor.
     * Environment values are stored as workspace Current Values; global values
     * are session-only.
     */
    private async handleSaveRuntimeVariables(message: any, messenger: IWebviewMessenger): Promise<void> {
        const values = (message?.values || {}) as Record<string, string>;
        if (message?.scope === 'environment') {
            const envName = message.environmentName;
            this.configService.clearEnvironmentVariables(envName);
            for (const [key, value] of Object.entries(values)) {
                if (key.trim() && value !== '') {
                    this.configService.setEnvironmentVariable(key, value, envName);
                }
            }
        } else if (message?.scope === 'global') {
            this.configService.clearGlobalVariables();
            for (const [key, value] of Object.entries(values)) {
                if (key.trim() && value !== '') {
                    this.configService.setGlobalVariable(key, value);
                }
            }
        }
        await this.readyHandler.sendInitialData(messenger);
    }
}
