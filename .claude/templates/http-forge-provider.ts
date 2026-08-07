import * as vscode from 'vscode';

// Template for a tree provider
export class SampleTreeItem extends vscode.TreeItem {
  constructor(public readonly id: string, public readonly label: string) {
    super(label);
    this.contextValue = 'sampleItem';
  }
}

export class SampleTreeProvider implements vscode.TreeDataProvider<SampleTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SampleTreeItem | undefined | null> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<SampleTreeItem | undefined | null> = this._onDidChangeTreeData.event;

  constructor() {}

  getTreeItem(element: SampleTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SampleTreeItem): Thenable<SampleTreeItem[]> {
    return Promise.resolve([new SampleTreeItem('1', 'Example')]);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
