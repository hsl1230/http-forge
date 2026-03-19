/**
 * Test Suites Tree Provider V2
 */

import * as vscode from 'vscode';
import { ITestSuitesModelLoader, TestSuiteModel } from './loaders/test-suites-model-loader';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class TestSuiteTreeItem extends vscode.TreeItem {
  public model: TestSuiteModel;

  constructor(model: TestSuiteModel, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(model.name, collapsibleState);
    this.model = model;
    this.description = model.description;
    this.tooltip = `${model.name} (${model.requestCount} requests)`;
    this.contextValue = 'test-suite';
    this.iconPath = new vscode.ThemeIcon('beaker');
  }
}

export class TestSuitesTreeProviderV2 implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

  constructor(
    private loader: ITestSuitesModelLoader,
    private logger: ILogger
  ) {}

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    try {
      this.logger.debug('[TestSuitesTreeProviderV2] Getting children');
      
      let models: TestSuiteModel[];
      if (element instanceof TestSuiteTreeItem) {
        models = await this.loader.loadChildren(element.model);
      } else {
        models = await this.loader.loadSuites();
      }

      return models.map(m => this.modelToTreeItem(m));
    } catch (error) {
      this.logger.error('[TestSuitesTreeProviderV2] Failed to get children', error);
      return [];
    }
  }

  private modelToTreeItem(model: TestSuiteModel): TestSuiteTreeItem {
    const hasChildren = model.children && model.children.length > 0;
    const collapsibleState = hasChildren 
      ? vscode.TreeItemCollapsibleState.Collapsed 
      : vscode.TreeItemCollapsibleState.None;

    return new TestSuiteTreeItem(model, collapsibleState);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
