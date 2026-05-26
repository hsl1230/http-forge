/**
 * History Handler
 *
 * Handles run history browsing: list past runs, load a historical run's results,
 * and delete old runs.
 */

import { IResultStorageService, ITestSuiteStore } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { RunHistoryEntry } from '../interfaces';

export class HistoryHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['getRunHistory', 'loadHistoryRun', 'deleteHistoryRun'];

    constructor(
        private readonly resultStorageService: IResultStorageService,
        private readonly suiteStore: ITestSuiteStore
    ) {}

    getSupportedCommands(): string[] {
        return HistoryHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'getRunHistory':
                await this.handleGetRunHistory(messenger);
                return true;
            case 'loadHistoryRun':
                await this.handleLoadHistoryRun(message.runId, messenger);
                return true;
            case 'deleteHistoryRun':
                await this.handleDeleteHistoryRun(message.runId, messenger);
                return true;
            default:
                return false;
        }
    }

    private async handleGetRunHistory(messenger: IWebviewMessenger): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) {
            messenger.postMessage({ type: 'runHistory', runs: [] });
            return;
        }

        try {
            const manifests = await this.resultStorageService.listRuns(suite.id);
            const runs: RunHistoryEntry[] = manifests
                .filter(m => m.status !== 'running')
                .map(m => ({
                    runId: m.runId,
                    startTime: m.startTime,
                    endTime: m.endTime,
                    status: m.status as 'completed' | 'aborted' | 'error',
                    environment: m.environment,
                    stats: {
                        totalRequests: m.stats.totalRequests,
                        passed: m.stats.passed,
                        failed: m.stats.failed,
                        totalDuration: m.stats.totalDuration,
                    },
                    config: { iterations: m.config.iterations },
                }));
            messenger.postMessage({ type: 'runHistory', runs });
        } catch (error: any) {
            console.error('[HistoryHandler] Failed to list runs:', error);
            messenger.postMessage({ type: 'runHistory', runs: [] });
        }
    }

    private async handleLoadHistoryRun(runId: string, messenger: IWebviewMessenger): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite || !runId) {
            return;
        }

        try {
            const manifest = await this.resultStorageService.getManifest(suite.id, runId);
            const summaries: any[] = [];
            for (let page = 1; page <= manifest.totalIndexPages; page++) {
                const indexPage = await this.resultStorageService.getIndexPage(suite.id, runId, page);
                summaries.push(...indexPage.summaries);
            }
            messenger.postMessage({ type: 'historyRunLoaded', manifest, summaries });
        } catch (error: any) {
            console.error('[HistoryHandler] Failed to load history run:', error);
        }
    }

    private async handleDeleteHistoryRun(runId: string, messenger: IWebviewMessenger): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite || !runId) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            'Delete this run? This cannot be undone.',
            { modal: true },
            'Delete'
        );
        if (confirm !== 'Delete') {
            return;
        }

        try {
            await this.resultStorageService.deleteRun(suite.id, runId);
            messenger.postMessage({ type: 'historyRunDeleted', runId });
        } catch (error: any) {
            console.error('[HistoryHandler] Failed to delete run:', error);
        }
    }
}
