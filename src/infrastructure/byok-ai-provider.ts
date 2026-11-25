/**
 * ByokAiProvider
 *
 * Implements IAiProvider using user-configured API keys (Bring Your Own Key).
 * Supports OpenAI, Anthropic, and custom OpenAI-compatible endpoints.
 * API keys are stored in VS Code SecretStorage (never in settings.json).
 */

import type { IAiProvider } from '@http-forge/core';
import * as vscode from 'vscode';

export type ByokProviderType = 'openai' | 'anthropic' | 'custom';

export interface ByokConfig {
    provider: ByokProviderType;
    model: string;
    baseUrl?: string;
}

export class ByokAiProvider implements IAiProvider {
    constructor(
        private readonly config: ByokConfig,
        private readonly apiKey: string,
    ) {}

    async complete(prompt: string): Promise<string> {
        const { provider, model, baseUrl } = this.config;
        const key = this.apiKey;

        if (provider === 'anthropic') {
            return this.callAnthropic(prompt, model, key, baseUrl);
        }
        // openai or custom (OpenAI-compatible)
        return this.callOpenAi(prompt, model, key, baseUrl);
    }

    private async callOpenAi(prompt: string, model: string, key: string, baseUrl?: string): Promise<string> {
        const url = baseUrl || 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`OpenAI API error ${response.status}: ${text}`);
        }

        const data = await response.json() as any;
        return data.choices?.[0]?.message?.content ?? '';
    }

    private async callAnthropic(prompt: string, model: string, key: string, baseUrl?: string): Promise<string> {
        const url = baseUrl || 'https://api.anthropic.com/v1/messages';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Anthropic API error ${response.status}: ${text}`);
        }

        const data = await response.json() as any;
        return data.content?.[0]?.text ?? '';
    }

    /**
     * Factory: create from VS Code settings + secret storage.
     * Returns null if not configured.
     */
    static async fromSettings(
        secrets: vscode.SecretStorage,
    ): Promise<ByokAiProvider | null> {
        const cfg = vscode.workspace.getConfiguration('httpForge');
        const provider = cfg.get<string>('ai.provider', 'copilot');
        if (provider === 'copilot') return null;

        const model = cfg.get<string>('ai.model', '');
        if (!model.trim()) return null;

        const apiKey = await secrets.get('httpForge.ai.apiKey');
        if (!apiKey) return null;

        const baseUrl = cfg.get<string>('ai.customBaseUrl', '');
        return new ByokAiProvider(
            { provider: provider as ByokProviderType, model: model.trim(), baseUrl: baseUrl.trim() || undefined },
            apiKey,
        );
    }
}
