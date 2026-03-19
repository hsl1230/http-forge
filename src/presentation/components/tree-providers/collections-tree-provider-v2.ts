/**
 * Collections Tree Provider V2
 * 
 * Converts collection models to VS Code TreeItems.
 */

import * as vscode from 'vscode';
import { CollectionModel, ICollectionsModelLoader } from './loaders/collections-model-loader';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Tree item wrapper with model data
 */
export class CollectionTreeItem extends vscode.TreeItem {
  public model: CollectionModel;

  constructor(model: CollectionModel, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(model.name, collapsibleState);
    this.model = model;
    this.description = model.description;
    this.tooltip = `${model.name} (${model.itemCount} items)`;
    this.contextValue = 'collection';
  }
}

/**
 * Collections tree provider
 */
export class CollectionsTreeProviderV2 implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

  constructor(
    private loader: ICollectionsModelLoader,
    private logger: ILogger
  ) {}

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    try {
      this.logger.debug('[CollectionsTreeProviderV2] Getting children');
      
      let models: CollectionModel[];
      if (element instanceof CollectionTreeItem) {
        models = await this.loader.loadChildren(element.model);
      } else {
        models = await this.loader.loadCollections();
      }

      return models.map(m => this.modelToTreeItem(m));
    } catch (error) {
      this.logger.error('[CollectionsTreeProviderV2] Failed to get children', error);
      return [];
    }
  }

  private modelToTreeItem(model: CollectionModel): CollectionTreeItem {
    const hasChildren = model.itemCount > 0;
    const collapsibleState = hasChildren 
      ? vscode.TreeItemCollapsibleState.Collapsed 
      : vscode.TreeItemCollapsibleState.None;

    return new CollectionTreeItem(model, collapsibleState);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
