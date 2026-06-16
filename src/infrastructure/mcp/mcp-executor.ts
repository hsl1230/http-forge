/**
 * MCP Executor
 *
 * Implements the three tool-call types:
 *   request__<colId>__<reqId>  — execute a single request
 *   collection__<colId>        — run an entire collection sequentially
 *   suite__<suiteId>           — run a test suite
 *
 * All execution goes through the existing CollectionRequestExecutor so scripts,
 * auth, cookie jars, and variable resolution work identically to the UI flow.
 */

import {
    CollectionRequestExecutor,
    ICollectionService,
    IEnvironmentConfigService,
    IHttpRequestService,
    InMemoryCookieJar,
    IRequestPreparer,
    IResultStorageService,
    IScriptExecutor,
    ITestSuiteService,
    ResultStorageService,
    type Collection,
    type CollectionFolderItem,
    type CollectionItem,
    type CollectionRequest,
    type CollectionRequestItem,
    type ExecutionRequest,
    type ExecutionResult,
    type IConfigService,
    type RequestScripts,
} from '@http-forge/core';
import type { McpToolRegistry } from './mcp-tool-registry';

// ─── Result formatting ─────────────────────────────────────────────────────

function tryParseJson(val: unknown): unknown {
    if (typeof val !== 'string') return val;
    try { return JSON.parse(val); } catch { return val; }
}

function formatSingleResult(result: ExecutionResult, include: string[] = []): object {
    const r = result.response;
    const out: Record<string, unknown> = {
        status: r.status,
        ok: r.status >= 200 && r.status < 300,
        duration: `${result.duration}ms`,
        body: tryParseJson(r.body),
    };

    if (result.error) out.error = result.error;

    if (Object.keys(result.modifiedVariables ?? {}).length) {
        out.modifiedVariables = result.modifiedVariables;
    }

    if (include.includes('headers')) {
        const headers = { ...r.headers } as Record<string, unknown>;
        delete headers['set-cookie'];
        out.headers = headers;
    }

    if (include.includes('cookies')) {
        out.cookies = r.cookies?.map(c => ({ name: c.name, value: c.value })) ?? [];
    }

    if (include.includes('tests')) {
        out.tests = result.assertions?.map(a => ({
            name: a.name,
            passed: a.passed,
            ...(a.message ? { message: a.message } : {})
        }));
        out.allPassed = result.passed;
    } else if (result.assertions?.length) {
        out.allPassed = result.passed;
        if (!result.passed) {
            out.failedTests = result.assertions.filter(a => !a.passed).map(a => a.name);
        }
    }

    if (include.includes('consoleOutput') && result.consoleOutput?.length) {
        out.consoleOutput = result.consoleOutput;
    }

    return out;
}

// ─── Request helpers ───────────────────────────────────────────────────────

function toExecutionRequest(req: CollectionRequest): ExecutionRequest {
    const allowedAuthTypes = ['none', 'inherit', 'basic', 'bearer', 'apikey', 'oauth2'] as const;
    const authType = (req.auth?.type && (allowedAuthTypes as readonly string[]).includes(req.auth.type))
        ? (req.auth.type as 'none' | 'inherit' | 'basic' | 'bearer' | 'apikey' | 'oauth2')
        : undefined;

    return {
        id: req.id,
        name: req.name,
        method: req.method,
        url: req.url,
        headers: Array.isArray(req.headers)
            ? req.headers.reduce<Record<string, string>>((acc, h) => {
                if (h.enabled && h.key) acc[h.key] = h.value ?? '';
                return acc;
            }, {})
            : req.headers as Record<string, string> | undefined,
        query: Array.isArray(req.query)
            ? req.query.reduce<Record<string, string>>((acc, p) => {
                if (p.enabled && p.key) acc[p.key] = p.value ?? '';
                return acc;
            }, {})
            : req.query as Record<string, string> | undefined,
        params: req.params
            ? Object.entries(req.params).reduce<Record<string, string>>((acc, [key, value]) => {
                acc[key] = typeof value === 'string' ? value : ((value as any).value ?? '');
                return acc;
            }, {})
            : undefined,
        body: req.body ?? null,
        scripts: req.scripts,
        settings: req.settings,
        auth: {
            type: authType === 'inherit' ? 'none' : authType,
            bearerToken: req.auth?.bearerToken,
            basicAuth: req.auth?.basicAuth,
            apikey: req.auth?.apikey,
            oauth2: req.auth?.oauth2
        }
    };
}

