/**
 * CopilotAiProvider
 *
 * Implements IAiProvider using the VS Code Language Model API (GitHub Copilot).
 * This is the VS Code-specific adapter for @http-forge/core's AI utilities.
 */

import type { IAiProvider } from '@http-forge/core';
import * as vscode from 'vscode';

export class CopilotAiProvider implements IAiProvider {
    async complete(prompt: string): Promise<string> {
        const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        if (!models.length) {
            throw new Error('GitHub Copilot is not available. Install and sign in to the Copilot extension.');
        }
        const model = models[0];
        const cts = new vscode.CancellationTokenSource();

        const response = await model.sendRequest(
            [vscode.LanguageModelChatMessage.User(prompt)],
            {},
            cts.token
        );

        let raw = '';
        for await (const part of response.stream) {
            if (part instanceof vscode.LanguageModelTextPart) raw += part.value;
        }
        return raw;
    }
}
