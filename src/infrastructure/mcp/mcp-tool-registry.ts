/**
 * MCP Tool Registry
 *
 * Builds the tools/list response dynamically from the current collections and
 * test suites, so the AI always sees up-to-date capabilities without restart.
 */

import {
    buildCollectionToolDescription,
    buildCollectionToolName,
    buildFolderToolDescription,
    buildFolderToolName,
    buildGenericTools,
    buildRequestToolDescription,
    buildRequestToolName,
    buildSuiteToolDescription,
    buildSuiteToolName,
    COLLECTION_INPUT_SCHEMA,
    FOLDER_INPUT_SCHEMA,
    REQUEST_INPUT_SCHEMA,
    SUITE_INPUT_SCHEMA,
    type Collection,
    type CollectionFolderItem,
    type CollectionItem,
    type CollectionRequestItem,
    type ICollectionService,
    type IConfigService,
    type ITestSuiteService,
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
        const mode = mcpCfg.toolMode ?? 'auto';
        const threshold = mcpCfg.drilldownThreshold ?? 500;

        const isCollectionAllowed = (col: Collection): boolean => {
            const excluded = mcpCfg.excludedCollections;
            if (!excluded || excluded.length === 0) return true;
            return !excluded.includes(col.id) && !excluded.includes(col.name);
        };
        const isSuiteAllowed = (suite: { id: string; name: string }): boolean => {
            const excluded = mcpCfg.excludedSuites;
            if (!excluded || excluded.length === 0) return true;
            return !excluded.includes(suite.id) && !excluded.includes(suite.name);
        };

        const collections = this.collectionService.getAllCollections().filter(isCollectionAllowed);
        const suites = (await this.testSuiteService.getAllSuites()).filter(isSuiteAllowed);

        // Decide flat vs drilldown. In `auto`, switch once the flat request-tool
        // count would exceed the threshold.
        let requestToolCount = 0;
        for (const col of collections) {
            requestToolCount += this.flattenRequests(col).length;
        }
        const useDrilldown = mode === 'drilldown' || (mode === 'auto' && requestToolCount > threshold);

        if (useDrilldown) {
            const generic = buildGenericTools(
                prefix,
                collections.map((c) => c.name),
                suites.map((s) => s.name)
            ).map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
            return this.dedupeByName(generic);
        }

        for (const col of collections) {
            const flat = this.flattenRequests(col);

            // One tool per request
            for (const { request, folderPath } of flat) {
                tools.push({
                    name: buildRequestToolName(prefix, col.id, request.id),
                    description: buildRequestToolDescription(request.method, request.name, col.name, folderPath),
                    inputSchema: REQUEST_INPUT_SCHEMA
                });
            }

            // One tool per collection (run all)
            tools.push({
                name: buildCollectionToolName(prefix, col.id),
                description: buildCollectionToolDescription(col.name, flat.length),
                inputSchema: COLLECTION_INPUT_SCHEMA
            });

            // One tool per folder (run all requests under that folder, recursive by default)
            for (const { folderPath, requestCount } of this.enumerateFolders(col)) {
                if (requestCount === 0) continue;
                tools.push({
                    name: buildFolderToolName(prefix, col.id, folderPath),
                    description: buildFolderToolDescription(folderPath, col.name, requestCount),
                    inputSchema: FOLDER_INPUT_SCHEMA
                });
            }
        }

        // One tool per test suite
        for (const suite of suites) {
            tools.push({
                name: buildSuiteToolName(prefix, suite.id),
                description: buildSuiteToolDescription(suite.name, suite.requests.length, suite.config.iterations),
                inputSchema: SUITE_INPUT_SCHEMA
            });
        }

        // MCP requires unique tool names. Same-named sibling folders (allowed in
        // Postman) produce identical folder tool names, so dedupe by name, keeping
        // the first occurrence.
        return this.dedupeByName(tools);
    }

    /** Remove tools sharing an identical name, keeping the first occurrence. */
    private dedupeByName(tools: McpTool[]): McpTool[] {
        const seen = new Set<string>();
        const result: McpTool[] = [];
        for (const tool of tools) {
            if (seen.has(tool.name)) continue;
            seen.add(tool.name);
            result.push(tool);
        }
        return result;
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

    /**
     * Enumerate every folder in a collection (slash-separated names) along with
     * the recursive count of requests beneath it.
     */
    enumerateFolders(
        collection: Collection,
        items: CollectionItem[] = collection.items,
        prefix = ''
    ): Array<{ folderPath: string; requestCount: number }> {
        const result: Array<{ folderPath: string; requestCount: number }> = [];
        for (const item of items) {
            if (item.type === 'folder') {
                const folder = item as CollectionFolderItem;
                const folderPath = prefix ? `${prefix}/${folder.name}` : folder.name;
                result.push({
                    folderPath,
                    requestCount: this.countRequests(folder.items ?? [])
                });
                result.push(...this.enumerateFolders(collection, folder.items ?? [], folderPath));
            }
        }
        return result;
    }

    /** Recursively count request items within a list of collection items. */
    private countRequests(items: CollectionItem[]): number {
        let count = 0;
        for (const item of items) {
            if (item.type === 'request') {
                count++;
            } else {
                count += this.countRequests((item as CollectionFolderItem).items ?? []);
            }
        }
        return count;
    }
}
