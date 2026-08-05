import * as vscode from 'vscode';

export function register{{COMMAND_NAME}}Command(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('{{COMMAND_ID}}', async () => {
    // Implement command logic here
    vscode.window.showInformationMessage('{{COMMAND_TITLE}} executed');
  });
  context.subscriptions.push(disposable);
}
