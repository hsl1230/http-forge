/**
 * AiProviderFactory
 *
 * Single Responsibility: resolve the best available AI provider.
 * Tries BYOK first (if configured), then falls back to Copilot.
 */

import type { IAiProvider } from '@http-forge/core';
import * as vscode from 'vscode';
import { CopilotAiProvider } from './copilot-ai-provider';
import { ByokAiProvider } from './byok-ai-provider';

export async function createAiProvider(
    secrets: vscode.SecretStorage,
): Promise<IAiProvider> {
    // 1. Try BYOK
    const byok = await ByokAiProvider.fromSettings(secrets);
    if (byok) return byok;

    // 2. Fall back to Copilot
    return new CopilotAiProvider();
}
