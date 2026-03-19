/**
 * Environments Tree Provider V2
 */

import * as vscode from 'vscode';
import { EnvironmentModel, IEnvironmentsModelLoader } from './loaders/environments-model-loader';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class EnvironmentTreeItem extends vscode.TreeItem {
  public model: EnvironmentModel;

  constructor(model: EnvironmentModel, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(model.name, collapsibleState);
    this.model = model;
    this.description = model.description;
    this.contextValue = model.isActive ? 'environment-active' : 'environment';
    this.iconPath = model.isActive ? new vscode.ThemeIcon('check') : new vscode.ThemeIcon('circle-outline');
  }
}

export class EnvironmentsTreeProviderV2 implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

  constructor(
    private loader: IEnvironmentsModelLoader,
    private logger: ILogger
  ) {}

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    try {
      this.logger.debug('[EnvironmentsTreeProviderV2] Getting children');
      
      let models: EnvironmentModel[];
      if (element instanceof EnvironmentTreeItem) {
        models = await this.loader.loadChildren(element.model);
      } else {
        models = await this.loader.loadEnvironments();
      }

      return models.map(m => this.modelToTreeItem(m));
    } catch (error) {
      this.logger.error('[EnvironmentsTreeProviderV2] Failed to get children', error);
      return [];
    }
  }

  private modelToTreeItem(model: EnvironmentModel): EnvironmentTreeItem {
    const collapsibleState = vscode.TreeItemCollapsibleState.None;
    return new EnvironmentTreeItem(model, collapsibleState);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
