/**
 * Save Handler for Test Suite
 * 
 * Handles saving test suites (both new and existing)
 */

import { type ITestSuiteStore, TestSuiteService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

/**
 * Handler for save operations
 */
export class SaveHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = [
        'saveSuite', 
        'addRequests',
        'removeRequest', 
        'reorderRequests',
        'updateConfig'
    ];

    constructor(
        private readonly testSuiteService: TestSuiteService,
        private readonly suiteStore: ITestSuiteStore
    ) {}

    getSupportedCommands(): string[] {
        return SaveHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'saveSuite':
                await this.handleSaveSuite(message, messenger);
                return true;
            case 'addRequests':
                await this.handleAddRequests(message, messenger);
                return true;
            case 'removeRequest':
                await this.handleRemoveRequest(message, messenger);
                return true;
            case 'reorderRequests':
                await this.handleReorderRequests(message, messenger);
                return true;
            case 'updateConfig':
                await this.handleUpdateConfig(message, messenger);
                return true;
            default:
                return false;
        }
    }

    /**
     * Save suite (new or existing)
     */
    private async handleSaveSuite(
        message: { suite?: any; name?: string },
        messenger: IWebviewMessenger
    ): Promise<void> {
        // If suite is provided in message, update the store first
        if (message.suite) {
            this.suiteStore.setSuite(message.suite);
        }
        
        const suite = this.suiteStore.getSuite();
        if (!suite) {
            vscode.window.showErrorMessage('No suite to save');
            return;
        }

        try {
            let savedSuite;
            
            if (suite.isTemporary) {
                // Temporary suite - need a name
                const name = message.name || suite.name || await vscode.window.showInputBox({
                    prompt: 'Enter name for the test suite',
                    value: suite.name,
                    placeHolder: 'Test Suite Name'
                });

                if (!name) {
                    return; // User cancelled
                }

                savedSuite = await this.testSuiteService.saveTempSuite(suite, name);
            } else {
                // Existing suite - just update
                await this.testSuiteService.updateSuite(suite);
                savedSuite = suite;
            }

            // Update store with saved suite
            this.suiteStore.setSuite(savedSuite);

            messenger.postMessage({
                type: 'suiteSaved',
                suite: savedSuite
            });

            messenger.postMessage({
                type: 'consoleLog',
                level: 'info',
                message: `Suite "${savedSuite.name}" saved successfully`
            });

            vscode.window.showInformationMessage(`Test Suite "${savedSuite.name}" saved`);

            // Refresh the test suites tree view
            vscode.commands.executeCommand('httpForge.refreshTestSuites');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to save suite: ${error.message}`);
        }
    }

    /**
     * Add multiple requests to the suite (batch operation)
     */
    private async handleAddRequests(
        message: { requests: any[] },
        messenger: IWebviewMessenger
    ): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite || !message.requests?.length) {
            return;
        }

        // Add all requests in one batch
        for (const request of message.requests) {
            this.suiteStore.addRequest(request);
        }

        // Send updated suite to webview once
        messenger.postMessage({
            type: 'suiteData',
            suite: this.suiteStore.getSuite(),
            environments: [],
            selectedEnvironment: ''
        });
    }

    /**
     * Remove a request from the suite
     */
    private async handleRemoveRequest(
        message: { requestKey: string },
        messenger: IWebviewMessenger
    ): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) {
            return;
        }

        // requestKey format: "collectionId:requestId"
        const [_, requestId] = message.requestKey.split(':');
        this.suiteStore.removeRequest(requestId);

        // Send updated suite to webview
        messenger.postMessage({
            type: 'suiteData',
            suite: this.suiteStore.getSuite(),
            environments: [],
            selectedEnvironment: ''
        });
    }

    /**
     * Reorder requests in the suite
     */
    private async handleReorderRequests(
        message: { orderedKeys: string[] },
        messenger: IWebviewMessenger
    ): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) {
            return;
        }

        this.suiteStore.reorderRequests(message.orderedKeys);
    }

    /**
     * Update suite configuration
     */
    private async handleUpdateConfig(
        message: { config: any },
        messenger: IWebviewMessenger
    ): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) {
            return;
        }

        // Merge config updates
        suite.config = { ...suite.config, ...message.config };
    }
}
