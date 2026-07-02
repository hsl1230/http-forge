/**
 * MCP Tool Registry
 *
 * Builds the tools/list response dynamically from the current collections and
 * test suites, so the AI always sees up-to-date capabilities without restart.
 */

import {
    buildMcpToolList,
    encodeFolderName,
    type Collection,
    type CollectionFolderItem,
    type CollectionItem,
    type ICollectionService,
    type IConfigService,
    type ITestSuiteService,
    type McpTool,
} from '@http-forge/core';

export class McpToolRegistry {
    private cachedTools: McpTool[] | null = null;

    constructor(
        private readonly collectionService: ICollectionService,
        private readonly testSuiteService: ITestSuiteService,
        private readonly configService: IConfigService
    ) {}

    async buildToolList(): Promise<McpTool[]> {
        if (this.cachedTools) return this.cachedTools;
        const tools = await this.computeToolList();
        this.cachedTools = tools;
        return tools;
    }

    invalidateCache(): void {
        this.cachedTools = null;
    }

    private async computeToolList(): Promise<McpTool[]> {
        const mcpCfg = this.configService.getMcpConfig();
        const isAllowed = (ex: string[] | undefined, col: { id: string; name: string }) =>
            !ex?.length || (!ex.includes(col.id) && !ex.includes(col.name));

        const collections = this.collectionService.getAllCollections()
            .filter(c => isAllowed(mcpCfg.excludedCollections, c));
        const suites = (await this.testSuiteService.getAllSuites())
            .filter(s => isAllowed(mcpCfg.excludedSuites, s));

        return buildMcpToolList(collections, suites, mcpCfg);
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
                const encoded = encodeFolderName(folder.name);
                const folderPath = prefix ? `${prefix}/${encoded}` : encoded;
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
