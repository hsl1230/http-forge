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
 *   GET  /health  — liveness probe
 */

import type { IConfigService } from '@http-forge/core';
import * as http from 'http';
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
        private readonly configService?: IConfigService
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
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

                if (req.method === 'POST') {
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

    private handlePost(req: http.IncomingMessage, res: http.ServerResponse): void {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
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

            case 'tools/list':
                return { tools: await this.registry.buildToolList() };

            case 'tools/call': {
                const { name, arguments: toolArgs } = rpc.params ?? {};
                if (!name) throw new Error('Missing tool name');
                const text = await this.executor.call(name, toolArgs ?? {});
                return { content: [{ type: 'text', text }] };
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
