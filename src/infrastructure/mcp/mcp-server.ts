/**
 * MCP Server
 *
 * Exposes HTTP Forge collections and test suites as MCP (Model Context Protocol)
 * tools so AI agents (Claude, Copilot, etc.) can discover and execute requests.
 *
 * Protocol: JSON-RPC 2.0 over HTTP POST on localhost:{port}
 * Standard: https://modelcontextprotocol.io/specification
 *
 * Endpoints:
 *   POST /        — JSON-RPC dispatch (tools/list, tools/call)
 *   POST /mcp     — alias of POST / for standard MCP clients
 *   GET  /health  — liveness probe
 */

import type { IConfigService } from '@http-forge/core';
import { decodeCursor, encodeCursor } from '@http-forge/core';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import type { McpExecutor } from './mcp-executor';
import type { McpToolRegistry } from './mcp-tool-registry';

interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number | null;
    method: string;
    params?: any;
}

interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: any;
    error?: { code: number; message: string };
}

export class McpServerService {
    private server: http.Server | null = null;

    constructor(
        private readonly registry: McpToolRegistry,
        private readonly executor: McpExecutor,
        private readonly port: number = 3100,
        private readonly configService?: IConfigService,
        private readonly workspaceFolder: string = ''
    ) {}

    // ── Lifecycle ─────────────────────────────────────────────────────────

    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.server) {
                resolve();
                return;
            }

            this.server = http.createServer((req, res) => {
                // CORS — allow configured local origins
                const allowedOrigins = this.configService?.getMcpConfig().cors.allowedOrigins
                    ?? ['http://localhost', 'http://127.0.0.1'];
                const origin = req.headers.origin ?? '';
                const corsOrigin = allowedOrigins.includes(origin)
                    ? origin
                    : allowedOrigins[0] ?? 'http://localhost';
                res.setHeader('Access-Control-Allow-Origin', corsOrigin);
                res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');

                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                if (req.method === 'GET' && req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', port: this.port }));
                    return;
                }

                if (req.method === 'GET' && req.url?.startsWith('/report?')) {
                    this.handleReportRequest(req, res);
                    return;
                }

                if (req.method === 'POST' && (req.url === '/' || req.url === '/mcp')) {
                    this.handlePost(req, res);
                    return;
                }

                res.writeHead(405);
                res.end();
            });

            this.server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${this.port} is already in use. Change the MCP server port in settings.`));
                } else {
                    reject(err);
                }
            });

            this.server.listen(this.port, '127.0.0.1', () => resolve());
        });
    }

    stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close(() => {
                this.server = null;
                resolve();
            });
        });
    }

    isRunning(): boolean {
        return this.server !== null && this.server.listening;
    }

    getPort(): number {
        return this.port;
    }

    // ── Request handling ──────────────────────────────────────────────────

    private handleReportRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const url = new URL(req.url!, `http://127.0.0.1:${this.port}`);
        const filePath = url.searchParams.get('path');

        if (!filePath) {
            res.writeHead(400);
            res.end('Missing path parameter');
            return;
        }

        // Security: only serve .html files inside the cache directory where reports are written.
        // Derived from configService so it always matches the actual report location.
        const allowedBase = this.configService
            ? path.dirname(this.configService.getResultsPath())
            : path.resolve(this.workspaceFolder, '.http-forge-cache');
        const normalized = path.resolve(filePath);
        if (!normalized.startsWith(allowedBase + path.sep) || !normalized.endsWith('.html')) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        fs.readFile(normalized, 'utf-8', (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('Report not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
        });
    }

    private handlePost(req: http.IncomingMessage, res: http.ServerResponse): void {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1024 * 1024) {
                this.sendError(res, null, -32700, 'Request body too large (max 1MB)');
                req.destroy();
            }
        });
        req.on('end', async () => {
            if (body.length > 1024 * 1024) return;
            let rpc: JsonRpcRequest;
            try {
                rpc = JSON.parse(body);
            } catch {
                this.sendError(res, null, -32700, 'Parse error');
                return;
            }

            try {
                const result = await this.dispatch(rpc);
                const response: JsonRpcResponse = { jsonrpc: '2.0', id: rpc.id ?? null, result };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
            } catch (err: any) {
                this.sendError(res, rpc.id ?? null, -32603, err?.message ?? 'Internal error');
            }
        });
    }

    private async dispatch(rpc: JsonRpcRequest): Promise<any> {
        switch (rpc.method) {
            case 'initialize':
                // MCP handshake
                return {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'http-forge', version: '1.0.0' }
                };

            case 'tools/list': {
                const allTools = await this.registry.buildToolList();
                const cursor = typeof rpc.params?.cursor === 'string' ? rpc.params.cursor : undefined;
                const pageSize = this.configService?.getMcpConfig().toolPageSize ?? 150;
                if (pageSize <= 0 || allTools.length <= pageSize) {
                    return { tools: allTools };
                }
                const offset = decodeCursor(cursor);
                const page = allTools.slice(offset, offset + pageSize);
                const result: Record<string, unknown> = { tools: page };
                if (offset + pageSize < allTools.length) {
                    result.nextCursor = encodeCursor(offset + pageSize);
                }
                return result;
            }

            case 'tools/call': {
                const { name, arguments: toolArgs } = rpc.params ?? {};
                if (!name) throw new Error('Missing tool name');
                const text = await this.executor.call(name, toolArgs ?? {});
                // Rewrite file:// report URIs to http:// so they open in the browser
                const rewritten = text.replace(
                    /"uri"\s*:\s*"file:\/\/([^"]+)"/g,
                    (_, filePath) => `"uri":"http://127.0.0.1:${this.port}/report?path=${encodeURIComponent(filePath)}"`
                );
                // Append a Markdown link so the URL is clickable in Copilot Chat
                const reportUrlMatch = rewritten.match(/"uri"\s*:\s*"(http:\/\/127\.0\.0\.1:[0-9]+\/report\?[^"]+)"/);
                const linkSuffix = reportUrlMatch
                    ? `\n\n[View HTML Report](${reportUrlMatch[1]})`
                    : '';
                return { content: [{ type: 'text', text: rewritten + linkSuffix }] };
            }

            default:
                throw new Error(`Method not found: ${rpc.method}`);
        }
    }

    private sendError(
        res: http.ServerResponse,
        id: string | number | null,
        code: number,
        message: string
    ): void {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id,
            error: { code, message }
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
    }
}
