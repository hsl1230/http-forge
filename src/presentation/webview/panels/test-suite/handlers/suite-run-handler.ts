import type { CollectionRequest, ExecutionRequest, ICookieJar, PathParamEntry, RequestAuth } from '@http-forge/core';
/**
 * Suite Run Handler
 * 
 * Handles test suite run execution.
 * Supports multi-collection requests and statistics.
 * Uses ResultStorageService for memory-efficient result storage.
 * 
 * Run orchestration (iteration loop, storage, messaging) lives here; the flow
 * node-graph interpreter lives in {@link FlowRunExecutor}.
 */

import type { ITestSuiteStore, SuiteRequestEntry } from '@http-forge/core';
import { CollectionRequestExecutor, type ConsoleOutputSource, IConfigService, type IDataFileParser, IEnvironmentConfigService, type IHttpRequestService, InMemoryCookieJar, IRequestPreparer, IResultStorageService, type IScriptExecutor, resolveResultGrouping, ResultStorageService, StatisticsService } from '@http-forge/core';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../../../../infrastructure/services/service-container';
import { ExecutionResult } from '../../../../../shared/types';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { resolveInheritedAuth } from '../../../shared/auth-resolution';
import { SuiteRunConfiguration } from '../interfaces';
import { FlowRunExecutor } from './flow-run-executor';
import type { FlowRunRuntime } from './flow-run-executor';

/**
 * Handler for suite run operations
 */
export class SuiteRunHandler implements IMessageHandler, FlowRunRuntime {
    private static readonly SUPPORTED_COMMANDS = ['startRun', 'stopRun', 'getResultDetails'];

    private isRunning: boolean = false;
    private abortController: AbortController | null = null;
    private statisticsService: StatisticsService;
    private resultStorageService: IResultStorageService | null = null;
    private _lastReportPath: string | undefined = undefined;
    private currentEstimatedTotalRequests = 0;
    readonly flowExecutor: FlowRunExecutor;

    constructor(
        public readonly environmentConfigService: IEnvironmentConfigService | undefined,
        private readonly httpService: IHttpRequestService | undefined,
        public readonly scriptExecutor: IScriptExecutor | undefined,
        private readonly requestPreparer: IRequestPreparer | undefined,
        private readonly dataFileParser: IDataFileParser | undefined,
        public readonly suiteStore: ITestSuiteStore,
        private readonly configService?: IConfigService
    ) {
        this.statisticsService = new StatisticsService();
        this.flowExecutor = new FlowRunExecutor(this);
    }

    getSupportedCommands(): string[] {
        return SuiteRunHandler.SUPPORTED_COMMANDS;
    }

    /** Flow run runtime contract: whether the current run has been aborted. */
    isAborted(): boolean {
        return this.abortController?.signal.aborted ?? false;
    }

    /** Flow run runtime contract: current estimated total request count. */
    getCurrentEstimatedTotal(): number {
        return this.currentEstimatedTotalRequests;
    }

    /**
     * Flow run runtime contract: lower the estimated total when a branch ran
     * fewer requests than planned (progress accuracy).
     */
    adjustEstimatedTotal(plannedCount: number, actualCount: number, completedCount: number): void {
        const reduction = Math.max(0, plannedCount - actualCount);
        const nextTotal = Math.max(completedCount, this.currentEstimatedTotalRequests - reduction);
        this.currentEstimatedTotalRequests = nextTotal;
    }

    /** Flow run runtime contract: log info to the Test Suite output channel. */
    logInfo(message: string): void {
        getServiceContainer().console.info(message, 'Test Suite');
    }

    /** Flow run runtime contract: log a warning to the Test Suite output channel. */
    logWarn(message: string): void {
        getServiceContainer().console.warn(message, 'Test Suite');
    }