function applyOverrides(
    base: ExecutionRequest,
    args: Record<string, any>
): ExecutionRequest {
    const overridden = { ...base };

    if (args.headers) {
        overridden.headers = { ...(base.headers ?? {}), ...args.headers };
    }
    if (args.query) {
        overridden.query = args.query;
    }
    if (args.body !== undefined) {
        overridden.body = { type: 'raw', raw: args.body, contentType: 'application/json' } as any;
    }

    return overridden;
}

function findRequestInCollection(
    collection: Collection,
    requestId: string,
    items: CollectionItem[] = collection.items,
    folderChain: RequestScripts[] = []
): { request: CollectionRequestItem; folderScriptsChain: RequestScripts[] } | undefined {
    for (const item of items) {
        if (item.type === 'request' && item.id === requestId) {
            return { request: item as CollectionRequestItem, folderScriptsChain: [...folderChain] };
        }
        if (item.type === 'folder') {
            const folder = item as CollectionFolderItem;
            const next = folder.scripts ? [...folderChain, folder.scripts] : [...folderChain];
            const found = findRequestInCollection(collection, requestId, folder.items ?? [], next);
            if (found) return found;
        }
    }
    return undefined;
}

function flattenCollection(
    collection: Collection,
    items: CollectionItem[] = collection.items,
    folderChain: RequestScripts[] = []
): Array<{ request: CollectionRequestItem; folderScriptsChain: RequestScripts[] }> {
    const result: Array<{ request: CollectionRequestItem; folderScriptsChain: RequestScripts[] }> = [];
    for (const item of items) {
        if (item.type === 'request') {
            result.push({ request: item as CollectionRequestItem, folderScriptsChain: [...folderChain] });
        } else {
            const folder = item as CollectionFolderItem;
            const next = folder.scripts ? [...folderChain, folder.scripts] : [...folderChain];
            result.push(...flattenCollection(collection, folder.items ?? [], next));
        }
    }
    return result;
}

// ─── Executor ─────────────────────────────────────────────────────────────

export class McpExecutor {
    constructor(
        private readonly collectionService: ICollectionService,
        private readonly envConfigService: IEnvironmentConfigService,
        private readonly httpService: IHttpRequestService,
        private readonly scriptExecutor: IScriptExecutor,
        private readonly requestPreparer: IRequestPreparer,
        private readonly testSuiteService: ITestSuiteService,
        private readonly configService: IConfigService,
        private readonly registry: McpToolRegistry
    ) {}

    async call(toolName: string, args: Record<string, any>): Promise<string> {
        if (toolName.startsWith('request__')) {
            return JSON.stringify(await this.executeRequest(toolName, args), null, 2);
        }
        if (toolName.startsWith('collection__')) {
            return JSON.stringify(await this.runCollection(toolName, args), null, 2);
        }
        if (toolName.startsWith('suite__')) {
            return JSON.stringify(await this.runTestSuite(toolName, args), null, 2);
        }
        throw new Error(`Unknown tool: ${toolName}`);
    }

    // ── Single request ──────────────────────────────────────────────────

    private async executeRequest(toolName: string, args: Record<string, any>): Promise<object> {
        const [, colId, reqId] = toolName.split('__');
        const collection = this.collectionService.getCollection(colId);
        if (!collection) throw new Error(`Collection "${colId}" not found`);

        const found = findRequestInCollection(collection, reqId);
        if (!found) throw new Error(`Request "${reqId}" not found in collection "${collection.name}"`);

        const env = args.environment ?? this.envConfigService.getSelectedEnvironment();
        const execReq = applyOverrides(toExecutionRequest(found.request), args);

        const executor = new CollectionRequestExecutor(
            this.httpService,
            this.scriptExecutor,
            this.envConfigService,
            this.requestPreparer,
            env,
            new InMemoryCookieJar(),
            collection.scripts,
            found.folderScriptsChain
        );

        const result = await executor.execute(execReq, args.variables ?? {});
        return formatSingleResult(result, args.include ?? []);
    }

    // ── Entire collection ───────────────────────────────────────────────

