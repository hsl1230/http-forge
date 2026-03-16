import { EnvironmentConfigService, ResolvedEnvironment } from '@http-forge/core';
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../shared/constants';

/**
 * Tree item representing an environment
 */
export class EnvironmentTreeItem extends vscode.TreeItem {
    public readonly environmentId: string;

    constructor(
        public readonly envName: string,
        public readonly isActive: boolean,
        public readonly envConfig?: ResolvedEnvironment | null
    ) {
        super(envName, vscode.TreeItemCollapsibleState.None);
        
        this.environmentId = envName;
        this.contextValue = 'environment';
        this.tooltip = this.getTooltip();
        this.iconPath = new vscode.ThemeIcon(
            isActive ? 'check' : 'circle-outline',
            isActive ? new vscode.ThemeColor('charts.green') : undefined
        );
        this.description = isActive ? '(active)' : '';
        
        this.command = {
            command: COMMAND_IDS.selectEnvironment,
            title: 'Select Environment',
            arguments: [this]
        };
    }

    private getTooltip(): string {
        // Show description if available, otherwise just the environment name
        if (this.envConfig?.description) {
            return `${this.envName}\n${this.envConfig.description}`;
        }
        return this.envName;
    }
}

/**
 * Tree Data Provider for Environments
 */
export class EnvironmentsTreeProvider implements vscode.TreeDataProvider<EnvironmentTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<EnvironmentTreeItem | undefined | null | void> = new vscode.EventEmitter<EnvironmentTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EnvironmentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private envConfigService: EnvironmentConfigService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: EnvironmentTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: EnvironmentTreeItem): Promise<EnvironmentTreeItem[]> {
        if (element) {
            return []; // Environments don't have children
        }

        const envNames = this.envConfigService.getEnvironmentNames();
        const selectedEnv = this.envConfigService.getSelectedEnvironment();

        return envNames.map(envName => {
            const envConfig = this.envConfigService.getResolvedEnvironment(envName);
            return new EnvironmentTreeItem(
                envName,
                envName === selectedEnv,
                envConfig
            );
        });
    }
}
