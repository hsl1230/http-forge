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
    CollectionRequestExecutor,
    GENERIC_TOOL_NAMES,
    ICollectionService,
    IEnvironmentConfigService,
    IHttpRequestService,
    InMemoryCookieJar,
    IRequestPreparer,
    IResultStorageService,
    IScriptExecutor,
    ITestSuiteService,
    McpRunStore,
    parseMcpToolName,
    resolveFolderToken,
    resolveToken,
    ResultStorageService,
    type Collection,
    type CollectionFolderItem,
    type CollectionItem,
    type CollectionRequest,
    type CollectionRequestItem,
    type ExecutionRequest,
    type ExecutionResult,
    type GenericToolName,
    type IConfigService,
    type McpRunRecord,
    type RequestScripts,
} from '@http-forge/core';
import * as fsp from 'fs/promises';
import * as path from 'path';
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
    folderChain: RequestScripts[] = [],
    folderNameChain: string[] = []
): Array<{ request: CollectionRequestItem; folderScriptsChain: RequestScripts[]; folderPath: string }> {
    const result: Array<{ request: CollectionRequestItem; folderScriptsChain: RequestScripts[]; folderPath: string }> = [];
    for (const item of items) {
        if (item.type === 'request') {
            result.push({
                request: item as CollectionRequestItem,
                folderScriptsChain: [...folderChain],
                folderPath: folderNameChain.join('/')
            });
        } else {
            const folder = item as CollectionFolderItem;
            const next = folder.scripts ? [...folderChain, folder.scripts] : [...folderChain];
            const nextNames = [...folderNameChain, folder.name];
            result.push(...flattenCollection(collection, folder.items ?? [], next, nextNames));
        }
    }
    return result;
}