    private async runCollection(toolName: string, args: Record<string, any>): Promise<object> {
        const colId = toolName.split('__')[1];
        const collection = this.collectionService.getCollection(colId);
        if (!collection) throw new Error(`Collection "${colId}" not found`);

        const env = args.environment ?? this.envConfigService.getSelectedEnvironment();
        const stopOnError: boolean = args.stopOnError ?? false;
        const include: string[] = args.include ?? [];
        const flat = flattenCollection(collection);
        const maxRequests = this.configService.getMcpConfig().maxRequestsPerCall;

        if (flat.length > maxRequests) {
            throw new Error(
                `Collection "${collection.name}" has ${flat.length} requests, which exceeds ` +
                `maxRequestsPerCall (${maxRequests}). Increase the limit in http-forge.config.json or filter the collection.`
            );
        }

        // Use stable temp-<colId> so all runs of the same collection share one results dir
        const suiteId = `temp-${colId}`;
        const resultStorage: IResultStorageService = new ResultStorageService(this.configService);
        await resultStorage.initializeRun(
            suiteId, collection.name, env,
            { iterations: 1, delayBetweenRequests: 0, stopOnError }
        );

        const perRequestResults: object[] = [];
        const failedResults: object[] = [];
        let totalPassed = 0;
        let totalFailed = 0;

        const abortCtrl = new AbortController();

        for (const { request, folderScriptsChain } of flat) {
            if (abortCtrl.signal.aborted) break;

            const executor = new CollectionRequestExecutor(
                this.httpService,
                this.scriptExecutor,
                this.envConfigService,
                this.requestPreparer,
                env,
                new InMemoryCookieJar(),
                collection.scripts,
                folderScriptsChain
            );
            const execReq = applyOverrides(toExecutionRequest(request), args);
            const result: ExecutionResult = await executor.execute(execReq, args.variables ?? {}, abortCtrl.signal);

            await resultStorage.saveResult(1, result);

            if (result.passed) { totalPassed++; } else { totalFailed++; }

            if (include.includes('perRequest')) {
                perRequestResults.push({
                    name: request.name,
                    method: request.method,
                    status: result.response?.status,
                    ok: result.response?.status >= 200 && result.response?.status < 300,
                    duration: `${result.duration}ms`,
                    allPassed: result.passed,
                    ...(include.includes('consoleOutput') && result.consoleOutput?.length
                        ? { consoleOutput: result.consoleOutput } : {})
                });
            }

            if (!result.passed) {
                failedResults.push({
                    name: request.name,
                    method: request.method,
                    status: result.response?.status,
                    duration: `${result.duration}ms`,
                    body: tryParseJson(result.response?.body),
                    failedTests: result.assertions?.filter(a => !a.passed).map(a => ({
                        name: a.name,
                        ...(a.message ? { message: a.message } : {})
                    })),
                    ...(result.error ? { error: result.error } : {}),
                    ...(include.includes('consoleOutput') && result.consoleOutput?.length
                        ? { consoleOutput: result.consoleOutput } : {})
                });
                if (stopOnError) { abortCtrl.abort(); }
            }
        }

        const reportPath = await resultStorage.finalizeRun('completed');

        const out: Record<string, unknown> = {
            collection: collection.name,
            environment: env,
            summary: {
                total: totalPassed + totalFailed,
                passed: totalPassed,
                failed: totalFailed,
                allPassed: totalFailed === 0
            }
        };

        if (totalFailed > 0 || include.includes('failedOnly')) {
            out.failedRequests = failedResults;
        }

        if (include.includes('perRequest')) {
            out.results = perRequestResults;
        }

        if (reportPath !== null) {
            out.report = {
                uri: `file://${reportPath}`,
                hint: 'Click the URI to open the HTML report in your browser'
            };
        }

        return out;
    }

    // ── Test suite ──────────────────────────────────────────────────────

