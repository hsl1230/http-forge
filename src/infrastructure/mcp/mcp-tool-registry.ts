/**
 * MCP Tool Registry
 *
 * Builds the tools/list response dynamically from the current collections and
 * test suites, so the AI always sees up-to-date capabilities without restart.
 */

import type {
    Collection,
    CollectionFolderItem,
    CollectionItem,
    CollectionRequestItem,
    ICollectionService,
    IConfigService,
    ITestSuiteService,
} from '@http-forge/core';

export interface McpTool {
    name: string;
    description: string;
    inputSchema: object;
}

/** Flat request entry enriched with folder hierarchy */
export interface FlatRequest {
    request: CollectionRequestItem;
    collection: Collection;
    folderPath: string;
}

const REQUEST_INPUT_SCHEMA = {
    type: 'object',
    properties: {
        environment: {
            type: 'string',
            description: 'Environment name to use (defaults to currently selected environment)'
        },
        variables: {
            type: 'object',
            description: 'Extra variables to inject — merged with environment variables, {{name}} syntax',
            additionalProperties: { type: 'string' }
        },
        headers: {
            type: 'object',
            description: 'Override or add request headers',
            additionalProperties: { type: 'string' }
        },
        query: {
            type: 'object',
            description: 'Override query parameters',
            additionalProperties: { type: 'string' }
        },
        body: {
            type: 'string',
            description: 'Replace the request body (JSON string). Omit to use the saved body.'
        },
        include: {
            type: 'array',
            items: { type: 'string', enum: ['headers', 'cookies', 'tests', 'consoleOutput'] },
            description: 'Extra fields to include in the response (default: status, ok, body, allPassed)'
        }
    }
};

const COLLECTION_INPUT_SCHEMA = {
    type: 'object',
    properties: {
        environment: { type: 'string', description: 'Environment name to use' },
        variables: {
            type: 'object',
            description: 'Extra variables injected into every request',
            additionalProperties: { type: 'string' }
        },
        stopOnError: {
            type: 'boolean',
            description: 'Stop executing on first request failure (default: false)'
        }
    }
};

const SUITE_INPUT_SCHEMA = {
    type: 'object',
    properties: {
        environment: { type: 'string', description: 'Environment name to use' },
        iterations: { type: 'number', description: 'Number of iterations (overrides suite default)' },
        stopOnError: { type: 'boolean', description: 'Stop on first failure' },
        delay: { type: 'number', description: 'Delay between requests in ms' },
        variables: {
            type: 'object',
            description: 'Extra variables injected into every request',
            additionalProperties: { type: 'string' }
        },
        requestFilter: {
            type: 'array',
            items: { type: 'string' },
            description: 'Run only requests whose names match one of these strings (case-insensitive)'
        },
        include: {
            type: 'array',
            items: { type: 'string', enum: ['perRequest', 'failedOnly', 'consoleOutput'] },
            description: 'Result detail level (default: summary + failedRequests)'
        }
    }
};

export class McpToolRegistry {
    constructor(
        private readonly collectionService: ICollectionService,
        private readonly testSuiteService: ITestSuiteService,
        private readonly configService: IConfigService
    ) {}

    async buildToolList(): Promise<McpTool[]> {
        const tools: McpTool[] = [];
        const mcpCfg = this.configService.getMcpConfig();
        const prefix = mcpCfg.toolPrefix ?? '';

        const isCollectionAllowed = (col: Collection): boolean => {
            const excluded = mcpCfg.excludedCollections;
            if (!excluded || excluded.length === 0) return true;
            return !excluded.includes(col.id) && !excluded.includes(col.name);
        };

        const collections = this.collectionService.getAllCollections();
        for (const col of collections) {
            if (!isCollectionAllowed(col)) continue;
            const flat = this.flattenRequests(col);

            // One tool per request
            for (const { request, folderPath } of flat) {
                const path = folderPath ? `${folderPath} / ${request.name}` : request.name;
                tools.push({
                    name: `${prefix}request__${col.id}__${request.id}`,
                    description: `[${request.method}] ${path}  (collection: ${col.name})`,
                    inputSchema: REQUEST_INPUT_SCHEMA
                });
            }

            // One tool per collection (run all)
            tools.push({
                name: `${prefix}collection__${col.id}`,
                description: `Run all requests in collection: "${col.name}" (${flat.length} requests)`,
                inputSchema: COLLECTION_INPUT_SCHEMA
            });
        }

        // One tool per test suite
        const suites = await this.testSuiteService.getAllSuites();
        for (const suite of suites) {
            const excluded = mcpCfg.excludedSuites;
            if (excluded && excluded.length > 0 && (excluded.includes(suite.id) || excluded.includes(suite.name))) {
                continue;
            }
            tools.push({
                name: `${prefix}suite__${suite.id}`,
                description: `Run test suite: "${suite.name}" (${suite.requests.length} requests, ${suite.config.iterations} iteration(s) by default)`,
                inputSchema: SUITE_INPUT_SCHEMA
            });
        }

        return tools;
    }

    /** Flatten a collection's items tree into a list of requests with folder context */
    flattenRequests(
        collection: Collection,
        items: CollectionItem[] = collection.items,
        folderPath = ''
    ): FlatRequest[] {
        const result: FlatRequest[] = [];
        for (const item of items) {
            if (item.type === 'request') {
                result.push({ request: item as CollectionRequestItem, collection, folderPath });
            } else {
                const folder = item as CollectionFolderItem;
                const nextPath = folderPath ? `${folderPath} / ${folder.name}` : folder.name;
                result.push(...this.flattenRequests(collection, folder.items ?? [], nextPath));
            }
        }
        return result;
    }
}
