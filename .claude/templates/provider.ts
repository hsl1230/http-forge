import * as vscode from 'vscode';

export class {{ProviderName}} implements vscode.TreeDataProvider<vscode.TreeItem> {
  onDidChangeTreeData?: vscode.Event<vscode.TreeItem | null | undefined> | undefined;
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }
  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    return [];
  }
}
