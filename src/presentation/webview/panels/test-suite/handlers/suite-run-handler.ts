import type { CollectionRequest, ExecutionRequest, ICookieJar, PathParamEntry } from '@http-forge/core';
/**
 * Suite Run Handler
 * 
 * Handles test suite run execution.
 * Supports multi-collection requests and statistics.
 * Uses ResultStorageService for memory-efficient result storage.
 */

import type { ITestSuiteStore, SuiteRequestEntry } from '@http-forge/core';
import { CollectionRequestExecutor, IConfigService, type IDataFileParser, IEnvironmentConfigService, type IHttpRequestService, InMemoryCookieJar, IRequestPreparer, IResultStorageService, type IScriptExecutor, ResultStorageService, StatisticsService } from '@http-forge/core';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../../../../infrastructure/services/service-container';
import { ExecutionResult } from '../../../../../shared/types';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { SuiteRunConfiguration } from '../interfaces';

/**
 * Handler for suite run operations
 */
export class SuiteRunHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['startRun', 'stopRun', 'getResultDetails'];

    private isRunning: boolean = false;
    private abortController: AbortController | null = null;
    private statisticsService: StatisticsService;
    private resultStorageService: IResultStorageService | null = null;

    constructor(
        private readonly environmentConfigService: IEnvironmentConfigService | undefined,
        private readonly httpService: IHttpRequestService | undefined,
        private readonly scriptExecutor: IScriptExecutor | undefined,
        private readonly requestPreparer: IRequestPreparer | undefined,
        private readonly dataFileParser: IDataFileParser | undefined,
        private readonly suiteStore: ITestSuiteStore,
        private readonly configService?: IConfigService
    ) {
        this.statisticsService = new StatisticsService();
    }

    getSupportedCommands(): string[] {
        return SuiteRunHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'startRun':
                await this.startRun(message.selectedIndices, message.config, messenger);
                return true;
            case 'stopRun':
                this.stopRun(messenger);
                return true;
            case 'getResultDetails':
                await this.handleGetResultDetails(message, messenger);
                return true;
            default:
                return false;
        }
    }

    /**
     * Start suite run
     * 
     * @param selectedIndices - Array of indices into suite.requests
     * @param config - Run configuration
     * @param messenger - Webview messenger
     */
    private async startRun(
        selectedIndices: number[],
        config: SuiteRunConfiguration,
        messenger: IWebviewMessenger
    ): Promise<void> {
        if (this.isRunning) {
            return;
        }

        const suite = this.suiteStore.getSuite();
        if (!suite) {
            vscode.window.showErrorMessage('No suite loaded');
            return;
        }

        // Convert indices to request keys and get entries
        const selectedRequestKeys: string[] = [];
        const requests: SuiteRequestEntry[] = [];

        for (const index of selectedIndices) {
            if (index >= 0 && index < suite.requests.length) {
                const suiteReq = suite.requests[index];
                const key = `${suiteReq.collectionId}:${suiteReq.requestId}`;
                selectedRequestKeys.push(key);

                const entry = this.suiteStore.getRequestWithContext(suiteReq.collectionId, suiteReq.requestId);
                if (entry) {
                    requests.push(entry);
                }
            }
        }

        if (requests.length === 0) {
            vscode.window.showErrorMessage('No requests selected');
            return;
        }

        this.isRunning = true;
        this.abortController = new AbortController();

        // Reset and start statistics
        this.statisticsService.reset();
        this.statisticsService.start();

        // Initialize result storage service
        if (this.configService) {
            this.resultStorageService = new ResultStorageService(this.configService);
        }

        const totalRequests = requests.length * config.iterations;
        const environmentId = config.environmentId || 'default';

        try {
            // Initialize storage for this run
            let runId: string | null = null;
            if (this.resultStorageService) {
                const storageConfig = {
                    iterations: config.iterations,
                    delayBetweenRequests: config.delay,
                    stopOnError: config.stopOnError
                };
                runId = await this.resultStorageService.initializeRun(
                    suite.id,
                    suite.name,
                    environmentId,
                    storageConfig
                );
            }

            // Notify webview of run start with runId and suiteId
            messenger.postMessage({
                type: 'runStarted',
                runId,
                suiteId: suite.id,
                totalRequests,
                iterations: config.iterations
            });

            // Log to VS Code output channel
            getServiceContainer().console.info(
                `Starting run: ${requests.length} requests × ${config.iterations} iterations = ${totalRequests} total`,
                'Test Suite'
            );

            // Create per-run cookie jar
            const cookieJar: ICookieJar = config.writeToSharedSession? getServiceContainer().persistentCookieJar : new InMemoryCookieJar();

            // Load environment variables
            let envVariables: Record<string, string> = {};
            if (config.environmentId && this.environmentConfigService) {
                const resolved = this.environmentConfigService.getResolvedEnvironment(config.environmentId);
                if (resolved) {
                    envVariables = resolved.variables || {};
                }
            }

            // Load shared session variables if enabled
            if (config.readFromSharedSession && this.environmentConfigService) {
                const sharedEnvVars = this.environmentConfigService.getEnvironmentVariableLocals();
                const sharedSessionVars = this.environmentConfigService.getSessionVariables();
                envVariables = { ...envVariables, ...sharedEnvVars, ...sharedSessionVars };
            }

            // Parse data file
            let dataRows: any[] = [{}];
            if (config.dataFile && this.dataFileParser) {
                try {
                    dataRows = this.dataFileParser.parse(config.dataFile.content, config.dataFile.path);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to parse data file: ${error.message}`);
                    return;
                }
            }

            let accumulatedVariables = { ...envVariables };
            let completedCount = 0;

            // Run iterations
            for (let iteration = 0; iteration < config.iterations; iteration++) {
                if (this.abortController.signal.aborted) {
                    break;
                }

                const dataRow = dataRows[iteration % dataRows.length];
                let iterationVariables = { ...accumulatedVariables, ...dataRow };

                // Run each request
                for (let i = 0; i < requests.length; i++) {
                    if (this.abortController.signal.aborted) {
                        break;
                    }

                    const entry = requests[i];
                    const requestKey = selectedRequestKeys[i];

                    // Execute request
                    const result = await this.executeRequest(
                        entry,
                        iterationVariables,
                        cookieJar,
                        environmentId,
                        iteration + 1,
                        config.iterations
                    );

                    // Fallback to entry.request.name if suiteRequest.name is empty
                    const requestName = entry.suiteRequest.name || entry.request.name || 'Unknown Request';

                    // Override result.name with the display name (may differ from request's original name)
                    const resultWithName = { ...result, name: requestName };

                    // Update statistics
                    this.statisticsService.addResult(
                        requestName,
                        result.duration,
                        result.passed,
                        false, // not skipped
                        result.error
                    );

                    completedCount++;

                    // Save result to storage and send compact summary to webview
                    if (this.resultStorageService) {
                        const summary = await this.resultStorageService.saveResult(iteration + 1, resultWithName);
                        messenger.postMessage({
                            type: 'requestResult',
                            result: summary  // Send compact summary instead of full result
                        });
                    } else {
                        // Fallback: send result with flattened structure for backward compatibility
                        messenger.postMessage({
                            type: 'requestResult',
                            result: {
                                requestId: result.requestId,
                                name: requestName,
                                method: result.executedRequest.method,
                                url: result.executedRequest.url,
                                status: result.response.status,
                                statusText: result.response.statusText,
                                duration: result.duration,
                                passed: result.passed,
                                error: result.error,
                                assertions: result.assertions || [],
                                index: completedCount - 1,
                                iteration: iteration + 1
                            }
                        });
                    }

                    // Send progress update
                    const stats = this.statisticsService.getStatistics();
                    messenger.postMessage({
                        type: 'runProgress',
                        current: completedCount,
                        total: totalRequests,
                        passed: stats.summary.passed,
                        failed: stats.summary.failed,
                        skipped: stats.summary.skipped
                    });

                    // Send statistics update
                    messenger.postMessage({
                        type: 'statisticsUpdate',
                        statistics: this.statisticsService.getSerializableStatistics()
                    });

                    // Propagate variables
                    if (result.modifiedVariables) {
                        iterationVariables = { ...iterationVariables, ...result.modifiedVariables };
                    }
                    if (result.modifiedEnvironmentVariables) {
                        iterationVariables = { ...iterationVariables, ...result.modifiedEnvironmentVariables };
                    }
                    if (result.modifiedSessionVariables) {
                        iterationVariables = { ...iterationVariables, ...result.modifiedSessionVariables };
                    }

                    // Write to shared session if enabled
                    if (config.writeToSharedSession && this.environmentConfigService) {
                        if (result.modifiedEnvironmentVariables) {
                            for (const [key, value] of Object.entries(result.modifiedEnvironmentVariables)) {
                                this.environmentConfigService.setEnvironmentVariable(key, value);
                            }
                        }
                        if (result.modifiedSessionVariables) {
                            for (const [key, value] of Object.entries(result.modifiedSessionVariables)) {
                                this.environmentConfigService.setSessionVariable(key, value);
                            }
                        }
                    }

                    // Stop on error if configured
                    if (!result.passed && config.stopOnError) {
                        getServiceContainer().console.warn(
                            `Stopping due to error: ${result.error || 'Request failed'}`,
                            'Test Suite'
                        );
                        this.abortController.abort();
                        break;
                    }

                    // Postman-compatible pm.execution.setNextRequest() / pm.setNextRequest()
                    if (result.nextRequest !== undefined) {
                        if (result.nextRequest === null) {
                            // pm.setNextRequest(null) → stop the runner
                            break;
                        }
                        // Find the target request by name in the remaining list
                        const targetIndex = requests.findIndex(
                            (r: any) => (r.suiteRequest.name || r.request.name) === result.nextRequest
                        );
                        if (targetIndex !== -1) {
                            // Jump to the target request (loop will increment i, so set to targetIndex - 1)
                            i = targetIndex - 1;
                        }
                    }

                    // Delay between requests
                    if (config.delay > 0) {
                        await this.delay(config.delay);
                    }
                }

                accumulatedVariables = { ...iterationVariables };
            }

            // Complete statistics
            this.statisticsService.complete();

            // Finalize storage
            if (this.resultStorageService) {
                const finalStatus = this.abortController?.signal.aborted ? 'aborted' : 'completed';
                await this.resultStorageService.finalizeRun(finalStatus);
            }

            // Send final statistics
            messenger.postMessage({
                type: 'statisticsUpdate',
                statistics: this.statisticsService.getSerializableStatistics()
            });

        } catch (error: any) {
            // Finalize storage with error status
            if (this.resultStorageService) {
                await this.resultStorageService.finalizeRun('error');
            }
            vscode.window.showErrorMessage(error.message || 'An error occurred during the run');
            getServiceContainer().console.error(`Run error: ${error.message}`, 'Test Suite');
        } finally {
            this.isRunning = false;
            this.abortController = null;

            const stats = this.statisticsService.getStatistics();
            const runId = this.resultStorageService?.getCurrentRunId();
            const suiteId = this.resultStorageService?.getCurrentSuiteId();

            messenger.postMessage({
                type: 'runComplete',
                runId,
                suiteId,
                summary: stats.summary
            });

            getServiceContainer().console.info(
                `Run complete: ${stats.summary.passed} passed, ${stats.summary.failed} failed, ${stats.summary.skipped} skipped (${stats.summary.passRate}% pass rate)`,
                'Test Suite'
            );

            // Clean up storage service
            this.resultStorageService = null;
        }
    }

    /**
     * Stop suite run
     */
    private stopRun(messenger: IWebviewMessenger): void {
        if (this.abortController) {
            this.abortController.abort();
            messenger.postMessage({
                type: 'runStopped'
            });
            // Log to VS Code output channel
            getServiceContainer().console.warn('Run stopped by user', 'Test Suite');
        }
    }
    /**
     * Converts a CollectionRequest to an ExecutionRequest
     * @param collectionRequest - The CollectionRequest object
     * @returns ExecutionRequest
     */
    private collectionRequestToExecutionRequest(collectionRequest: CollectionRequest): ExecutionRequest {
        const allowedAuthTypes = ['none', 'inherit', 'basic', 'bearer', 'apikey', 'oauth2'] as const;
        const authType = (collectionRequest.auth?.type && (allowedAuthTypes as readonly string[]).includes(collectionRequest.auth.type))
            ? (collectionRequest.auth.type as 'none' | 'inherit' | 'basic' | 'bearer' | 'apikey' | 'oauth2')
            : undefined;

        // Convert headers and query from arrays to objects if necessary
        const executionRequest: ExecutionRequest = {
            ...collectionRequest,
            headers: Array.isArray(collectionRequest.headers)
                ? collectionRequest.headers.reduce<Record<string, string>>((acc, header) => {
                    if (header.enabled && header.key) acc[header.key] = header.value ?? '';
                    return acc;
                }, {})
                : collectionRequest.headers as Record<string, string> | undefined,
            query: Array.isArray(collectionRequest.query)
                ? collectionRequest.query.reduce<Record<string, string>>((acc, param) => {
                    if (param.enabled && param.key) acc[param.key] = param.value ?? '';
                    return acc;
                }, {})
                : collectionRequest.query as Record<string, string> | undefined,
            // Resolve PathParamEntry values to plain strings for execution
            params: collectionRequest.params
                ? Object.entries(collectionRequest.params).reduce<Record<string, string>>((acc, [key, value]) => {
                    acc[key] = typeof value === 'string' ? value : ((value as PathParamEntry).value ?? '');
                    return acc;
                }, {})
                : undefined,
            // include authorization info so CollectionRequestExecutor can apply auth
            auth: {
                type: authType === 'inherit' ? 'none' : authType,
                bearerToken: collectionRequest.auth?.bearerToken,
                basicAuth: collectionRequest.auth?.basicAuth,
                apikey: collectionRequest.auth?.apikey,
                oauth2: collectionRequest.auth?.oauth2
            }
        };

        return executionRequest;
    }
    /**
     * Execute a single request
     */
    private async executeRequest(
        entry: SuiteRequestEntry,
        variables: Record<string, string>,
        cookieJar: ICookieJar,
        environment: string,
        iteration?: number,
        iterationCount?: number
    ): Promise<ExecutionResult> {
        if (!this.httpService || !this.scriptExecutor || !this.environmentConfigService || !this.requestPreparer) {
            throw new Error('Required services not initialized');
        }

        // Create callback to log console output to VS Code output channel
        const consoleService = getServiceContainer().console;
        const onConsoleOutput = (output: string[]) => {
            consoleService.logRawLines(output, 'Script');
        };

        // Normalize auth from collection request to the format expected by RequestPreparer:
        // input.auth = { type, bearerToken?, basicAuth?, apikey?, oauth2? }
        let normalizedRequest: ExecutionRequest = this.collectionRequestToExecutionRequest(entry.request);

        // Pass collection name into executor so scripts can access pm.info.collectionName
        const executorWithCollectionName = new CollectionRequestExecutor(
            this.httpService,
            this.scriptExecutor,
            this.environmentConfigService,
            this.requestPreparer,
            environment,
            cookieJar,
            entry.collectionScripts,
            entry.folderScriptsChain,
            onConsoleOutput,
            entry.suiteRequest?.collectionName,
            iteration,
            iterationCount
        );

        return executorWithCollectionName.execute(
            normalizedRequest,
            variables,
            this.abortController?.signal
        );
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle get result details request
     * Reads full result from the file path stored in ResultSummary
     * Rebuilds path from suiteId + runId + filename for memory efficiency
     */
    private async handleGetResultDetails(
        message: { suiteId: string; runId: string; resultFile: string },
        messenger: IWebviewMessenger
    ): Promise<void> {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const { suiteId, runId, resultFile } = message;

            if (!suiteId || !runId || !resultFile) {
                throw new Error('Missing required parameters: suiteId, runId, or resultFile');
            }

            // Get base path from ConfigService
            if (!this.configService) {
                throw new Error('ConfigService not available');
            }
            const basePath = this.configService.getResultsPath();

            // Rebuild full path from components
            const filePath = path.join(
                basePath,
                suiteId,
                runId,
                'results',
                resultFile
            );

            const content = await fs.readFile(filePath, 'utf-8');
            const details = JSON.parse(content);

            messenger.postMessage({
                type: 'resultDetails',
                details
            });
        } catch (error: any) {
            console.error('[SuiteRunHandler] Failed to load result details:', error);
            messenger.postMessage({
                type: 'resultDetailsError',
                error: error.message || 'Failed to load result details'
            });
        }
    }
}
