/**
 * AI Collection Enhancer — VS Code adapter
 *
 * Thin wrapper around @http-forge/core's enhanceCollection.
 * All logic (prompts, parsing, applying) lives in core.
 * This file only bridges the VS Code progress API.
 */

import { Collection, enhanceCollection, ICollectionService } from '@http-forge/core';
import * as vscode from 'vscode';
import { CopilotAiProvider } from './copilot-ai-provider';

export async function enhanceCollectionWithAi(
    collection: Collection,
    collectionService: ICollectionService,
    progress?: vscode.Progress<{ message?: string; increment?: number }>
): Promise<void> {
    const provider = new CopilotAiProvider();
    await enhanceCollection(collection, collectionService, provider, (message, increment) => {
        progress?.report({ message, increment });
    });
}
