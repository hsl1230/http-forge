/**
 * Flow Nodes Handler for Test Suite panel
 *
 * Handles `updateFlowNodes` messages from the webview — persists the updated
 * suite.nodes array to the store without a full save.
 */

import { ITestSuiteStore } from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

export class FlowNodesHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['updateFlowNodes'];

    constructor(private readonly suiteStore: ITestSuiteStore) {}

    getSupportedCommands(): string[] {
        return FlowNodesHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: { nodes?: unknown[] }, _messenger: IWebviewMessenger): Promise<boolean> {
        if (command !== 'updateFlowNodes') return false;

        const suite = this.suiteStore.getSuite();
        if (!suite) return true;

        // Patch the in-memory suite with the new node tree
        (suite as any).nodes = Array.isArray(message.nodes) ? message.nodes : [];
        this.suiteStore.setSuite(suite);

        return true;
    }
}
