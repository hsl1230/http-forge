/**
 * Test Suites Tree Provider
 * 
 * Provides tree view for Test Suites in the HTTP Forge sidebar
 */

import { TestSuite, TestSuiteService } from '@http-forge/core';
import * as vscode from 'vscode';

/**
 * Tree item representing a Test Suite
 */
export class TestSuiteTreeItem extends vscode.TreeItem {
    constructor(
        public readonly suite: TestSuite,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(suite.name, collapsibleState);
        
        this.contextValue = 'testSuite';
        this.tooltip = this.getTooltip();
        this.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.blue'));
        
        // Single-click opens the suite
        this.command = {
            command: 'httpForge.openTestSuite',
            title: 'Open Test Suite',
            arguments: [suite]
        };
        
        // Show request count in description
        this.description = `${suite.requests.length} requests`;
    }

    private getTooltip(): string {
        const lines = [this.suite.name];
        if (this.suite.description) {
            lines.push(this.suite.description);
        }
        lines.push(`${this.suite.requests.length} requests`);
        lines.push(`Iterations: ${this.suite.config.iterations}`);
        return lines.join('\n');
    }
}

/**
 * Tree Data Provider for Test Suites
 */
export class TestSuitesTreeProvider implements vscode.TreeDataProvider<TestSuiteTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TestSuiteTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<TestSuiteTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TestSuiteTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(private testSuiteService: TestSuiteService) {}

    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TestSuiteTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TestSuiteTreeItem): Promise<TestSuiteTreeItem[]> {
        if (!element) {
            // Root level - return all suites
            const suites = await this.testSuiteService.getAllSuites();
            return suites
                .filter(suite => !suite.isTemporary) // Don't show temporary suites
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(suite => new TestSuiteTreeItem(
                    suite,
                    vscode.TreeItemCollapsibleState.None
                ));
        }

        // Suites don't have children in tree view
        return [];
    }

    getParent(element: TestSuiteTreeItem): TestSuiteTreeItem | undefined {
        // All suites are at root level
        return undefined;
    }
}
