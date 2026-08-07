import * as vscode from 'vscode';

export async function openCopilotPromptEditor(initialQuery: string, attachFiles: vscode.Uri[] = []): Promise<void> {
    const hasCopilot = !!vscode.extensions.getExtension('GitHub.copilot-chat');
    if (!hasCopilot) {
        vscode.window.showInformationMessage('GitHub Copilot Chat is required. Install it from the Extensions marketplace.');
        return;
    }

    const panel = vscode.window.createWebviewPanel(
        'promptEditor',
        'Edit Prompt',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    const escapeHtml = (text: string): string => text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    const escapedQuery = escapeHtml(initialQuery);

    panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { padding: 0; margin: 0; height: 100vh; display: flex; flex-direction: column; }
                textarea { flex: 1; width: 100%; resize: none; padding: 10px; box-sizing: border-box; font-family: monospace; }
                button { padding: 8px 16px; cursor: pointer; }
            </style>
        </head>
        <body>
            <textarea id="prompt">${escapedQuery}</textarea>
            <button onclick="submit()">Use prompt</button>
            <script>
                const vscode = acquireVsCodeApi();
                function submit() {
                    vscode.postMessage({ text: document.getElementById('prompt').value });
                }
            </script>
        </body>
        </html>
    `;

    const message = await new Promise<{ text: string | null }>(resolve => {
        panel.webview.onDidReceiveMessage(resolve);
        panel.onDidDispose(() => resolve({ text: null }));
    });

    panel.dispose();

    if (!message.text) {
        return;
    }

    await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: message.text,
        ...(attachFiles.length ? { attachFiles } : {})
    });
}
