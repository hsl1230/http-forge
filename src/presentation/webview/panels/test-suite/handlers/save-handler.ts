/**
 * Save Handler for Test Suite
 * 
 * Handles saving test suites (both new and existing)
 */

import { type IConfigService, type ITestSuiteStore, TestSuiteService } from '@http-forge/core';
import * as path from 'path';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

function normalizeIncomingSuite(existing: any, incoming: any): any {
    const merged = {
        ...(existing || {}),
        ...(incoming || {})
    } as any;

    // Backward compatibility: if the webview sends legacy requests only,
    // migrate them into request nodes and drop the legacy field.
    if ((!Array.isArray(merged.nodes) || merged.nodes.length === 0) && Array.isArray(merged.requests)) {
        merged.nodes = merged.requests.map((req: any) => ({
            type: 'request',
            name: req?.description || req?.name || 'Unnamed Request',
            request: req,
            enabled: req?.enabled !== false
        }));
    }

    delete merged.requests;
    return merged;
}

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
        private readonly suiteStore: ITestSuiteStore,
        private readonly configService?: IConfigService
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
            const existing = this.suiteStore.getSuite();
            const mergedSuite = normalizeIncomingSuite(existing, message.suite);

            this.suiteStore.setSuite(mergedSuite);
            this.updateSuiteDir(mergedSuite.id);
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
            this.updateSuiteDir(savedSuite.id);

            messenger.postMessage({
                type: 'suiteSaved',
                suite: savedSuite
            });

            messenger.postMessage({
                type: 'saveSuiteResult',
                success: true,
                suiteId: savedSuite.id
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
            messenger.postMessage({
                type: 'saveSuiteResult',
                success: false,
                suiteId: suite.id,
                error: error?.message || String(error)
            });
            vscode.window.showErrorMessage(`Failed to save suite: ${error.message}`);
        }
    }

    /**
     * Add multiple requests to the suite (batch operation).
     * Resolves full request data and creates suite folders when suiteDir is set.
     */
    private async handleAddRequests(
        message: { requests: any[] },
        messenger: IWebviewMessenger
    ): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite || !message.requests?.length) {
            return;
        }

        for (const request of message.requests) {
            // Resolve full request from collection for folder creation
            const entry = this.suiteStore.getRequestWithContext(
                request.collectionId, 
                request.requestId
            );

            // Build SuiteRequest reference
            const suiteRequest = {
                ...request,
                slug: undefined // will be generated by addRequest
            };

            // Pass full request if available (for folder-based storage)
            this.suiteStore.addRequest(suiteRequest, entry?.request);
        }

        // Send updated suite with resolved requests to webview
        const updatedSuite = this.suiteStore.getSuite();
        const resolvedRequests = this.suiteStore.getResolvedRequests();
        messenger.postMessage({
            type: 'setSuite',
            suite: updatedSuite,
            requests: resolvedRequests
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

        // Send updated suite with resolved requests to webview
        const updatedSuite = this.suiteStore.getSuite();
        const resolvedRequests = this.suiteStore.getResolvedRequests();
        messenger.postMessage({
            type: 'setSuite',
            suite: updatedSuite,
            requests: resolvedRequests
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

    private updateSuiteDir(suiteId: string): void {
        if (this.configService) {
            this.suiteStore.setSuiteDir(path.join(this.configService.getSuitesPath(), suiteId));
        }
    }
}