function esc(v: unknown): string {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugifyFolderPath(folderPath: string): string {
    return folderPath.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildSingleRequestHtml(result: ExecutionResult, requestName: string): string {
    const r = result.response;
    const req = result.executedRequest;
    const statusClass = r.status >= 200 && r.status < 300 ? 'ok' : r.status >= 400 ? 'err' : 'warn';
    const passed = result.passed;
    const assertions = result.assertions ?? [];
    const assertPassed = assertions.filter(a => a.passed).length;
    const assertFailed = assertions.filter(a => !a.passed).length;

    // ── Request ──
    const reqHeadersHtml = Object.entries(req?.headers ?? {})
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');

    const reqQueryHtml = Object.entries(req?.query ?? {})
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');

    const reqParamsHtml = Object.entries(req?.params ?? {})
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');

    let reqBodyDisplay = '';
    if (req?.body) {
        const b = req.body as any;
        if (b.type === 'raw' && b.raw != null) {
            try { reqBodyDisplay = JSON.stringify(JSON.parse(b.raw), null, 2); } catch { reqBodyDisplay = String(b.raw); }
        } else if (b.type === 'form') {
            reqBodyDisplay = Object.entries(b.form ?? {}).map(([k, v]) => `${k}=${v}`).join('\n');
        } else if (b.type === 'multipart') {
            reqBodyDisplay = (b.fields ?? []).map((f: any) => `${f.key}=${f.value}`).join('\n');
        } else {
            try { reqBodyDisplay = JSON.stringify(b, null, 2); } catch { reqBodyDisplay = String(b); }
        }
    }

    // ── Response ──
    const resHeadersHtml = Object.entries(r.headers ?? {})
        .filter(([k]) => k !== 'set-cookie')
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');

    const cookiesHtml = (r.cookies ?? [])
        .map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.value)}</td></tr>`).join('');

    const assertHtml = assertions.map(a => `
        <div class="assert ${a.passed ? 'pass' : 'fail'}">
            <span class="assert-icon">${a.passed ? '✓' : '✗'}</span>
            <span>${esc(a.name)}</span>
            ${a.message ? `<span class="assert-msg">${esc(a.message)}</span>` : ''}
        </div>`).join('');

    let resBodyDisplay = '';
    try {
        resBodyDisplay = typeof r.body === 'string' ? JSON.stringify(JSON.parse(r.body), null, 2) : JSON.stringify(r.body, null, 2);
    } catch { resBodyDisplay = String(r.body ?? ''); }

    const tab = (id: string, label: string, active = false) =>
        `<button class="tab${active ? ' active' : ''}" onclick="show('${id}')">${label}</button>`;
    const panel = (id: string, html: string, active = false) =>
        `<div id="${id}" class="panel${active ? ' active' : ''}">${html}</div>`;

    const reqBodySection = reqBodyDisplay
        ? `<pre>${esc(reqBodyDisplay)}</pre>`
        : '<p class="empty">No body</p>';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${esc(requestName)} — HTTP Forge</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#1e1e1e;color:#d4d4d4;padding:24px;line-height:1.5}
h1{font-size:1.15em;font-weight:600;margin-bottom:12px;color:#fff}
h2{font-size:.78em;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;font-weight:600}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.83em;font-weight:700}
.ok{background:#1a3a1a;color:#4ec94e}.err{background:#3a1a1a;color:#f44}.warn{background:#3a2a1a;color:#fa0}
.meta{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px;font-size:.85em;color:#9e9e9e;align-items:center}
.card{background:#252526;border-radius:8px;padding:16px;margin-bottom:16px}
.url{font-size:.88em;color:#9cdcfe;word-break:break-all;margin-bottom:16px;font-family:monospace}
.tabs{display:flex;gap:2px;margin-bottom:12px;border-bottom:1px solid #3c3c3c;padding-bottom:0}
.tab{background:none;border:none;color:#888;padding:6px 14px;font-size:.83em;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.tab.active{color:#d4d4d4;border-bottom-color:#0098ff}
.tab:hover{color:#d4d4d4}
.panel{display:none}.panel.active{display:block}
table{width:100%;border-collapse:collapse;font-size:.83em}
td{padding:5px 8px;border-bottom:1px solid #2d2d2d;word-break:break-all;vertical-align:top}
td:first-child{color:#9cdcfe;width:35%;white-space:nowrap;font-family:monospace}
pre{background:#1a1a1a;padding:12px;border-radius:4px;overflow:auto;font-size:.8em;line-height:1.6;white-space:pre-wrap;color:#ce9178}
.assert{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #2d2d2d;font-size:.85em}
.assert:last-child{border-bottom:none}
.assert-icon{font-weight:700;width:16px;flex-shrink:0;margin-top:1px}
.assert.pass .assert-icon{color:#4ec94e}.assert.fail .assert-icon{color:#f44}
.assert-msg{color:#f44;margin-left:4px;font-size:.9em}
.empty{color:#555;font-size:.83em;font-style:italic}
.section-label{font-size:.72em;color:#666;text-transform:uppercase;letter-spacing:.08em;margin:14px 0 6px;font-weight:600}
</style></head><body>
<h1>${esc(requestName)}</h1>
<div class="meta">
  <span><span class="badge ${statusClass}">${esc(r.status)} ${esc(r.statusText)}</span></span>
  <span>⏱ ${result.duration}ms</span>
  <span>${passed
        ? '<span style="color:#4ec94e">✓ All tests passed</span>'
        : `<span style="color:#f44">✗ ${assertFailed} test${assertFailed !== 1 ? 's' : ''} failed</span>`}</span>
</div>

<div class="card">
  <h2>Request</h2>
  <div class="url"><strong style="color:#569cd6">${esc(req?.method ?? '')}</strong>  ${esc(req?.url ?? '')}</div>
  <div class="tabs">
    ${tab('req-headers', `Headers${reqHeadersHtml ? ` (${Object.keys(req?.headers ?? {}).length})` : ''}`, true)}
    ${tab('req-query', `Query${reqQueryHtml ? ` (${Object.keys(req?.query ?? {}).length})` : ''}`)}
    ${tab('req-params', `Path Params${reqParamsHtml ? ` (${Object.keys(req?.params ?? {}).length})` : ''}`)}
    ${tab('req-body', 'Body')}
  </div>
  ${panel('req-headers', reqHeadersHtml ? `<table>${reqHeadersHtml}</table>` : '<p class="empty">No headers</p>', true)}
  ${panel('req-query', reqQueryHtml ? `<table>${reqQueryHtml}</table>` : '<p class="empty">No query params</p>')}
  ${panel('req-params', reqParamsHtml ? `<table>${reqParamsHtml}</table>` : '<p class="empty">No path params</p>')}
  ${panel('req-body', reqBodySection)}
</div>

<div class="card">
  <h2>Response</h2>
  <div class="tabs">
    ${tab('res-body', 'Body', true)}
    ${tab('res-headers', `Headers (${Object.keys(r.headers ?? {}).length})`)}
    ${tab('res-cookies', `Cookies (${(r.cookies ?? []).length})`)}
  </div>
  ${panel('res-body', `<pre>${esc(resBodyDisplay)}</pre>`, true)}
  ${panel('res-headers', resHeadersHtml ? `<table>${resHeadersHtml}</table>` : '<p class="empty">No headers</p>')}
  ${panel('res-cookies', cookiesHtml ? `<table>${cookiesHtml}</table>` : '<p class="empty">No cookies</p>')}
</div>

${assertions.length ? `<div class="card"><h2>Tests (${assertPassed}/${assertions.length})</h2>${assertHtml}</div>` : ''}
${result.consoleOutput?.length ? `<div class="card"><h2>Console Output</h2><pre style="color:#d4d4d4">${result.consoleOutput.map(esc).join('\n')}</pre></div>` : ''}
${result.error ? `<div class="card"><h2>Error</h2><pre style="color:#f44">${esc(result.error)}</pre></div>` : ''}

<script>
function show(id) {
  const panel = document.getElementById(id);
  if (!panel) return;
  const card = panel.closest('.card');
  card.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  card.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  panel.classList.add('active');
  card.querySelectorAll('.tab').forEach(t => {
    if (t.getAttribute('onclick') === "show('" + id + "')") t.classList.add('active');
  });
}
</script>
</body></html>`;
}

