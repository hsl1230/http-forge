/**
 * Discovered APIs tree view.
 *
 * Phase 1 UI surface: scans the workspace folder for backend endpoints using
 * core's ApiDiscoveryService (all six providers) and shows them grouped by
 * framework, with method/path/provenance. A refresh action re-scans.
 */

import {
    ApiDiscoveryService,
    DiscoveredApi,
    DiscoveryConfig,
    ExpressDiscoveryProvider,
    FastApiDiscoveryProvider,
    FastifyDiscoveryProvider,
    LambdaDiscoveryProvider,
    NestDiscoveryProvider,
    SpringDiscoveryProvider,
} from '@http-forge/core';
import * as vscode from 'vscode';

/**
 * Tree item for a discovered endpoint.
 */
export class DiscoveredEndpointItem extends vscode.TreeItem {
    constructor(public readonly endpoint: DiscoveredApi) {
        super(`${endpoint.method} ${endpoint.pathExpression}`, vscode.TreeItemCollapsibleState.None);
        this.description = `${endpoint.confidence} · ${endpoint.source.filePath.split('/').pop()}:${endpoint.source.line}`;
        this.tooltip = this.buildTooltip();
        this.contextValue = 'discoveredEndpoint';
        this.iconPath = new vscode.ThemeIcon(endpoint.method === 'GET' ? 'search' : 'cloud-upload');
    }

    private buildTooltip(): string {
        const lines = [
            `${this.endpoint.method} ${this.endpoint.pathExpression}`,
            `Framework: ${this.endpoint.framework}`,
            `Confidence: ${this.endpoint.confidence}`,
            `Source: ${this.endpoint.source.filePath}:${this.endpoint.source.line}`,
        ];
        const params = (this.endpoint.params ?? [])
            .map((p) => `${p.name} (${p.location})`)
            .join(', ');
        if (params) lines.push(`Params: ${params}`);
        return lines.join('\n');
    }
}

/**
 * Tree item for a framework group.
 */
export class FrameworkGroupItem extends vscode.TreeItem {
    constructor(
        public readonly framework: string,
        public readonly endpoints: DiscoveredApi[],
        public readonly collapsed: boolean
    ) {
        super(framework, collapsed ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded);
        this.description = `${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''}`;
        this.contextValue = 'discoveredFramework';
        this.iconPath = new vscode.ThemeIcon('globe');
    }
}

/**
 * Tree data provider for the Discovered APIs view.
 */
export class DiscoveredApisTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> =
        new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private endpoints: DiscoveredApi[] = [];
    private scanning = false;

    constructor(
        private readonly workspaceFolder: string,
        private readonly discoveryConfig?: DiscoveryConfig,
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async scan(): Promise<void> {
        this.scanning = true;
        this._onDidChangeTreeData.fire();
        try {
            const service = new ApiDiscoveryService({
                providers: [
                    new ExpressDiscoveryProvider(),
                    new NestDiscoveryProvider(),
                    new FastifyDiscoveryProvider(),
                    new LambdaDiscoveryProvider(),
                    new SpringDiscoveryProvider(),
                    new FastApiDiscoveryProvider(),
                ],
            });
            const result = await service.discover({
                workspaceFolder: this.workspaceFolder,
                ...this.discoveryConfig,
            });
            this.endpoints = result.endpoints;
        } finally {
            this.scanning = false;
            this.refresh();
        }
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (this.scanning) {
            return [new vscode.TreeItem('Scanning workspace…', vscode.TreeItemCollapsibleState.None)];
        }

        if (!element) {
            // Root: group by framework.
            const byFramework = new Map<string, DiscoveredApi[]>();
            for (const ep of this.endpoints) {
                const list = byFramework.get(ep.framework) ?? [];
                list.push(ep);
                byFramework.set(ep.framework, list);
            }
            const groups = [...byFramework.entries()]
                .map(([framework, eps]) => new FrameworkGroupItem(framework, eps, false));
            if (groups.length === 0) {
                return [];
            }
            return groups;
        }

        if (element instanceof FrameworkGroupItem) {
            return element.endpoints.map((ep) => new DiscoveredEndpointItem(ep));
        }

        return [];
    }
}
