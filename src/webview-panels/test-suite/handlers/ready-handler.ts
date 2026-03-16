/**
 * Ready Handler for Test Suite
 * 
 * Handles the 'ready' message from webview when it's initialized.
 * Sends initial data (suite, environments) to the webview.
 */

import { IEnvironmentConfigService, ITestSuiteStore, TestSuite, TestSuiteService } from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';

/**
 * Handler for webview ready message
 */
export class ReadyHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['ready', 'getAvailableRequests'];

    private pendingSuite: TestSuite | undefined;

    constructor(
        private readonly environmentConfigService: IEnvironmentConfigService | undefined,
        private readonly suiteStore: ITestSuiteStore,
        private readonly testSuiteService: TestSuiteService
    ) {}

    getSupportedCommands(): string[] {
        return ReadyHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, _message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'ready':
                await this.sendInitialData(messenger);
                return true;
            case 'getAvailableRequests':
                await this.sendAvailableRequests(messenger);
                return true;
            default:
                return false;
        }
    }

    /**
     * Set a suite to be sent when webview is ready
     */
    public setPendingSuite(suite: TestSuite): void {
        this.pendingSuite = suite;
        this.suiteStore.setSuite(suite);
    }

    /**
     * Send initial data to webview
     */
    public async sendInitialData(messenger: IWebviewMessenger): Promise<void> {

        // Load environments
        const environments = await this.loadEnvironments();

        // Get suite data
        const suite = this.pendingSuite || this.suiteStore.getSuite();

        if (suite) {
            // Resolve requests with full data
            const requests = this.suiteStore.getResolvedRequests();
            
            messenger.postMessage({
                type: 'setSuite',
                suite,
                requests
            });
        }
        
        // Send environments
        messenger.postMessage({
            type: 'setEnvironments',
            environments
        });
    }

    /**
     * Send available requests for Add Request modal
     */
    private async sendAvailableRequests(messenger: IWebviewMessenger): Promise<void> {
        const requests = this.testSuiteService.getAllAvailableRequests();
        messenger.postMessage({
            type: 'setAvailableRequests',
            requests
        });
    }

    /**
     * Load environments from EnvironmentConfigService
     */
    private async loadEnvironments(): Promise<Array<{ id: string; name: string; active: boolean }>> {
        if (!this.environmentConfigService) {
            return [];
        }

        try {
            const envNames = this.environmentConfigService.getEnvironmentNames();
            const selectedEnv = this.environmentConfigService.getSelectedEnvironment();

            return envNames.map(name => ({
                id: name,
                name: name,
                active: name === selectedEnv
            }));
        } catch (error) {
            console.error('[TestSuite.ReadyHandler] Failed to load environments:', error);
            return [];
        }
    }
}
