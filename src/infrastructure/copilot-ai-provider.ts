/**
 * CopilotAiProvider
 *
 * Implements IAiProvider using the VS Code Language Model API (GitHub Copilot).
 * This is the VS Code-specific adapter for @http-forge/core's AI utilities.
 *
 * Model selection: prefers the model named in `httpForge.ai.model` when set,
 * otherwise the first available Copilot model. If Copilot itself is unavailable
 * it falls back to any other installed chat model, and only then reports a
 * friendly error.
 */

import type { IAiProvider } from '@http-forge/core';
import * as vscode from 'vscode';

export class CopilotAiProvider implements IAiProvider {
    async complete(prompt: string): Promise<string> {
        const model = await this.selectModel();
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

    private async selectModel(): Promise<vscode.LanguageModelChat> {
        const preferred = this.getPreferredModelId();

        // Prefer a Copilot model, matching the user-configured model when present.
        const copilotModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        const chosen = this.pickModel(copilotModels, preferred);
        if (chosen) return chosen;

        // Graceful fallback: any installed chat model (local models, other vendors).
        const anyModels = await vscode.lm.selectChatModels();
        const fallback = this.pickModel(anyModels, preferred);
        if (fallback) return fallback;

        throw new Error(
            'No AI chat model is available. Install and sign in to GitHub Copilot, or enable a local language model (e.g. via the VS Code LM API / Continue).'
        );
    }

    private getPreferredModelId(): string {
        const cfg = vscode.workspace.getConfiguration('httpForge');
        const model = cfg.get<string>('ai.model', '');
        return model?.trim() ?? '';
    }

    private pickModel(
        models: readonly vscode.LanguageModelChat[],
        preferred: string
    ): vscode.LanguageModelChat | undefined {
        if (preferred) {
            const byId = models.find((m) => m.id === preferred);
            if (byId) return byId;
            const byName = models.find((m) => m.name === preferred);
            if (byName) return byName;
        }
        return models[0];
    }
}