async function writeSingleRequestReport(
    result: ExecutionResult,
    requestName: string,
    configService: IConfigService
): Promise<string | null> {
    try {
        // Derive reports dir as sibling of results: .http-forge-cache/reports
        const resultsBase = configService.getResultsPath();
        const reportsDir = path.join(path.dirname(resultsBase), 'reports');
        await fsp.mkdir(reportsDir, { recursive: true });
        const safeName = requestName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
        const fileName = `${safeName}-${Date.now()}.html`;
        const reportPath = path.join(reportsDir, fileName);
        await fsp.writeFile(reportPath, buildSingleRequestHtml(result, requestName), 'utf-8');
        return reportPath;
    } catch {
        return null;
    }
}

// ─── Executor ─────────────────────────────────────────────────────────────

export class McpExecutor {
    private readonly runStore = new McpRunStore();

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

    /** Resolve a collection by its display name or id (case-insensitive fallback). */
    private resolveCollectionByLabel(label: unknown): Collection {
        if (typeof label !== 'string' || !label.trim()) {
            throw new Error('The "collection" argument is required');
        }
        const collections = this.collectionService.getAllCollections();
        const q = label.toLowerCase();
        const col =
            collections.find(c => c.id === label || c.name === label) ??
            collections.find(c => c.name.toLowerCase() === q) ??
            collections.find(c => c.name.toLowerCase().includes(q)) ??
            collections.find(c => c.id.toLowerCase().includes(q));
        if (!col) {
            const names = collections.map(c => `"${c.name}"`).join(', ');
            throw new Error(`Collection not found: "${label}". Available collections: ${names || '(none)'}. Call list_collections to see all.`);
        }
        return col;
    }

