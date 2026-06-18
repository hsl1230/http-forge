/**
 * Secret Handler
 *
 * Handles saving and deleting secret variable values via VS Code SecretStorage.
 * Secret values are stored in the OS keychain — they never appear in JSON files
 * or get committed to version control.
 *
 * Key format in SecretStorage: "<envName>:<varName>"
 */

import { IEnvironmentConfigService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { ReadyHandler } from './ready-handler';

export class SecretHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = [
        'saveSecretVariables',
        'deleteSecretVariable',
        'promoteToSecret',
        'demoteFromSecret',
    ];

    constructor(
        private readonly configService: IEnvironmentConfigService,
        private readonly readyHandler: ReadyHandler
    ) {}

    getSupportedCommands(): string[] {
        return SecretHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'saveSecretVariables':
                await this.handleSaveSecretVariables(message.environmentName, message.secrets, messenger);
                return true;
            case 'deleteSecretVariable':
                await this.handleDeleteSecretVariable(message.environmentName, message.key, messenger);
                return true;
            case 'promoteToSecret':
                await this.handlePromoteToSecret(message.environmentName, message.key, message.value, messenger);
                return true;
            case 'demoteFromSecret':
                await this.handleDemoteFromSecret(message.environmentName, message.key, messenger);
                return true;
            default:
                return false;
        }
    }

    /**
     * Save a batch of secret key/value pairs for an environment.
     * Also updates the sharedConfig to list the keys in secretVariables[].
     */
    private async handleSaveSecretVariables(
        envName: string,
        secrets: Record<string, string>,
        messenger: IWebviewMessenger
    ): Promise<void> {
        try {
            for (const [key, value] of Object.entries(secrets)) {
                if (value !== undefined && value !== null) {
                    await this.configService.setSecretVariable(envName, key, value);
                }
            }
            // Reload secret cache so resolution picks up new values immediately
            await this.configService.loadSecretVariables(envName);
            messenger.postMessage({ type: 'saveSuccess', configType: 'secrets' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to save secrets: ${msg}`);
            messenger.postMessage({ type: 'saveError', configType: 'secrets', error: msg });
        }
    }

    /**
     * Delete a single secret variable from SecretStorage.
     */
    private async handleDeleteSecretVariable(
        envName: string,
        key: string,
        messenger: IWebviewMessenger
    ): Promise<void> {
        try {
            await this.configService.deleteSecretVariable(envName, key);

            // Remove the key from secretVariables[] in sharedConfig so it doesn't reappear on reload
            const sharedConfig = this.configService.getSharedConfig();
            if (sharedConfig?.environments[envName]) {
                const env = sharedConfig.environments[envName];
                env.secretVariables = (env.secretVariables ?? []).filter(k => k !== key);
                this.configService.saveSharedConfig(sharedConfig);
            }

            await this.configService.loadSecretVariables(envName);
            messenger.postMessage({ type: 'secretDeleted', environmentName: envName, key });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to delete secret: ${msg}`);
        }
    }

    /**
     * Move a shared variable to SecretStorage:
     *  1. Store its current value in SecretStorage
     *  2. Add the key to secretVariables[] in sharedConfig
     *  3. Remove the value from sharedConfig.variables (keep key reference)
     */
    private async handlePromoteToSecret(
        envName: string,
        key: string,
        value: string,
        messenger: IWebviewMessenger
    ): Promise<void> {
        try {
            await this.configService.setSecretVariable(envName, key, value);

            const sharedConfig = this.configService.getSharedConfig();
            if (sharedConfig?.environments[envName]) {
                const env = sharedConfig.environments[envName];
                // Remove plaintext value
                if (env.variables) {
                    delete env.variables[key];
                }
                // Register as secret (key still tracked, no value in file)
                env.secretVariables = [...new Set([...(env.secretVariables ?? []), key])];
                this.configService.saveSharedConfig(sharedConfig);
            }

            await this.configService.loadSecretVariables(envName);
            await this.readyHandler.sendInitialData(messenger);
            messenger.postMessage({ type: 'saveSuccess', configType: 'promote' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to promote to secret: ${msg}`);
        }
    }

    /**
     * Move a secret variable back to plaintext:
     *  1. Fetch its current value from SecretStorage
     *  2. Remove from SecretStorage
     *  3. Remove from secretVariables[] in sharedConfig
     *  4. Add back to sharedConfig.variables with its plaintext value
     */
    private async handleDemoteFromSecret(
        envName: string,
        key: string,
        messenger: IWebviewMessenger
    ): Promise<void> {
        try {
            const value = await this.configService.getSecretVariable(envName, key);
            await this.configService.deleteSecretVariable(envName, key);

            const sharedConfig = this.configService.getSharedConfig();
            if (sharedConfig?.environments[envName]) {
                const env = sharedConfig.environments[envName];
                env.secretVariables = (env.secretVariables ?? []).filter(k => k !== key);
                if (value !== undefined) {
                    env.variables = { ...(env.variables ?? {}), [key]: value };
                }
                this.configService.saveSharedConfig(sharedConfig);
            }

            await this.configService.loadSecretVariables(envName);
            await this.readyHandler.sendInitialData(messenger);
            messenger.postMessage({ type: 'saveSuccess', configType: 'demote' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to demote secret: ${msg}`);
        }
    }
}
