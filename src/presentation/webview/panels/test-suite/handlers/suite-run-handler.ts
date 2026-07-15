import type { CollectionRequest, ExecutionRequest, ICookieJar, PathParamEntry, PreRequestScriptContext, RequestAuth } from '@http-forge/core';
/**
 * Suite Run Handler
 * 
 * Handles test suite run execution.
 * Supports multi-collection requests and statistics.
 * Uses ResultStorageService for memory-efficient result storage.
 */

import type { ITestSuiteStore, SuiteRequestEntry } from '@http-forge/core';
import { CollectionRequestExecutor, type ConsoleOutputSource, deserializeTypedRecord, deserializeTypedValue, evaluateExpression, IConfigService, type IDataFileParser, IEnvironmentConfigService, type IHttpRequestService, InMemoryCookieJar, IRequestPreparer, IResultStorageService, type IScriptExecutor, ResultStorageService, StatisticsService } from '@http-forge/core';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../../../../infrastructure/services/service-container';
import { ExecutionResult } from '../../../../../shared/types';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { resolveInheritedAuth } from '../../../shared/auth-resolution';
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
    private _lastReportPath: string | undefined = undefined;

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
            : this.countEnabledRequestNodes(topLevelNodes);

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
                    const flowResult = await this.executeFlowNodes(
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
    private async executeRequest(
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

    private countEnabledRequestNodes(nodes: any[]): number {
        let count = 0;
        for (const node of nodes || []) {
            if (!node || typeof node !== 'object' || node.enabled === false) {
                continue;
            }
            if (node.type === 'request' && node.request) {
                count++;
                continue;
            }
            count += this.countEnabledRequestNodes(this.getChildNodes(node));
            if (Array.isArray(node.elseif)) {
                for (const branch of node.elseif) {
                    count += this.countEnabledRequestNodes(this.getChildNodes(branch));
                }
            }
            if (Array.isArray(node.cases)) {
                for (const caseNode of node.cases) {
                    count += this.countEnabledRequestNodes(this.getChildNodes(caseNode));
                }
            }
        }
        return count;
    }

    private getChildNodes(node: any): any[] {
        for (const key of ['nodes', 'then', 'body', 'else', 'elseNodes', 'default', 'defaultNodes']) {
            if (Array.isArray(node?.[key])) {
                return node[key];
            }
        }
        return [];
    }

    private createFlowExpressionContext(node: any, variables: Record<string, string>, environmentId: string, iteration: number) {
        const decodedVars = deserializeTypedRecord(variables);
        const variablesApi = {
            get: (key: string) => deserializeTypedValue(variables[key]),
            set: (key: string, value: unknown) => {
                if (typeof key === 'string' && key.trim()) {
                    variables[key] = value == null ? '' : String(value);
                }
            },
            unset: (key: string) => {
                if (typeof key === 'string' && key.trim()) {
                    delete variables[key];
                }
            },
            has: (key: string) => Object.prototype.hasOwnProperty.call(variables, key),
            toObject: () => ({ ...decodedVars })
        };

        const environmentApi = {
            get: (key: string) => deserializeTypedValue(this.environmentConfigService?.getResolvedEnvironment(environmentId)?.variables?.[key]),
            set: (key: string, value: unknown) => {
                if (this.environmentConfigService && typeof key === 'string' && key.trim()) {
                    this.environmentConfigService.setEnvironmentVariable(key, value == null ? '' : String(value), environmentId);
                }
            }
        };

        const globalsApi = {
            get: (key: string) => deserializeTypedValue(this.environmentConfigService?.getGlobalVariables()?.[key]),
            set: (key: string, value: unknown) => {
                if (this.environmentConfigService && typeof key === 'string' && key.trim()) {
                    this.environmentConfigService.setGlobalVariable(key, value == null ? '' : String(value));
                }
            }
        };

        return {
            vars: decodedVars,
            iteration,
            node,
            pm: {
                variables: variablesApi,
                environment: environmentApi,
                globals: globalsApi
            }
        };
    }

    private evaluateFlowCondition(expression: unknown, node: any, variables: Record<string, string>, environmentId: string, iteration: number): boolean {
        if (typeof expression !== 'string' || !expression.trim()) {
            return true;
        }
        const value = evaluateExpression(expression, this.createFlowExpressionContext(node, variables, environmentId, iteration));
        if (node?.type === 'for' || node?.type === 'while' || node?.type === 'if') {
            getServiceContainer().console.info(
                `[SuiteRunHandler] evaluateFlowCondition type=${node?.type} name=${node?.name || 'unnamed'} expr="${expression}" value=${String(value)} i=${String(deserializeTypedValue(variables?.i))}`,
                'Test Suite'
            );
        }
        return Boolean(value);
    }

    private normalizeFlowScript(script: unknown): string | undefined {
        if (typeof script === 'string') {
            return script;
        }
        if (Array.isArray(script)) {
            return script.filter((part): part is string => typeof part === 'string').join('\n');
        }
        return undefined;
    }

    private resolveFlowScriptSource(suite: any, node: any): string | undefined {
        const inlineScript = this.normalizeFlowScript(node?.script);
        if (inlineScript) {
            return inlineScript;
        }
        if (typeof node?.scriptRef === 'string' && node.scriptRef.trim()) {
            return this.normalizeFlowScript(suite?.scripts?.[node.scriptRef]);
        }
        return undefined;
    }

    private async runFlowScript(
        suite: any,
        node: any,
        source: unknown,
        variables: Record<string, string>,
        environmentId: string,
        iteration: number,
        iterationCount: number
    ): Promise<Record<string, string>> {
        if (!this.scriptExecutor) {
            return variables;
        }

        const script = typeof source === 'string' ? source : this.resolveFlowScriptSource(suite, node);
        if (!script?.trim()) {
            return variables;
        }

        const context: PreRequestScriptContext = {
            request: {
                url: 'http://flow.local/node',
                method: 'GET',
                headers: {},
                query: {},
                params: {}
            },
            variables: { ...variables },
            environmentVariables: this.environmentConfigService?.getResolvedEnvironment(environmentId)?.variables || {},
            globals: this.environmentConfigService?.getGlobalVariables() || {},
            environmentName: environmentId,
            info: {
                eventName: 'prerequest',
                requestName: node?.name || node?.type || 'flow-node',
                requestId: String(node?.id || node?.name || node?.type || 'flow-node'),
                collectionName: suite?.name,
                iteration,
                iterationCount
            },
            onEnvironmentChange: (action, key, value) => {
                if (!this.environmentConfigService) return;
                if (action === 'set' && key && value !== undefined) {
                    this.environmentConfigService.setEnvironmentVariable(key, value, environmentId);
                } else if (action === 'unset' && key) {
                    this.environmentConfigService.deleteEnvironmentVariable(key, environmentId);
                } else if (action === 'clear') {
                    this.environmentConfigService.clearEnvironmentVariables(environmentId);
                }
            },
            onGlobalsChange: (action, key, value) => {
                if (!this.environmentConfigService) return;
                if (action === 'set' && key && value !== undefined) {
                    this.environmentConfigService.setGlobalVariable(key, value);
                } else if (action === 'unset' && key) {
                    this.environmentConfigService.deleteGlobalVariable(key);
                } else if (action === 'clear') {
                    this.environmentConfigService.clearGlobalVariables();
                }
            }
        };

        const session = this.scriptExecutor.createRequestSession(context);
        try {
            const result = await session.executePreRequest(script);
            if (!result.success) {
                throw new Error(result.error || 'Flow script execution failed');
            }

            if ((result as any).localVariables && typeof (result as any).localVariables === 'object') {
                // Replace with the latest local snapshot so unset/clear operations
                // are not reintroduced by older carried variables.
                return { ...(result as any).localVariables };
            }

            const mergedVariables = {
                ...(result.modifiedVariables || {}),
                ...(result.modifiedEnvironmentVariables || {})
            };

            return {
                ...variables,
                ...mergedVariables
            };
        } finally {
            session.dispose?.();
        }
    }

    private async executeFlowNodes(
        suite: any,
        nodes: any[],
        variables: Record<string, string>,
        cookieJar: ICookieJar,
        environmentId: string,
        iteration: number,
        iterationCount: number,
        totalRequests: number,
        completedCount: number,
        messenger: IWebviewMessenger,
        config: SuiteRunConfiguration,
        activeBlockLabel?: string,
        blockDepth: number = 0
    ): Promise<{ variables: Record<string, string>; completedCount: number }> {
        let currentVariables = { ...variables };
        let currentCompleted = completedCount;

        for (const node of nodes || []) {
            if (this.abortController?.signal.aborted) {
                break;
            }
            const result = await this.executeFlowNode(
                suite,
                node,
                currentVariables,
                cookieJar,
                environmentId,
                iteration,
                iterationCount,
                totalRequests,
                currentCompleted,
                messenger,
                config,
                activeBlockLabel,
                blockDepth
            );
            currentVariables = result.variables;
            currentCompleted = result.completedCount;
        }

        return { variables: currentVariables, completedCount: currentCompleted };
    }

    private async executeFlowNode(
        suite: any,
        node: any,
        variables: Record<string, string>,
        cookieJar: ICookieJar,
        environmentId: string,
        iteration: number,
        iterationCount: number,
        totalRequests: number,
        completedCount: number,
        messenger: IWebviewMessenger,
        config: SuiteRunConfiguration,
        activeBlockLabel?: string,
        blockDepth: number = 0
    ): Promise<{ variables: Record<string, string>; completedCount: number }> {
        if (!node || typeof node !== 'object' || node.enabled === false) {
            return { variables, completedCount };
        }

        if (!this.evaluateFlowCondition(node.condition, node, variables, environmentId, iteration)) {
            return { variables, completedCount };
        }

        if (node.type === 'request' && node.request) {
            const entry = this.suiteStore.resolveRequestEntry(node.request);
            if (!entry) {
                getServiceContainer().console.warn(
                    `[SuiteRunHandler] flow request unresolved name=${node.request?.name} collectionId=${node.request?.collectionId} requestId=${node.request?.requestId}`,
                    'Test Suite'
                );
                vscode.window.showWarningMessage(`Could not resolve request "${node.request?.name}" — check that its collection is loaded.`);
                return { variables, completedCount };
            }

            getServiceContainer().console.info(
                `[SuiteRunHandler] executing flow request name=${entry.suiteRequest?.name || entry.request?.name} iteration=${iteration}`,
                'Test Suite'
            );

            const result = await this.executeRequest(
                entry,
                variables,
                cookieJar,
                environmentId,
                (entry as any).folderAuthChain,
                (entry as any).collectionAuth,
                iteration,
                iterationCount
            );

            const rawFolderPath =
                entry.suiteRequest.folderPath
                || (entry as any).resolvedFolderPath
                || (entry.request as any)?.folderPath
                || '';
            const collName =
                (entry as any).resolvedCollectionName
                || entry.suiteRequest.collectionName
                || '';
            const requestFolderPath = collName
                ? (rawFolderPath ? `${collName}/${rawFolderPath}` : collName)
                : (rawFolderPath || undefined);
            const requestGroupPath = activeBlockLabel || requestFolderPath;

            return this.handleRequestExecutionResult(
                entry,
                result,
                iteration,
                totalRequests,
                completedCount,
                messenger,
                config.stopOnError,
                config.delay,
                variables,
                requestGroupPath,
                activeBlockLabel ? 'block' : 'folder'
            );
        }

        if (node.type === 'block') {
            const label = typeof node.name === 'string' ? node.name.trim() : '';
            // Any explicit block node in the suite is a user-defined grouping scope.
            // Requests directly under that block should group by its label.
            const nextBlockLabel = label || activeBlockLabel;
            return this.executeFlowNodes(
                suite,
                this.getChildNodes(node),
                variables,
                cookieJar,
                environmentId,
                iteration,
                iterationCount,
                totalRequests,
                completedCount,
                messenger,
                config,
                nextBlockLabel,
                blockDepth + 1
            );
        }

        if (node.type === 'script') {
            return {
                variables: await this.runFlowScript(suite, node, undefined, variables, environmentId, iteration, iterationCount),
                completedCount
            };
        }

        if (node.type === 'if') {
            const ifExpr = typeof node.if === 'string' ? node.if : node.condition;
            if (this.evaluateFlowCondition(ifExpr, node, variables, environmentId, iteration)) {
                return this.executeFlowNodes(suite, this.getChildNodes(node), variables, cookieJar, environmentId, iteration, iterationCount, totalRequests, completedCount, messenger, config, activeBlockLabel, blockDepth);
            }
            if (Array.isArray(node.elseif)) {
                for (const branch of node.elseif) {
                    if (this.evaluateFlowCondition(branch?.condition, branch, variables, environmentId, iteration)) {
                        return this.executeFlowNodes(suite, this.getChildNodes(branch), variables, cookieJar, environmentId, iteration, iterationCount, totalRequests, completedCount, messenger, config, activeBlockLabel, blockDepth);
                    }
                }
            }
            return this.executeFlowNodes(suite, Array.isArray(node.else) ? node.else : [], variables, cookieJar, environmentId, iteration, iterationCount, totalRequests, completedCount, messenger, config, activeBlockLabel, blockDepth);
        }

        if (node.type === 'switch') {
            const switchValue = evaluateExpression(String(node.expression ?? ''), this.createFlowExpressionContext(node, variables, environmentId, iteration));
            if (Array.isArray(node.cases)) {
                for (const caseNode of node.cases) {
                    const caseMatches = Object.prototype.hasOwnProperty.call(caseNode ?? {}, 'equals')
                        ? caseNode.equals === switchValue
                        : this.evaluateFlowCondition(caseNode?.condition, caseNode, variables, environmentId, iteration);
                    if (caseMatches) {
                        return this.executeFlowNodes(suite, this.getChildNodes(caseNode), variables, cookieJar, environmentId, iteration, iterationCount, totalRequests, completedCount, messenger, config, activeBlockLabel, blockDepth);
                    }
                }
            }
            return this.executeFlowNodes(suite, Array.isArray(node.default) ? node.default : [], variables, cookieJar, environmentId, iteration, iterationCount, totalRequests, completedCount, messenger, config, activeBlockLabel, blockDepth);
        }

        if (node.type === 'while') {
            let currentVariables = { ...variables };
            let currentCompleted = completedCount;
            const maxIterations = Math.max(1, Math.min(10_000, Number(node.maxIterations ?? 100)));
            let count = 0;
            while (this.evaluateFlowCondition(typeof node.while === 'string' ? node.while : node.condition, node, currentVariables, environmentId, iteration)) {
                count++;
                if (count > maxIterations || this.abortController?.signal.aborted) {
                    break;
                }
                const result = await this.executeFlowNodes(suite, this.getChildNodes(node), currentVariables, cookieJar, environmentId, iteration, iterationCount, totalRequests, currentCompleted, messenger, config, activeBlockLabel, blockDepth);
                currentVariables = result.variables;
                currentCompleted = result.completedCount;
            }
            return { variables: currentVariables, completedCount: currentCompleted };
        }

        if (node.type === 'for') {
            let currentVariables = { ...variables };
            let currentCompleted = completedCount;
            const maxIterations = Math.max(1, Math.min(10_000, Number(node.maxIterations ?? 100)));
            currentVariables = await this.runFlowScript(suite, node, this.normalizeFlowScript(node.init), currentVariables, environmentId, iteration, iterationCount);
            getServiceContainer().console.info(
                `[SuiteRunHandler] for-init name=${node?.name || 'For'} i=${String(deserializeTypedValue(currentVariables?.i))} maxIterations=${maxIterations}`,
                'Test Suite'
            );
            const conditionExpr = typeof node.loopCondition === 'string' && node.loopCondition.trim()
                ? node.loopCondition
                : typeof node.condition === 'string' && node.condition.trim()
                    ? node.condition
                    : 'true';
            let count = 0;
            while (this.evaluateFlowCondition(conditionExpr, node, currentVariables, environmentId, iteration)) {
                count++;
                getServiceContainer().console.info(
                    `[SuiteRunHandler] for-loop-enter name=${node?.name || 'For'} loopIndex=${count} i=${String(deserializeTypedValue(currentVariables?.i))}`,
                    'Test Suite'
                );
                if (count > maxIterations || this.abortController?.signal.aborted) {
                    break;
                }
                const result = await this.executeFlowNodes(suite, this.getChildNodes(node), currentVariables, cookieJar, environmentId, iteration, iterationCount, totalRequests, currentCompleted, messenger, config, activeBlockLabel, blockDepth);
                currentVariables = result.variables;
                currentCompleted = result.completedCount;
                currentVariables = await this.runFlowScript(suite, node, this.normalizeFlowScript(node.update), currentVariables, environmentId, iteration, iterationCount);
                getServiceContainer().console.info(
                    `[SuiteRunHandler] for-loop-update name=${node?.name || 'For'} loopIndex=${count} i=${String(deserializeTypedValue(currentVariables?.i))}`,
                    'Test Suite'
                );
            }
            getServiceContainer().console.info(
                `[SuiteRunHandler] for-loop-exit name=${node?.name || 'For'} completedLoops=${count} i=${String(deserializeTypedValue(currentVariables?.i))}`,
                'Test Suite'
            );
            return { variables: currentVariables, completedCount: currentCompleted };
        }

        return this.executeFlowNodes(suite, this.getChildNodes(node), variables, cookieJar, environmentId, iteration, iterationCount, totalRequests, completedCount, messenger, config, activeBlockLabel, blockDepth);
    }

    private async handleRequestExecutionResult(
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
        const effectiveGroupPath: string = groupPath !== undefined
            ? groupPath
            : (() => {
                if (result.groupPath) return result.groupPath;
                if (result.folderPath) return result.folderPath;
                const rawPath =
                    entry.suiteRequest.folderPath
                    || (entry as any).resolvedFolderPath
                    || (entry.request as any)?.folderPath
                    || '';
                const collName =
                    (entry as any).resolvedCollectionName
                    || entry.suiteRequest.collectionName
                    || '';
                return collName
                    ? (rawPath ? `${collName}/${rawPath}` : collName)
                    : rawPath;
            })();
        const effectiveGroupType = groupType ?? result.groupType ?? (effectiveGroupPath ? 'folder' : undefined);
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
            total: totalRequests,
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
