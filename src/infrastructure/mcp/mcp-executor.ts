/**
 * MCP Executor
 *
 * Implements the three tool-call types:
 *   request__<colId>__<reqId>  — execute a single request
 *   collection__<colId>        — run an entire collection sequentially (supports iterations)
 *   suite__<suiteId>           — run a test suite (supports iterations)
 *
 * Both collections and suites use the unified executeSuite() method which:
 *   - Supports configurable iterations for stability testing
 *   - Generates HTML reports
 *   - Returns results in consistent JSON format
 *   - Preserves scripts, auth, cookies, and variable resolution identically to UI flow
 */

import {
    buildPromptResult,
    CACHE_BUSTING_TOOLS,
    runCollection as coreRunCollection,
    runRequest as coreRunRequest,
    runSuite as coreRunSuite,
    dispatchGenericTool,
    flattenRequests,
    GENERIC_TOOL_NAMES,
    ICollectionService,
    IEnvironmentConfigService,
    ITestSuiteService,
    MCP_PROMPTS,
    McpRunStore,
    parseMcpToolName,
    resolveFolderToken,
    resolveToken,
    type Collection,
    type GenericToolName,
    type IConfigService,
    type McpDispatchServices,
    type McpPromptDef,
    type McpRunCallbacks,
    type PromptResult,
    type RunCollectionOptions,
    type RunSuiteOptions,
} from '@http-forge/core';
import type { McpToolRegistry } from './mcp-tool-registry';

// ─── Executor ─────────────────────────────────────────────────────────────

export class McpExecutor {
    private readonly runStore = new McpRunStore();

    constructor(
        private readonly collectionService: ICollectionService,
        private readonly envConfigService: IEnvironmentConfigService,
        private readonly testSuiteService: ITestSuiteService,
        private readonly configService: IConfigService,
        private readonly registry: McpToolRegistry
    ) {}

    async call(toolName: string, args: Record<string, any>): Promise<string> {
        const prefix = this.configService.getMcpConfig().toolPrefix ?? '';
        const bare = prefix && toolName.startsWith(prefix) ? toolName.slice(prefix.length) : toolName;

        if ((Object.values(GENERIC_TOOL_NAMES) as string[]).includes(bare)) {
            return JSON.stringify(await this.callGeneric(bare as GenericToolName, args), null, 2);
        }

        const parsed = parseMcpToolName(bare);
        switch (parsed.kind) {
            case 'request':
                return JSON.stringify(await this.executeRequest(parsed.tokens, args), null, 2);
            case 'collection':
                return JSON.stringify(await this.runCollection(parsed.tokens, args), null, 2);
            case 'folder':
                return JSON.stringify(await this.runFolder(parsed.tokens, args), null, 2);
            case 'suite':
                return JSON.stringify(await this.runTestSuite(parsed.tokens, args), null, 2);
        }
    }

    /** Return the list of available MCP prompts. */
    getPromptList(): McpPromptDef[] {
        return MCP_PROMPTS;
    }

    /** Build a prompt result for the given prompt name and arguments. */
    async callPrompt(name: string, args: Record<string, string>): Promise<PromptResult> {
        return buildPromptResult(name, args, this.collectionService, this.runStore);
    }