    /** Flow run runtime contract: surface a warning to the user. */
    showWarning(message: string): void {
        vscode.window.showWarningMessage(message);
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'startRun':
                await this.startRun(message.config, messenger);
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
     * Start suite run — executes all enabled request nodes in the flow.
     *
     * @param config - Run configuration
     * @param messenger - Webview messenger
     */
    private async startRun(
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

        const topLevelNodes = Array.isArray(suite.nodes) ? suite.nodes : [];
        const isFlatRequestSuite = topLevelNodes.every((node: any) => node?.type === 'request');
        const flatRequests: SuiteRequestEntry[] = [];

        if (isFlatRequestSuite) {
            getServiceContainer().console.info(`[SuiteRunHandler] suite.nodes count: ${suite.nodes.length}`, 'Test Suite');
            for (const node of topLevelNodes) {
                if ((node as any).enabled === false) continue;
                const req = (node as any).request;
                getServiceContainer().console.info(`[SuiteRunHandler] resolving node: collectionId=${req?.collectionId} requestId=${req?.requestId} name=${req?.name}`, 'Test Suite');
                const entry = this.suiteStore.resolveRequestEntry(req);
                if (entry) {
                    flatRequests.push(entry);
                } else {
                    vscode.window.showWarningMessage(`Could not resolve request "${req?.name}" — check that its collection is loaded.`);
                }
            }
        }

        const totalRequestsPerIteration = isFlatRequestSuite
            ? flatRequests.length
            : this.flowExecutor.estimateEnabledRequestNodes(topLevelNodes, config);

        if (totalRequestsPerIteration === 0) {
            vscode.window.showErrorMessage('No executable requests found in this suite.');
            messenger.postMessage({ type: 'runComplete', runId: null, suiteId: suite.id, summary: null });
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

        const totalRequests = totalRequestsPerIteration * config.iterations;
        this.currentEstimatedTotalRequests = totalRequests;
        const environmentId = config.environmentId || 'default';

        // Create per-run cookie jar (hoisted for flush in finally)
        const cookieJar: ICookieJar = config.writeToSharedSession ? getServiceContainer().persistentCookieJar : new InMemoryCookieJar();

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
                `Starting run: ${totalRequestsPerIteration} requests × ${config.iterations} iterations = ${totalRequests} total`,
                'Test Suite'
            );

            // cookieJar is created above the try block so it can be flushed in finally

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
                envVariables = { ...envVariables, ...sharedEnvVars };
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

                if (isFlatRequestSuite) {
                    for (let i = 0; i < flatRequests.length; i++) {
                        if (this.abortController.signal.aborted) {
                            break;
                        }

                        const entry = flatRequests[i];
                        const result = await this.executeRequest(
                            entry,
                            iterationVariables,
                            cookieJar,
                            environmentId,
                            (entry as any).folderAuthChain,
                            (entry as any).collectionAuth,
                            iteration + 1,
                            config.iterations
                        );

                        const handled = await this.handleRequestExecutionResult(
                            entry,
                            result,
                            iteration + 1,
                            totalRequests,
                            completedCount,
                            messenger,
                            config.stopOnError
                        );
                        completedCount = handled.completedCount;
                        iterationVariables = handled.variables;

                        if (this.abortController.signal.aborted) {
                            break;
                        }

                        if (result.nextRequest !== undefined) {
                            if (result.nextRequest === null) {
                                break;
                            }
                            const targetIndex = flatRequests.findIndex(
                                (r: any) => (r.suiteRequest.name || r.request.name) === result.nextRequest
                            );
                            if (targetIndex !== -1) {
                                i = targetIndex - 1;
                            }
                        }

                        if (config.delay > 0) {
                            await this.delay(config.delay);
                        }
                    }
                } else {
                    const flowResult = await this.flowExecutor.executeFlowNodes(
                        suite,
                        topLevelNodes,
                        iterationVariables,
                        cookieJar,
                        environmentId,
                        iteration + 1,
                        config.iterations,
                        totalRequests,
                        completedCount,
                        messenger,
                        config
                    );
                    completedCount = flowResult.completedCount;
                    iterationVariables = flowResult.variables;
                }

                accumulatedVariables = { ...iterationVariables };
            }

            // Complete statistics
            this.statisticsService.complete();

            // Finalize storage and generate HTML report
            if (this.resultStorageService) {
                const finalStatus = this.abortController?.signal.aborted ? 'aborted' : 'completed';
                this._lastReportPath = await this.resultStorageService.finalizeRun(finalStatus) ?? undefined;
            }

            // Send final statistics
            messenger.postMessage({
                type: 'statisticsUpdate',
                statistics: this.statisticsService.getSerializableStatistics()
            });

        } catch (error: any) {
            // Finalize storage with error status
            if (this.resultStorageService) {
                this._lastReportPath = await this.resultStorageService.finalizeRun('error') ?? undefined;
            }
            vscode.window.showErrorMessage(error.message || 'An error occurred during the run');
            getServiceContainer().console.error(`Run error: ${error.message}`, 'Test Suite');
        } finally {
            this.isRunning = false;
            this.abortController = null;
            this.currentEstimatedTotalRequests = 0;

            const stats = this.statisticsService.getStatistics();
            const runId = this.resultStorageService?.getCurrentRunId();
            const suiteId = this.resultStorageService?.getCurrentSuiteId();

            messenger.postMessage({
                type: 'runComplete',
                runId,
                suiteId,
                summary: stats.summary,
                reportPath: this._lastReportPath
            });

            getServiceContainer().console.info(
                `Run complete: ${stats.summary.passed} passed, ${stats.summary.failed} failed, ${stats.summary.skipped} skipped (${stats.summary.passRate}% pass rate)`,
                'Test Suite'
            );

            // Flush pending cookie operations to persistent store
            if (cookieJar.flush) {
                await cookieJar.flush();
            }

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
        return this.collectionRequestToExecutionRequestWithAuth(collectionRequest, [], undefined);
    }