    private async runTestSuite(toolName: string, args: Record<string, any>): Promise<object> {
        const suiteId = toolName.split('__')[1];
        const suite = await this.testSuiteService.getSuite(suiteId);
        if (!suite) throw new Error(`Test suite "${suiteId}" not found`);

        const env = args.environment ?? this.envConfigService.getSelectedEnvironment();
        const iterations: number = args.iterations ?? suite.config.iterations ?? 1;
        const stopOnError: boolean = args.stopOnError ?? suite.config.stopOnError ?? false;
        const delayMs: number = args.delay ?? suite.config.delayBetweenRequests ?? 0;
        const filter: string[] | undefined = args.requestFilter;
        const include: string[] = args.include ?? [];

        const effectiveRequests = suite.requests.filter(r => {
            if (r.enabled === false) return false;
            if (filter && !filter.some(f => r.name.toLowerCase().includes(f.toLowerCase()))) return false;
            return true;
        });
        const maxRequests = this.configService.getMcpConfig().maxRequestsPerCall;
        const totalCalls = effectiveRequests.length * iterations;
        if (totalCalls > maxRequests) {
            throw new Error(
                `Suite "${suite.name}" would execute ${totalCalls} request calls (${effectiveRequests.length} requests × ` +
                `${iterations} iterations), which exceeds maxRequestsPerCall (${maxRequests}). ` +
                `Reduce iterations, use requestFilter, or increase the limit in http-forge.config.json.`
            );
        }

        // Set up result storage for HTML report generation
        const resultStorage: IResultStorageService = new ResultStorageService(this.configService);
        const runId = await resultStorage.initializeRun(
            suite.id, suite.name, env,
            { iterations, delayBetweenRequests: delayMs, stopOnError }
        );

        const perRequestResults: object[] = [];
        const failedResults: object[] = [];
        let totalPassed = 0;
        let totalFailed = 0;

        const abortCtrl = new AbortController();

        try {
            for (let iter = 1; iter <= iterations; iter++) {
                for (const suiteReq of effectiveRequests) {

                    const collection = this.collectionService.getCollection(suiteReq.collectionId);
                    if (!collection) continue;
                    const found = findRequestInCollection(collection, suiteReq.requestId);
                    if (!found) continue;

                    const executor = new CollectionRequestExecutor(
                        this.httpService,
                        this.scriptExecutor,
                        this.envConfigService,
                        this.requestPreparer,
                        env,
                        new InMemoryCookieJar(),
                        collection.scripts,
                        found.folderScriptsChain,
                        undefined,
                        collection.name,
                        iter,
                        iterations
                    );

                    const execReq = applyOverrides(toExecutionRequest(found.request), { variables: args.variables });
                    const result: ExecutionResult = await executor.execute(execReq, args.variables ?? {}, abortCtrl.signal);

                    await resultStorage.saveResult(iter, result);

                    if (result.passed) { totalPassed++; } else { totalFailed++; }

                    if (include.includes('perRequest')) {
                        perRequestResults.push({
                            name: suiteReq.name,
                            iteration: iter,
                            status: result.response?.status,
                            ok: result.response?.status >= 200 && result.response?.status < 300,
                            duration: `${result.duration}ms`,
                            allPassed: result.passed,
                            ...(include.includes('consoleOutput') && result.consoleOutput?.length
                                ? { consoleOutput: result.consoleOutput } : {})
                        });
                    }

                    if (!result.passed) {
                        failedResults.push({
                            name: suiteReq.name,
                            iteration: iter,
                            status: result.response?.status,
                            duration: `${result.duration}ms`,
                            body: tryParseJson(result.response?.body),
                            failedTests: result.assertions?.filter(a => !a.passed).map(a => ({
                                name: a.name,
                                ...(a.message ? { message: a.message } : {})
                            })),
                            ...(result.error ? { error: result.error } : {}),
                            ...(include.includes('consoleOutput') && result.consoleOutput?.length
                                ? { consoleOutput: result.consoleOutput } : {})
                        });
                        if (stopOnError) { abortCtrl.abort(); break; }
                    }

                    if (delayMs > 0 && !abortCtrl.signal.aborted) {
                        await new Promise(r => setTimeout(r, delayMs));
                    }
                }
                if (abortCtrl.signal.aborted) break;
            }
        } finally {
            // noop — storage finalized below
        }

        const reportPath = await resultStorage.finalizeRun('completed');

        const out: Record<string, unknown> = {
            suite: suite.name,
            environment: env,
            summary: {
                total: totalPassed + totalFailed,
                passed: totalPassed,
                failed: totalFailed,
                iterations,
                allPassed: totalFailed === 0
            }
        };

        if (totalFailed > 0 || include.includes('failedOnly')) {
            out.failedRequests = failedResults;
        }

        if (include.includes('perRequest')) {
            out.results = perRequestResults;
        }

        if (reportPath !== null) {
            out.report = {
                uri: `file://${reportPath}`,
                hint: 'Click the URI to open the HTML report in your browser'
            };
        }

        return out;
    }
}