    /**
     * Dispatch a generic (argument-selected) MCP tool by delegating to
     * dispatchGenericTool from @http-forge/core, then busting the tool-list
     * cache when the tool modifies collection / suite structure.
     */
    private async callGeneric(tool: GenericToolName, args: Record<string, any>): Promise<object> {
        const services: McpDispatchServices = {
            collection: this.collectionService,
            testSuite: this.testSuiteService,
            environmentConfig: this.envConfigService,
            workspaceFolder: this.configService.getWorkspacePath(),
        };
        const callbacks: McpRunCallbacks = {
            runRequest: (col, requestId, runArgs) =>
                this.executeRequest([col.id, requestId], runArgs as Record<string, any>),
            runFolder: (col, folderPath, runArgs) =>
                this.runFolder([col.id, folderPath], runArgs as Record<string, any>),
            runCollection: (col, runArgs) =>
                this.runCollection([col.id], runArgs as Record<string, any>),
            runSuite: (suiteId, _suiteName, runArgs) =>
                this.runTestSuite([suiteId], runArgs as Record<string, any>),
        };
        const result = await dispatchGenericTool(tool, args, services, this.runStore, callbacks);
        if (CACHE_BUSTING_TOOLS.has(tool)) {
            this.registry.invalidateCache();
        }
        return result as object;
    }
    /** Resolve a collection token (hash or legacy raw id) to a collection. */
    private resolveCollection(token: string): Collection {
        const collections = this.collectionService.getAllCollections();
        const colId = resolveToken(token, collections.map(c => c.id));
        const collection = colId ? collections.find(c => c.id === colId) : undefined;
        if (!collection) throw new Error(`Collection not found for tool token "${token}"`);
        return collection;
    }

    // ── Single request ──────────────────────────────────────────────────

    private async executeRequest(tokens: string[], args: Record<string, any>): Promise<object> {
        const [colToken, reqToken] = tokens;
        const collection = this.resolveCollection(colToken);
        const workspaceFolder = this.configService.getWorkspacePath();
        const sessionVars = this.envConfigService.getEnvironmentVariableLocals();
        const variables = { ...sessionVars, ...(args.variables ?? {}) };

        const requestId = resolveToken(reqToken, flattenRequests(collection).map(f => f.request.id));
        if (!requestId) throw new Error(`Request not found in collection "${collection.name}"`);

        return coreRunRequest({
            workspaceFolder,
            collectionId: collection.id,
            requestId,
            environment: args.environment,
            variables,
            headers: args.headers,
            query: args.query,
            body: args.body,
            include: args.include,
            reporters: args.reporters,
        }) as Promise<object>;
    }

    // ── Entire collection ───────────────────────────────────────────────
    // Refactored to use shared suite execution logic for consistency with UI

    private async runCollection(tokens: string[], args: Record<string, any>): Promise<object> {
        const collection = this.resolveCollection(tokens[0]);
        const workspaceFolder = this.configService.getWorkspacePath();
        const sessionVars = this.envConfigService.getEnvironmentVariableLocals();
        const variables = { ...sessionVars, ...(args.variables ?? {}) };

        if (args.async === true) {
            return this.startAsyncCoreRun(collection.name, args,
                flattenRequests(collection).length,
                (opts) => coreRunCollection({ ...opts, collectionId: collection.id, collectionRef: collection.name }),
                workspaceFolder, variables);
        }

        return coreRunCollection({
            workspaceFolder,
            collectionId: collection.id,
            collectionRef: collection.name,
            environment: args.environment,
            iterations: args.iterations,
            concurrency: args.concurrency,
            delay: args.delay,
            stopOnError: args.stopOnError,
            include: args.include,
            variables,
        }) as Promise<object>;
    }

    // ── Single folder within a collection ───────────────────────────────