    private collectionRequestToExecutionRequestWithAuth(
        collectionRequest: CollectionRequest,
        folderAuthChain: RequestAuth[] = [],
        collectionAuth?: RequestAuth
    ): ExecutionRequest {
        const allowedAuthTypes = ['none', 'inherit', 'basic', 'bearer', 'apikey', 'oauth2'] as const;
        const authType = (collectionRequest.auth?.type && (allowedAuthTypes as readonly string[]).includes(collectionRequest.auth.type))
            ? (collectionRequest.auth.type as 'none' | 'inherit' | 'basic' | 'bearer' | 'apikey' | 'oauth2')
            : undefined;

        const effectiveAuth = resolveInheritedAuth(
            authType
                ? {
                    type: authType,
                    bearerToken: collectionRequest.auth?.bearerToken,
                    basicAuth: collectionRequest.auth?.basicAuth,
                    apikey: collectionRequest.auth?.apikey,
                    oauth2: collectionRequest.auth?.oauth2
                }
                : collectionRequest.auth,
            folderAuthChain,
            collectionAuth
        );

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
            auth: effectiveAuth
        };

        return executionRequest;
    }
    /**
     * Execute a single request
     */
    public async executeRequest(
        entry: SuiteRequestEntry,
        variables: Record<string, string>,
        cookieJar: ICookieJar,
        environment: string,
        folderAuthChain: RequestAuth[],
        collectionAuth?: RequestAuth,
        iteration?: number,
        iterationCount?: number
    ): Promise<ExecutionResult> {
        if (!this.httpService || !this.scriptExecutor || !this.environmentConfigService || !this.requestPreparer) {
            throw new Error('Required services not initialized');
        }

        // Create callback to log console output to VS Code output channel
        const consoleService = getServiceContainer().console;
        const onConsoleOutput = (output: string[], source: ConsoleOutputSource) => {
            consoleService.logRawLines(output, `${source.requestName} [${source.phase}]`);
        };

        // Normalize auth from collection request to the format expected by RequestPreparer:
        // input.auth = { type, bearerToken?, basicAuth?, apikey?, oauth2? }
        let normalizedRequest: ExecutionRequest = this.collectionRequestToExecutionRequestWithAuth(
            entry.request,
            folderAuthChain,
            collectionAuth
        );

        // Pass collection name into executor so scripts can access pm.info.collectionName
        const executorWithCollectionName = new (CollectionRequestExecutor as any)(
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
            collectionAuth,
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
     * Build a stable statistics key so same-named requests in different folders don't merge.
     */
    private buildRequestStatsKey(entry: SuiteRequestEntry): string {
        const sr = entry.suiteRequest;
        const collectionId = sr.collectionId
            || sr.collectionName
            || 'unknown-collection';
        const folderPath = sr.folderPath || '';
        const requestId = sr.requestId
            || entry.request.id
            || sr.name
            || entry.request.name
            || 'unknown-request';
        return `${collectionId}::${folderPath}::${requestId}`;
    }

    public async handleRequestExecutionResult(
        entry: SuiteRequestEntry,
        result: ExecutionResult,
        iteration: number,
        totalRequests: number,
        completedCount: number,
        messenger: IWebviewMessenger,
        stopOnError: boolean,
        delayMs: number = 0,
        variables: Record<string, string> = {},
        groupPath?: string,
        groupType?: 'folder' | 'block'
    ): Promise<{ variables: Record<string, string>; completedCount: number }> {
        const requestName = entry.suiteRequest.name || entry.request.name || 'Unknown Request';
        const requestKey = this.buildRequestStatsKey(entry);
        const fallbackGrouping = resolveResultGrouping({
            collectionName: (entry as any).resolvedCollectionName || entry.suiteRequest.collectionName || '',
            folderPath: entry.suiteRequest.folderPath || (entry as any).resolvedFolderPath || (entry.request as any)?.folderPath || '',
            blockLabel: undefined
        });
        const effectiveGroupPath: string = groupPath !== undefined
            ? groupPath
            : (result.groupPath || result.folderPath || fallbackGrouping.groupPath);
        const effectiveGroupType = groupType ?? result.groupType ?? fallbackGrouping.groupType;
        const resultWithName = {
            ...result,
            name: requestName,
            groupPath: effectiveGroupPath,
            groupType: effectiveGroupType
        };

        const addResult = this.statisticsService.addResult as unknown as (...args: any[]) => void;
        if (addResult.length >= 6) {
            addResult.call(
                this.statisticsService,
                requestKey,
                requestName,
                result.duration,
                result.passed,
                false,
                result.error
            );
        } else {
            addResult.call(
                this.statisticsService,
                requestName,
                result.duration,
                result.passed,
                false,
                result.error
            );
        }

        const nextCompletedCount = completedCount + 1;

        if (this.resultStorageService) {
            const summary = await this.resultStorageService.saveResult(iteration, resultWithName);
            messenger.postMessage({
                type: 'requestResult',
                result: summary
            });
        } else {
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
                    index: nextCompletedCount - 1,
                    iteration,
                    gp: effectiveGroupPath,
                    gt: effectiveGroupType
                }
            });
        }

        const stats = this.statisticsService.getStatistics();
        messenger.postMessage({
            type: 'runProgress',
            current: nextCompletedCount,
            total: this.currentEstimatedTotalRequests || totalRequests,
            passed: stats.summary.passed,
            failed: stats.summary.failed,
            skipped: stats.summary.skipped
        });

        messenger.postMessage({
            type: 'statisticsUpdate',
            statistics: this.statisticsService.getSerializableStatistics()
        });

        let nextVariables = { ...variables };
        if ((result as any).localVariables && typeof (result as any).localVariables === 'object') {
            // Replace with the latest local snapshot so unset/clear operations
            // are not reintroduced by older carried variables.
            nextVariables = { ...(result as any).localVariables };
        } else {
            if (result.modifiedVariables) {
                nextVariables = { ...nextVariables, ...result.modifiedVariables };
            }
            if (result.modifiedEnvironmentVariables) {
                nextVariables = { ...nextVariables, ...result.modifiedEnvironmentVariables };
            }
        }

        if (!result.passed && stopOnError) {
            getServiceContainer().console.warn(
                `Stopping due to error: ${result.error || 'Request failed'}`,
                'Test Suite'
            );
            this.abortController?.abort();
        }

        if (delayMs > 0 && !this.abortController?.signal.aborted) {
            await this.delay(delayMs);
        }

        return { variables: nextVariables, completedCount: nextCompletedCount };
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
