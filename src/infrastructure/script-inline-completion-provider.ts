/**
 * ScriptInlineCompletionProvider
 *
 * Provides AI-powered inline completions for pre-request.js and post-response.js
 * files opened in VS Code's editor. Uses the same AI provider as the webview.
 */

import * as vscode from 'vscode';
import { CopilotAiProvider } from './copilot-ai-provider';

export class ScriptInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken,
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
        // Only activate for script files in HTTP Forge collections
        const filePath = document.uri.fsPath;
        if (!filePath.includes('scripts') || !filePath.endsWith('.js')) return [];

        // Get the current line and surrounding context
        const line = document.lineAt(position.line).text;
        const prefix = line.substring(0, position.character);

        // Only trigger if the line has some content (not empty)
        if (!prefix.trim()) return [];

        // Get surrounding context (up to 30 lines)
        const startLine = Math.max(0, position.line - 15);
        const endLine = Math.min(document.lineCount - 1, position.line + 15);
        const contextText = document.getText(new vscode.Range(startLine, 0, endLine, 0));

        // Determine script type
        const isPreRequest = filePath.includes('pre-request');
        const scriptType = isPreRequest ? 'pre-request' : 'post-response';

        const prompt = `You are an HTTP Forge script assistant. Complete the following JavaScript code for a ${scriptType} script. The code uses the pm/ctx/hf API (Postman-compatible). Available globals: pm, ctx, hf, request, response, responseBody, tests, postman, CryptoJS, moment, _, querystring, require, console, Buffer, URL, atob/btoa.

Return ONLY the completion text (no markdown, no explanation). Complete from the cursor position.

Current script:
${contextText}

Cursor is at line ${position.line + 1}, column ${position.character + 1}. The current line prefix is: "${prefix}"
Complete the next part:`;

        try {
            const provider = new CopilotAiProvider();
            const completion = await provider.complete(prompt);
            const trimmed = completion.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');

            if (!trimmed) return [];

            return [new vscode.InlineCompletionItem(trimmed)];
        } catch {
            return [];
        }
    }
}
