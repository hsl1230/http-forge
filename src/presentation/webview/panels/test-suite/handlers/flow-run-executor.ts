/**
 * Flow Run Executor
 *
 * Interprets the test-suite node graph (request / block / script / if / switch /
 * while / for) for the suite run handler. Depends only on a narrow `FlowRunRuntime`
 * contract (request execution, result handling, estimation feedback, logging), so it
 * stays free of direct `vscode` imports and can be exercised in isolation.
 */

import type {
    ICookieJar,
    IEnvironmentConfigService,
    IScriptExecutor,
    ITestSuiteStore,
    PreRequestScriptContext,
    RequestAuth,
    SuiteRequestEntry,
} from '@http-forge/core';
import { deserializeTypedRecord, deserializeTypedValue, evaluateExpression, resolveResultGrouping } from '@http-forge/core';
import { ExecutionResult } from '../../../../../shared/types';
import { IWebviewMessenger } from '../../../shared-interfaces';
import { SuiteRunConfiguration } from '../interfaces';

/**
 * The slice of the run handler that the flow executor needs. Injected so the
 * executor never reaches for globals (vscode, service container) directly.
 */
export interface FlowRunRuntime {
    readonly suiteStore: ITestSuiteStore;
    readonly environmentConfigService?: IEnvironmentConfigService;
    readonly scriptExecutor?: IScriptExecutor;

    isAborted(): boolean;
    getCurrentEstimatedTotal(): number;
    adjustEstimatedTotal(plannedCount: number, actualCount: number, completedCount: number): void;
    logInfo(message: string): void;
    logWarn(message: string): void;
    showWarning(message: string): void;

    executeRequest(
        entry: SuiteRequestEntry,
        variables: Record<string, string>,
        cookieJar: ICookieJar,
        environment: string,
        folderAuthChain: RequestAuth[],
        collectionAuth?: RequestAuth,
        iteration?: number,
        iterationCount?: number
    ): Promise<ExecutionResult>;

    handleRequestExecutionResult(
        entry: SuiteRequestEntry,
        result: ExecutionResult,
        iteration: number,
        totalRequests: number,
        completedCount: number,
        messenger: IWebviewMessenger,
        stopOnError: boolean,
        delayMs: number,
        variables: Record<string, string>,
        groupPath?: string,
        groupType?: 'folder' | 'block'
    ): Promise<{ variables: Record<string, string>; completedCount: number }>;
}

export class FlowRunExecutor {
    constructor(private readonly runtime: FlowRunRuntime) {}

    /**
     * Estimate the number of enabled request nodes in a node tree. Used for
     * progress reporting before a run starts and for branch planning during it.
     */
    estimateEnabledRequestNodes(nodes: any[], config: SuiteRunConfiguration): number {
        let count = 0;
        for (const node of nodes || []) {
            if (!node || typeof node !== 'object' || node.enabled === false) {
                continue;
            }
            if (node.type === 'request' && node.request) {
                count++;
                continue;
            }

            if (node.type === 'if') {
                const thenNodes = Array.isArray(node.then) ? node.then : this.getChildNodes(node);
                const branchCounts: number[] = [this.estimateEnabledRequestNodes(thenNodes, config)];
                if (Array.isArray(node.elseif)) {
                    for (const branch of node.elseif) {
                        branchCounts.push(this.estimateEnabledRequestNodes(this.getChildNodes(branch), config));
                    }
                }
                const elseNodes = Array.isArray(node.else) ? node.else : [];
                branchCounts.push(this.estimateEnabledRequestNodes(elseNodes, config));
                count += Math.max(...branchCounts, 0);
                continue;
            }

            if (node.type === 'switch') {
                const branchCounts: number[] = [];
                if (Array.isArray(node.cases)) {
                    for (const caseNode of node.cases) {
                        branchCounts.push(this.estimateEnabledRequestNodes(this.getChildNodes(caseNode), config));
                    }
                }
                const defaultNodes = Array.isArray(node.default) ? node.default : [];
                branchCounts.push(this.estimateEnabledRequestNodes(defaultNodes, config));
                count += Math.max(...branchCounts, 0);
                continue;
            }

            if (node.type === 'for' || node.type === 'while') {
                const perLoop = this.estimateEnabledRequestNodes(this.getChildNodes(node), config);
                count += perLoop * this.estimateLoopIterations(node);
                continue;
            }

            count += this.estimateEnabledRequestNodes(this.getChildNodes(node), config);
        }
        return count;
    }