    private async runFolder(tokens: string[], args: Record<string, any>): Promise<object> {
        const [colToken, folderToken] = tokens;
        const collection = this.resolveCollection(colToken);
        const workspaceFolder = this.configService.getWorkspacePath();
        const sessionVars = this.envConfigService.getEnvironmentVariableLocals();
        const variables = { ...sessionVars, ...(args.variables ?? {}) };

        const folderPaths = this.registry.enumerateFolders(collection).map(f => f.folderPath);
        const folderPath = resolveFolderToken(folderToken, folderPaths);
        if (!folderPath) {
            throw new Error(`Folder not found in collection "${collection.name}"`);
        }

        const recursive = args.recursive !== false;
        const target = folderPath.replace(/\/+$/, '');
        const scopedCount = flattenRequests(collection).filter(({ folderPath: fp }) =>
            recursive ? fp === target || fp.startsWith(`${target}/`) : fp === target
        ).length;

        if (scopedCount === 0) {
            throw new Error(
                `No requests found under folder "${folderPath}" in collection "${collection.name}"`
            );
        }

        const label = `${collection.name} / ${target}`;

        if (args.async === true) {
            return this.startAsyncCoreRun(label, args, scopedCount,
                (opts) => coreRunCollection({ ...opts, collectionId: collection.id, folderPath: target, recursive }),
                workspaceFolder, variables);
        }

        return coreRunCollection({
            workspaceFolder,
            collectionId: collection.id,
            folderPath: target,
            recursive,
            environment: args.environment,
            iterations: args.iterations,
            concurrency: args.concurrency,
            delay: args.delay,
            stopOnError: args.stopOnError,
            include: args.include,
            variables,
        }) as Promise<object>;
    }

    // ── Test suite ──────────────────────────────────────────────────────

    private async runTestSuite(tokens: string[], args: Record<string, any>): Promise<object> {
        const suites = await this.testSuiteService.getAllSuites();
        const suiteId = resolveToken(tokens[0], suites.map(s => s.id));
        const suite = suiteId ? await this.testSuiteService.getSuite(suiteId) : undefined;
        if (!suite) throw new Error(`Test suite not found for tool token "${tokens[0]}"`);

        const workspaceFolder = this.configService.getWorkspacePath();
        const sessionVars = this.envConfigService.getEnvironmentVariableLocals();
        const variables = { ...sessionVars, ...(args.variables ?? {}) };

        if (args.async === true) {
            return this.startAsyncCoreRun(suite.name, args,
                suite.requests.length,
                (opts) => coreRunSuite({ ...opts, suiteId: suite.id }),
                workspaceFolder, variables);
        }

        return coreRunSuite({
            workspaceFolder,
            suiteId: suite.id,
            environment: args.environment,
            iterations: args.iterations,
            concurrency: args.concurrency,
            delay: args.delay,
            stopOnError: args.stopOnError,
            requestFilter: args.requestFilter,
            include: args.include,
            variables,
        }) as Promise<object>;
    }

    /**
     * Fire-and-forget wrapper for async core runs. Creates a run record in the
     * McpRunStore, starts the core function in the background, and returns the
     * run id immediately so the caller can poll via get_run_status.
     */
    private startAsyncCoreRun(
        label: string,
        args: Record<string, any>,
        baseRequestCount: number,
        run: (baseOpts: Pick<RunCollectionOptions & RunSuiteOptions, 'workspaceFolder' | 'environment' | 'iterations' | 'concurrency' | 'delay' | 'stopOnError' | 'requestFilter' | 'include' | 'variables'>) => Promise<unknown>,
        workspaceFolder: string,
        variables: Record<string, string>
    ): object {
        this.runStore.prune();
        const iterations: number = args.iterations ?? 1;
        const total = baseRequestCount * iterations;
        const record = this.runStore.create(label, total);

        run({
            workspaceFolder,
            environment: args.environment,
            iterations,
            concurrency: args.concurrency,
            delay: args.delay,
            stopOnError: args.stopOnError,
            requestFilter: args.requestFilter,
            include: args.include,
            variables,
        }).then((result: any) => {
            if (record.status === 'cancelled') return;
            record.status = 'completed';
            record.completedAt = Date.now();
            record.summary = result?.summary ?? record.summary;
            record.allResults = result?.results ?? [];
            record.failedRequests = result?.failedRequests ?? [];
            record.reportPath = result?.report?.uri?.replace('file://', '') ?? null;
            record.progress = { completed: total, total };
        }).catch((err: Error) => {
            if (record.status === 'cancelled') return;
            record.status = 'failed';
            record.completedAt = Date.now();
            record.error = err.message;
        });

        return { runId: record.id, status: 'running', total, message: 'Run started. Use get_run_status to poll.' };
    }
}
