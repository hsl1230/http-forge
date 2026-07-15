/**
 * Edit Request Handler for Test Suite
 *
 * Handles editing suite requests in the Request Tester panel
 * and re-syncing from the source collection.
 */

import { type ITestSuiteStore, TestSuiteService } from '@http-forge/core';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../../../../infrastructure/services/service-container';
import { COMMAND_IDS } from '../../../../../shared/constants';
import { ensureRequestDefaults, RequestContext } from '../../../../../shared/utils';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { RequestTesterPanelManager } from '../../request-tester/request-tester-panel-manager';
import { registerSuiteContext } from '../../request-tester/suite-context-registry';

export class EditRequestHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['editSuiteRequest', 'resetSuiteRequest', 'openOriginalRequest'];

    constructor(
        private readonly suiteStore: ITestSuiteStore,
        private readonly testSuiteService: TestSuiteService
    ) {}

    getSupportedCommands(): string[] {
        return EditRequestHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'editSuiteRequest':
                await this.handleEditRequest(message, messenger);
                return true;
            case 'resetSuiteRequest':
                await this.handleResetRequest(message, messenger);
                return true;
            case 'openOriginalRequest':
                await this.handleOpenOriginalRequest(message);
                return true;
            default:
                return false;
        }
    }

    /**
     * Open a suite request in the Request Tester panel for editing
     */
    private async handleEditRequest(
        message: { slug: string },
        messenger: IWebviewMessenger
    ): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) return;

        const node = suite.nodes?.find((n: any) => n?.type === 'request' && n?.request?.slug === message.slug) as any;
        const sr = node?.request;
        if (!sr) return;

        const entry = this.suiteStore.getRequestBySlug(message.slug);
        if (!entry) return;

        const context: RequestContext = {
            title: `[${suite.name}] ${entry.request.name}`,
            collectionId: sr.collectionId,
            requestId: sr.requestId,
            collectionName: sr.collectionName,
            request: entry.request,
            allowSave: true,
            suiteId: suite.id,
            suiteRequestKey: sr.slug,
            disableSchemas: true,
            disableHistory: true
        };

        // Register suite context so SaveRequestHandler can access it
        registerSuiteContext(suite.id, {
            suiteStore: this.suiteStore,
            testSuiteService: this.testSuiteService
        });

        const panelManager = RequestTesterPanelManager.getInstance();
        await panelManager.show(context, true);
    }

    /**
     * Reset a suite request to the latest version from collection
     */
    private async handleResetRequest(
        message: { slug: string },
        messenger: IWebviewMessenger
    ): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) return;

        const updatedRequest = this.suiteStore.resyncFromCollection(message.slug);
        if (!updatedRequest) return;

        // Persist updated suite.json
        await this.testSuiteService.updateSuite(suite);

        // Send refreshed data to webview
        const requests = this.suiteStore.getResolvedRequests();
        messenger.postMessage({
            type: 'setSuite',
            suite,
            requests
        });
    }

    /**
     * Open the original collection request (without suite context)
     */
    private async handleOpenOriginalRequest(message: { slug: string }): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) return;

        const node = suite.nodes?.find((n: any) => n?.type === 'request' && n?.request?.slug === message.slug) as any;
        const sr = node?.request;
        if (!sr) return;

        const collection = getServiceContainer().collection.getCollection(sr.collectionId);
        if (!collection) return;

        const request = this.findInItems(collection.items || [], sr.requestId);
        if (!request) return;

        const context: RequestContext = {
            title: request.name || 'HTTP Request',
            collectionId: sr.collectionId,
            requestId: sr.requestId,
            request: ensureRequestDefaults(request),
            readonly: false
        };

        await vscode.commands.executeCommand(COMMAND_IDS.openRequest, context);
    }

    private findInItems(items: any[], id: string): any | undefined {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.type === 'folder' && item.items) {
                const found = this.findInItems(item.items, id);
                if (found) return found;
            }
        }
        return undefined;
    }
}