    estimateLoopIterations(node: any): number {
        const configured = Number(node?.maxIterations);
        if (Number.isFinite(configured) && configured > 0) {
            return Math.max(1, Math.min(10_000, Math.floor(configured)));
        }
        return 1;
    }

    async executeFlowNodes(
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
            if (this.runtime.isAborted()) {
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

    async executeFlowNode(
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
            const entry = this.runtime.suiteStore.resolveRequestEntry(node.request);
            if (!entry) {
                this.runtime.logWarn(
                    `[FlowRunExecutor] flow request unresolved name=${node.request?.name} collectionId=${node.request?.collectionId} requestId=${node.request?.requestId}`
                );
                this.runtime.showWarning(`Could not resolve request "${node.request?.name}" — check that its collection is loaded.`);
                return { variables, completedCount };
            }

            this.runtime.logInfo(
                `[FlowRunExecutor] executing flow request name=${entry.suiteRequest?.name || entry.request?.name} iteration=${iteration}`
            );

            const result = await this.runtime.executeRequest(
                entry,
                variables,
                cookieJar,
                environmentId,
                (entry as any).folderAuthChain,
                (entry as any).collectionAuth,
                iteration,
                iterationCount
            );

            const requestGrouping = resolveResultGrouping({
                collectionName: (entry as any).resolvedCollectionName || entry.suiteRequest.collectionName || '',
                folderPath: entry.suiteRequest.folderPath || (entry as any).resolvedFolderPath || (entry.request as any)?.folderPath || '',
                blockLabel: activeBlockLabel || undefined
            });
            const requestGroupPath = requestGrouping.groupPath || undefined;

            return this.runtime.handleRequestExecutionResult(
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
            const thenNodes = Array.isArray(node.then) ? node.then : this.getChildNodes(node);
            const elseNodes = Array.isArray(node.else) ? node.else : [];
            const branchCounts: number[] = [this.estimateEnabledRequestNodes(thenNodes, config)];
            if (Array.isArray(node.elseif)) {
                for (const branch of node.elseif) {
                    branchCounts.push(this.estimateEnabledRequestNodes(this.getChildNodes(branch), config));
                }
            }
            branchCounts.push(this.estimateEnabledRequestNodes(elseNodes, config));
            const plannedCount = Math.max(...branchCounts, 0);

            const ifExpr = typeof node.if === 'string' ? node.if : node.condition;
            if (this.evaluateFlowCondition(ifExpr, node, variables, environmentId, iteration)) {
                const actualCount = this.estimateEnabledRequestNodes(thenNodes, config);
                this.runtime.adjustEstimatedTotal(plannedCount, actualCount, completedCount);
                return this.executeFlowNodes(suite, thenNodes, variables, cookieJar, environmentId, iteration, iterationCount, this.runtime.getCurrentEstimatedTotal(), completedCount, messenger, config, activeBlockLabel, blockDepth);
            }
            if (Array.isArray(node.elseif)) {
                for (const branch of node.elseif) {
                    if (this.evaluateFlowCondition(branch?.condition, branch, variables, environmentId, iteration)) {
                        const selectedNodes = this.getChildNodes(branch);
                        const actualCount = this.estimateEnabledRequestNodes(selectedNodes, config);
                        this.runtime.adjustEstimatedTotal(plannedCount, actualCount, completedCount);
                        return this.executeFlowNodes(suite, selectedNodes, variables, cookieJar, environmentId, iteration, iterationCount, this.runtime.getCurrentEstimatedTotal(), completedCount, messenger, config, activeBlockLabel, blockDepth);
                    }
                }
            }
            const actualCount = this.estimateEnabledRequestNodes(elseNodes, config);
            this.runtime.adjustEstimatedTotal(plannedCount, actualCount, completedCount);
            return this.executeFlowNodes(suite, elseNodes, variables, cookieJar, environmentId, iteration, iterationCount, this.runtime.getCurrentEstimatedTotal(), completedCount, messenger, config, activeBlockLabel, blockDepth);
        }

        if (node.type === 'switch') {
            const defaultNodes = Array.isArray(node.default) ? node.default : [];
            const branchCounts: number[] = [];
            if (Array.isArray(node.cases)) {
                for (const caseNode of node.cases) {
                    branchCounts.push(this.estimateEnabledRequestNodes(this.getChildNodes(caseNode), config));
                }
            }
            branchCounts.push(this.estimateEnabledRequestNodes(defaultNodes, config));
            const plannedCount = Math.max(...branchCounts, 0);

            const switchValue = evaluateExpression(String(node.expression ?? ''), this.createFlowExpressionContext(node, variables, environmentId, iteration));
            if (Array.isArray(node.cases)) {
                for (const caseNode of node.cases) {
                    const caseMatches = Object.prototype.hasOwnProperty.call(caseNode ?? {}, 'equals')
                        ? caseNode.equals === switchValue
                        : this.evaluateFlowCondition(caseNode?.condition, caseNode, variables, environmentId, iteration);
                    if (caseMatches) {
                        const selectedNodes = this.getChildNodes(caseNode);
                        const actualCount = this.estimateEnabledRequestNodes(selectedNodes, config);
                        this.runtime.adjustEstimatedTotal(plannedCount, actualCount, completedCount);
                        return this.executeFlowNodes(suite, selectedNodes, variables, cookieJar, environmentId, iteration, iterationCount, this.runtime.getCurrentEstimatedTotal(), completedCount, messenger, config, activeBlockLabel, blockDepth);
                    }
                }
            }
            const actualCount = this.estimateEnabledRequestNodes(defaultNodes, config);
            this.runtime.adjustEstimatedTotal(plannedCount, actualCount, completedCount);
            return this.executeFlowNodes(suite, defaultNodes, variables, cookieJar, environmentId, iteration, iterationCount, this.runtime.getCurrentEstimatedTotal(), completedCount, messenger, config, activeBlockLabel, blockDepth);
        }

        if (node.type === 'while') {
            let currentVariables = { ...variables };
            let currentCompleted = completedCount;
            const maxIterations = Math.max(1, Math.min(10_000, Number(node.maxIterations ?? 100)));
            const perLoopEstimate = this.estimateEnabledRequestNodes(this.getChildNodes(node), config);
            const plannedIterations = this.estimateLoopIterations(node);
            const plannedCount = perLoopEstimate * plannedIterations;
            let executedLoops = 0;
            let count = 0;
            while (this.evaluateFlowCondition(typeof node.while === 'string' ? node.while : node.condition, node, currentVariables, environmentId, iteration)) {
                count++;
                if (count > maxIterations || this.runtime.isAborted()) {
                    break;
                }
                const result = await this.executeFlowNodes(suite, this.getChildNodes(node), currentVariables, cookieJar, environmentId, iteration, iterationCount, this.runtime.getCurrentEstimatedTotal(), currentCompleted, messenger, config, activeBlockLabel, blockDepth);
                currentVariables = result.variables;
                currentCompleted = result.completedCount;
                executedLoops++;
            }
            const actualCount = perLoopEstimate * executedLoops;
            this.runtime.adjustEstimatedTotal(plannedCount, actualCount, currentCompleted);
            return { variables: currentVariables, completedCount: currentCompleted };
        }

        if (node.type === 'for') {
            let currentVariables = { ...variables };
            let currentCompleted = completedCount;
            const maxIterations = Math.max(1, Math.min(10_000, Number(node.maxIterations ?? 100)));
            const perLoopEstimate = this.estimateEnabledRequestNodes(this.getChildNodes(node), config);
            const plannedIterations = this.estimateLoopIterations(node);
            const plannedCount = perLoopEstimate * plannedIterations;
            currentVariables = await this.runFlowScript(suite, node, this.normalizeFlowScript(node.init), currentVariables, environmentId, iteration, iterationCount);
            this.runtime.logInfo(
                `[FlowRunExecutor] for-init name=${node?.name || 'For'} i=${String(deserializeTypedValue(currentVariables?.i))} maxIterations=${maxIterations}`
            );
            const conditionExpr = typeof node.loopCondition === 'string' && node.loopCondition.trim()
                ? node.loopCondition
                : typeof node.condition === 'string' && node.condition.trim()
                    ? node.condition
                    : 'true';
            let count = 0;
            let executedLoops = 0;
            while (this.evaluateFlowCondition(conditionExpr, node, currentVariables, environmentId, iteration)) {
                count++;
                this.runtime.logInfo(
                    `[FlowRunExecutor] for-loop-enter name=${node?.name || 'For'} loopIndex=${count} i=${String(deserializeTypedValue(currentVariables?.i))}`
                );
                if (count > maxIterations || this.runtime.isAborted()) {
                    break;
                }
                const result = await this.executeFlowNodes(suite, this.getChildNodes(node), currentVariables, cookieJar, environmentId, iteration, iterationCount, this.runtime.getCurrentEstimatedTotal(), currentCompleted, messenger, config, activeBlockLabel, blockDepth);
                currentVariables = result.variables;
                currentCompleted = result.completedCount;
                executedLoops++;
                currentVariables = await this.runFlowScript(suite, node, this.normalizeFlowScript(node.update), currentVariables, environmentId, iteration, iterationCount);
                this.runtime.logInfo(
                    `[FlowRunExecutor] for-loop-update name=${node?.name || 'For'} loopIndex=${count} i=${String(deserializeTypedValue(currentVariables?.i))}`
                );
            }
            this.runtime.logInfo(
                `[FlowRunExecutor] for-loop-exit name=${node?.name || 'For'} completedLoops=${count} i=${String(deserializeTypedValue(currentVariables?.i))}`
            );
            const actualCount = perLoopEstimate * executedLoops;
            this.runtime.adjustEstimatedTotal(plannedCount, actualCount, currentCompleted);
            return { variables: currentVariables, completedCount: currentCompleted };
        }

        return this.executeFlowNodes(suite, this.getChildNodes(node), variables, cookieJar, environmentId, iteration, iterationCount, totalRequests, completedCount, messenger, config, activeBlockLabel, blockDepth);
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
            get: (key: string) => deserializeTypedValue(this.runtime.environmentConfigService?.getResolvedEnvironment(environmentId)?.variables?.[key]),
            set: (key: string, value: unknown) => {
                if (this.runtime.environmentConfigService && typeof key === 'string' && key.trim()) {
                    this.runtime.environmentConfigService.setEnvironmentVariable(key, value == null ? '' : String(value), environmentId);
                }
            }
        };

        const globalsApi = {
            get: (key: string) => deserializeTypedValue(this.runtime.environmentConfigService?.getGlobalVariables()?.[key]),
            set: (key: string, value: unknown) => {
                if (this.runtime.environmentConfigService && typeof key === 'string' && key.trim()) {
                    this.runtime.environmentConfigService.setGlobalVariable(key, value == null ? '' : String(value));
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
            this.runtime.logInfo(
                `[FlowRunExecutor] evaluateFlowCondition type=${node?.type} name=${node?.name || 'unnamed'} expr="${expression}" value=${String(value)} i=${String(deserializeTypedValue(variables?.i))}`
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
        if (!this.runtime.scriptExecutor) {
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
            environmentVariables: this.runtime.environmentConfigService?.getResolvedEnvironment(environmentId)?.variables || {},
            globals: this.runtime.environmentConfigService?.getGlobalVariables() || {},
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
                if (!this.runtime.environmentConfigService) return;
                if (action === 'set' && key && value !== undefined) {
                    this.runtime.environmentConfigService.setEnvironmentVariable(key, value, environmentId);
                } else if (action === 'unset' && key) {
                    this.runtime.environmentConfigService.deleteEnvironmentVariable(key, environmentId);
                } else if (action === 'clear') {
                    this.runtime.environmentConfigService.clearEnvironmentVariables(environmentId);
                }
            },
            onGlobalsChange: (action, key, value) => {
                if (!this.runtime.environmentConfigService) return;
                if (action === 'set' && key && value !== undefined) {
                    this.runtime.environmentConfigService.setGlobalVariable(key, value);
                } else if (action === 'unset' && key) {
                    this.runtime.environmentConfigService.deleteGlobalVariable(key);
                } else if (action === 'clear') {
                    this.runtime.environmentConfigService.clearGlobalVariables();
                }
            }
        };

        const session = this.runtime.scriptExecutor.createRequestSession(context);
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
}