    /**
     * Dispatch a generic drill-down tool. The target is chosen by ARGUMENTS
     * (collection/request/folder/suite name) rather than encoded in the tool
     * name. Resolved ids are forwarded to the existing token-based methods,
     * which accept raw ids via their legacy fallback.
     */
    private async callGeneric(tool: GenericToolName, args: Record<string, any>): Promise<object> {
        if (tool === GENERIC_TOOL_NAMES.listCollections) {
            const collections = this.collectionService.getAllCollections();
            return {
                collections: collections.map(c => ({
                    name: c.name,
                    id: c.id,
                    description: c.description ?? '',
                    requestCount: flattenCollection(c).length,
                })),
            };
        }

        if (tool === GENERIC_TOOL_NAMES.listFolders) {
            const col = this.resolveCollectionByLabel(args.collection);
            return {
                collection: col.name,
                folders: this.registry.enumerateFolders(col).map(({ folderPath, requestCount }) => ({
                    path: folderPath,
                    requestCount,
                })),
            };
        }

        if (tool === GENERIC_TOOL_NAMES.listRequests) {
            const col = this.resolveCollectionByLabel(args.collection);
            const folderFilter = typeof args.folder === 'string' ? args.folder.toLowerCase() : undefined;
            const offset = typeof args.offset === 'number' ? Math.max(0, args.offset) : 0;
            const limit = typeof args.limit === 'number' ? Math.min(200, Math.max(1, args.limit)) : 50;
            const all = flattenCollection(col)
                .filter(({ folderPath }) => !folderFilter || folderPath.toLowerCase().includes(folderFilter))
                .map(({ request, folderPath }) => ({
                    id: request.id,
                    name: request.name,
                    method: request.method,
                    folder: folderPath,
                    description: request.description ?? '',
                }));
            return {
                collection: col.name,
                total: all.length,
                offset,
                limit,
                requests: all.slice(offset, offset + limit),
            };
        }

        if (tool === GENERIC_TOOL_NAMES.searchRequests) {
            const col = this.resolveCollectionByLabel(args.collection);
            const query = typeof args.query === 'string' ? args.query.toLowerCase().trim() : '';
            if (!query) throw new Error('The "query" argument is required');
            const matches = flattenCollection(col)
                .filter(({ request, folderPath }) =>
                    request.name.toLowerCase().includes(query) ||
                    request.url.toLowerCase().includes(query) ||
                    request.method.toLowerCase().includes(query) ||
                    folderPath.toLowerCase().includes(query) ||
                    (request.description ?? '').toLowerCase().includes(query)
                )
                .map(({ request, folderPath }) => ({
                    id: request.id,
                    name: request.name,
                    method: request.method,
                    url: request.url,
                    folder: folderPath,
                    description: request.description ?? '',
                }));
            return { collection: col.name, query: args.query, total: matches.length, requests: matches };
        }

        if (tool === GENERIC_TOOL_NAMES.getEnvironment) {
            const envName = typeof args.environment === 'string' && args.environment.trim()
                ? args.environment.trim()
                : this.envConfigService.getSelectedEnvironment();
            const resolved = this.envConfigService.getResolvedEnvironment(envName);
            if (!resolved) throw new Error(`Environment "${envName}" not found`);
            return { name: resolved.name, variables: resolved.variables };
        }

        if (tool === GENERIC_TOOL_NAMES.setVariable) {
            const key = typeof args.key === 'string' ? args.key.trim() : '';
            const value = typeof args.value === 'string' ? args.value : String(args.value ?? '');
            if (!key) throw new Error('The "key" argument is required');
            const envName = typeof args.environment === 'string' && args.environment.trim()
                ? args.environment.trim()
                : this.envConfigService.getSelectedEnvironment();
            this.envConfigService.setEnvironmentVariable(key, value, envName);
            return { set: true, key, environment: envName };
        }

        if (tool === GENERIC_TOOL_NAMES.getRunStatus) {
            const rec = this.runStore.require(args.runId);
            return {
                runId: rec.id,
                status: rec.status,
                suiteName: rec.suiteName,
                progress: rec.progress,
                ...(rec.error ? { error: rec.error } : {}),
            };
        }

        if (tool === GENERIC_TOOL_NAMES.getRunSummary) {
            const rec = this.runStore.require(args.runId);
            if (rec.status === 'running') {
                return { runId: rec.id, status: 'running', progress: rec.progress };
            }
            return {
                runId: rec.id,
                status: rec.status,
                suiteName: rec.suiteName,
                summary: rec.summary,
                ...(rec.reportPath ? { report: { uri: `file://${rec.reportPath}` } } : {}),
            };
        }

        if (tool === GENERIC_TOOL_NAMES.getFailedRequests) {
            const rec = this.runStore.require(args.runId);
            if (rec.status === 'running') {
                return { runId: rec.id, status: 'running', progress: rec.progress, failedSoFar: rec.failedRequests.length };
            }
            const offset = typeof args.offset === 'number' ? Math.max(0, args.offset) : 0;
            const limit = typeof args.limit === 'number' ? Math.min(100, Math.max(1, args.limit)) : 20;
            const slice = rec.failedRequests.slice(offset, offset + limit);
            return {
                runId: rec.id,
                status: rec.status,
                totalFailed: rec.failedRequests.length,
                offset,
                limit,
                failedRequests: slice,
            };
        }

        if (tool === GENERIC_TOOL_NAMES.getRequestResult) {
            const rec = this.runStore.require(args.runId);
            const requestName = args.request as string;
            const iteration = typeof args.iteration === 'number' ? args.iteration : 1;
            if (!requestName) throw new Error('The "request" argument is required');
            const result = rec.allResults.find(
                r => r.iteration === iteration &&
                     (r.name === requestName || r.name.toLowerCase() === requestName.toLowerCase())
            );
            if (!result) {
                if (rec.status === 'running') {
                    return { runId: rec.id, status: 'running', message: `Request "${requestName}" has not completed yet.` };
                }
                throw new Error(`Request "${requestName}" (iteration ${iteration}) not found in run "${rec.id}".`);
            }
            return { runId: rec.id, ...result };
        }

        if (tool === GENERIC_TOOL_NAMES.runRequest) {
            const col = this.resolveCollectionByLabel(args.collection);
            const flat = flattenCollection(col);
            const requestIdArg = typeof args.requestId === 'string' ? args.requestId.trim() : undefined;
            const requestArg = args.request;
            let match: typeof flat[0] | undefined;
            if (requestIdArg) {
                match = flat.find(r => r.request.id === requestIdArg);
                if (!match) throw new Error(`Request with id "${requestIdArg}" not found in collection "${col.name}"`);
            } else {
                if (typeof requestArg !== 'string' || !requestArg.trim()) {
                    throw new Error('The "request" or "requestId" argument is required');
                }
                match = flat.find(r => r.request.name === requestArg) ??
                        flat.find(r => r.request.name.toLowerCase() === requestArg.toLowerCase());
                if (!match) throw new Error(`Request "${requestArg}" not found in collection "${col.name}"`);
            }
            return this.executeRequest([col.id, match.request.id], args);
        }

        if (tool === GENERIC_TOOL_NAMES.runFolder) {
            const col = this.resolveCollectionByLabel(args.collection);
            const folderArg = args.folder;
            if (typeof folderArg !== 'string' || !folderArg.trim()) {
                throw new Error('The "folder" argument is required');
            }
            const folderPaths = this.registry.enumerateFolders(col).map(f => f.folderPath);
            const fq = folderArg.toLowerCase();
            const folderPath =
                folderPaths.find(p => p === folderArg) ??
                folderPaths.find(p => p.toLowerCase() === fq) ??
                folderPaths.find(p => p.toLowerCase().includes(fq)) ??
                folderPaths.find(p => p.split('/').some(seg => seg.toLowerCase().includes(fq)));
            if (!folderPath) {
                const hint = folderPaths.map(p => `"${p}"`).join(', ');
                throw new Error(`Folder "${folderArg}" not found in collection "${col.name}". Available folders: ${hint || '(none)'}. Call list_folders to see all.`);
            }
            return this.runFolder([col.id, folderPath], args);
        }

        if (tool === GENERIC_TOOL_NAMES.runCollection) {
            const col = this.resolveCollectionByLabel(args.collection);
            return this.runCollection([col.id], args);
        }

        // run_suite
        const suiteArg = args.suite;
        if (typeof suiteArg !== 'string' || !suiteArg.trim()) {
            throw new Error('The "suite" argument is required');
        }
        const suites = await this.testSuiteService.getAllSuites();
        const suite =
            suites.find(s => s.id === suiteArg || s.name === suiteArg) ??
            suites.find(s => s.name.toLowerCase() === suiteArg.toLowerCase());
        if (!suite) throw new Error(`Test suite not found: "${suiteArg}"`);
        return this.runTestSuite([suite.id], args);
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

        const requestId = resolveToken(reqToken, flattenCollection(collection).map(f => f.request.id));
        const found = requestId ? findRequestInCollection(collection, requestId) : undefined;
        if (!found) throw new Error(`Request not found in collection "${collection.name}"`);

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

        // Write lightweight HTML report to .http-forge-cache/reports/
        const reportPath = await writeSingleRequestReport(result, found.request.name, this.configService);
        const out = formatSingleResult(result, args.include ?? []) as Record<string, unknown>;
        if (reportPath) {
            out.report = {
                uri: `file://${reportPath}`,
                hint: 'Click the URI to open the HTML report in your browser'
            };
        }
        return out;
    }

