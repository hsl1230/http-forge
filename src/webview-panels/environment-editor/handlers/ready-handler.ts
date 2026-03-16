/**
 * Ready Handler
 * 
 * Handles the 'ready' message from webview when it's initialized.
 * Sends initial configuration data to the webview.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles webview ready state
 * - Dependency Inversion: Depends on abstractions
 */

import { IEnvironmentConfigService } from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';

/**
 * Handler for webview ready message
 */
export class ReadyHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['ready'];

    private selectedEnvironment?: string;

    constructor(
        private readonly configService: IEnvironmentConfigService
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
     * Set the selected environment to highlight in UI
     */
    public setSelectedEnvironment(environment?: string): void {
        this.selectedEnvironment = environment;
    }

    /**
     * Get the selected environment
     */
    public getSelectedEnvironment(): string | undefined {
        return this.selectedEnvironment;
    }

    /**
     * Send initial configuration data to webview
     */
    public async sendInitialData(messenger: IWebviewMessenger, selectedEnvironment?: string): Promise<void> {
        const envToUse = selectedEnvironment ?? this.selectedEnvironment;
        const sharedConfig = this.configService.getSharedConfig();
        const localConfig = this.configService.getLocalConfig();

        messenger.postMessage({
            type: 'init',
            data: {
                sharedConfig,
                localConfig,
                hasLocalConfig: localConfig !== null,
                selectedEnvironment: envToUse
            }
        });
    }
}