    // ── Entire collection ───────────────────────────────────────────────
    // Refactored to use shared suite execution logic for consistency with UI

    private async runCollection(tokens: string[], args: Record<string, any>): Promise<object> {
        const collection = this.resolveCollection(tokens[0]);
        const colId = collection.id;

        // Create a temporary suite from the collection (same as UI does)
        // This ensures collection runs and suite runs use identical execution logic
        const flat = flattenCollection(collection);
        const suiteRequests = flat.map(({ request, folderPath }) => ({
            id: request.id,
            slug: request.id.toLowerCase().replace(/\s+/g, '-'),
            collectionId: collection.id,
            requestId: request.id,
            name: request.name,
            method: request.method,
            collectionName: collection.name,
            folderPath,
            enabled: true
        }));

        const tempSuite = {
            id: `temp-${colId}`,
            name: collection.name,
            requests: suiteRequests,
            config: {
                iterations: 1,
                delay: 0,
                stopOnError: args.stopOnError ?? false,
                readFromSharedSession: false,
                writeToSharedSession: false
            },
            isTemporary: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Use the shared suite execution logic
        return this.executeSuite(tempSuite, args, 'collection');
    }

    // ── Single folder within a collection ───────────────────────────────
    // Scopes a collection run to the requests under one folder. Recursive by
    // default (set args.recursive === false for that folder level only).

    private async runFolder(tokens: string[], args: Record<string, any>): Promise<object> {
        const [colToken, folderToken] = tokens;
        const collection = this.resolveCollection(colToken);
        const colId = collection.id;

        const folderPaths = this.registry.enumerateFolders(collection).map(f => f.folderPath);
        const folderPath = resolveFolderToken(folderToken, folderPaths);
        if (!folderPath) {
            throw new Error(`Folder not found in collection "${collection.name}"`);
        }

        const recursive = args.recursive !== false;
        const target = folderPath.replace(/\/+$/, '');
        const flat = flattenCollection(collection).filter(({ folderPath: fp }) =>
            recursive ? fp === target || fp.startsWith(`${target}/`) : fp === target
        );

        if (flat.length === 0) {
            throw new Error(
                `No requests found under folder "${folderPath}" in collection "${collection.name}"`
            );
        }

        const suiteRequests = flat.map(({ request, folderPath: fp }) => ({
            id: request.id,
            slug: request.id.toLowerCase().replace(/\s+/g, '-'),
            collectionId: collection.id,
            requestId: request.id,
            name: request.name,
            method: request.method,
            collectionName: collection.name,
            folderPath: fp,
            enabled: true
        }));

        const tempSuite = {
            id: `temp-${colId}-${slugifyFolderPath(target)}`,
            name: `${collection.name} / ${target}`,
            requests: suiteRequests,
            config: {
                iterations: 1,
                delay: 0,
                stopOnError: args.stopOnError ?? false,
                readFromSharedSession: false,
                writeToSharedSession: false
            },
            isTemporary: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Reuse the shared suite execution logic; 'collection' keeps the
        // response shape identical to a collection run.
        return this.executeSuite(tempSuite, args, 'collection');
    }

    // ── Test suite ──────────────────────────────────────────────────────

    private async runTestSuite(tokens: string[], args: Record<string, any>): Promise<object> {
        const suites = await this.testSuiteService.getAllSuites();
        const suiteId = resolveToken(tokens[0], suites.map(s => s.id));
        const suite = suiteId ? await this.testSuiteService.getSuite(suiteId) : undefined;
        if (!suite) throw new Error(`Test suite not found for tool token "${tokens[0]}"`);

        // Use shared execution logic
        return this.executeSuite(suite, args, 'suite');
    }

    // ── Shared suite execution logic ────────────────────────────────────
    // Used by both runTestSuite and runCollection for consistency

    private async executeSuite(
        suite: any,
        args: Record<string, any>,
        source: 'suite' | 'collection'
    ): Promise<object> {
        const runAsync = args.async === true;
        if (runAsync) {
            return this.executeSuiteAsync(suite, args, source);
        }
        return this.executeSuiteSync(suite, args, source);
    }

    /** Start a run in the background, return runId immediately. */
    private executeSuiteAsync(
        suite: any,
        args: Record<string, any>,
        source: 'suite' | 'collection'
    ): object {
        this.runStore.prune();

        // Count effective requests for total
        const effectiveRequests = suite.requests.filter((r: any) => {
            if (r.enabled === false) return false;
            const filter: string[] | undefined = args.requestFilter;
            if (filter && !filter.some(f => r.name.toLowerCase().includes(f.toLowerCase()))) return false;
            return true;
        });
        const iterations: number = args.iterations ?? suite.config?.iterations ?? 1;
        const total = effectiveRequests.length * iterations;

        const record = this.runStore.create(suite.name, total);

        // Fire and forget — do not await
        this.executeSuiteSync(suite, { ...args, _runRecord: record }, source)
            .then((result: any) => {
                record.status = 'completed';
                record.completedAt = Date.now();
                record.summary = result.summary ?? record.summary;
                record.reportPath = result.report?.uri?.replace('file://', '') ?? null;
            })
            .catch((err: Error) => {
                record.status = 'failed';
                record.completedAt = Date.now();
                record.error = err.message;
            });

        return { runId: record.id, status: 'running', total, message: 'Run started. Use get_run_status to poll.' };
    }

    private async executeSuiteSync(
        suite: any,
        args: Record<string, any>,
        source: 'suite' | 'collection'
    ): Promise<object> {
        const runRecord: McpRunRecord | undefined = args._runRecord;
        const env = args.environment ?? this.envConfigService.getSelectedEnvironment();
        const iterations: number = args.iterations ?? suite.config?.iterations ?? 1;
        const stopOnError: boolean = args.stopOnError ?? suite.config?.stopOnError ?? false;
        const delayMs: number = args.delay ?? suite.config?.delayBetweenRequests ?? 0;
        const filter: string[] | undefined = args.requestFilter;
        const include: string[] = args.include ?? [];

        const effectiveRequests = suite.requests.filter((r: any) => {
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
        await resultStorage.initializeRun(
            suite.id, suite.name, env,
            { iterations, delayBetweenRequests: delayMs, stopOnError }
        );

        const perRequestResults: object[] = [];
        const failedResults: object[] = [];
        let totalPassed = 0;
        let totalFailed = 0;

        const abortCtrl = new AbortController();
        const cookieJar = new InMemoryCookieJar(); // shared across all iterations so cookies propagate

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
                        cookieJar,
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

                    // Always record for async polling (allResults / failedRequests on run record)
                    const perReqEntry: PerRequestRecord = {
                        name: suiteReq.name,
                        iteration: iter,
                        status: result.response?.status,
                        ok: result.response?.status >= 200 && result.response?.status < 300,
                        duration: `${result.duration}ms`,
                        allPassed: result.passed,
                        body: tryParseJson(result.response?.body),
                        ...(result.assertions?.length ? {
                            failedTests: result.assertions.filter(a => !a.passed).map(a => ({
                                name: a.name,
                                ...(a.message ? { message: a.message } : {})
                            }))
                        } : {}),
                        ...(result.error ? { error: result.error } : {}),
                        ...(result.consoleOutput?.length ? { consoleOutput: result.consoleOutput } : {}),
                    };
                    if (runRecord) {
                        runRecord.allResults.push(perReqEntry);
                        if (!result.passed) runRecord.failedRequests.push(perReqEntry);
                        runRecord.progress.completed++;
                        runRecord.summary = {
                            passed: totalPassed,
                            failed: totalFailed,
                            total: totalPassed + totalFailed,
                            allPassed: totalFailed === 0,
                        };
                    }

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

        // Format output based on source (collection vs suite)
        const summaryKey = source === 'collection' ? 'collection' : 'suite';
        const out: Record<string, unknown> = {
            [summaryKey]: suite.name,
            environment: env,
            summary: {
                total: totalPassed + totalFailed,
                passed: totalPassed,
                failed: totalFailed,
                ...(iterations > 1 ? { iterations } : {}),
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
