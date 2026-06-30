/**
 * AI Environment Variable Suggester — VS Code adapter
 *
 * Thin wrapper around @http-forge/core's scanCollectionForEnvVarsWithAi.
 * All detection logic lives in core; this file only wires in the VS Code
 * CopilotAiProvider and the collection/env services.
 */

import {
    EnvSuggestion,
    ICollectionService,
    IEnvironmentConfigService,
    scanCollectionForEnvVarsWithAi,
} from '@http-forge/core';
import { CopilotAiProvider } from './copilot-ai-provider';

export type { EnvSuggestion };

// ─── Scan ─────────────────────────────────────────────────────────────────────

export async function scanCollectionForEnvVars(
    collectionId: string,
    collectionService: ICollectionService
): Promise<{ suggestions: EnvSuggestion[]; collectionName: string }> {
    const collection = collectionService.getCollection(collectionId);
    if (!collection) {
        throw new Error('Collection not found.');
    }

    const provider = new CopilotAiProvider();
    const suggestions = await scanCollectionForEnvVarsWithAi(collection, provider);
    return { suggestions, collectionName: collection.name };
}

// ─── Apply ────────────────────────────────────────────────────────────────────

export async function applyEnvSuggestions(
    collectionId: string,
    selected: Array<{ value: string; varName: string }>,
    collectionService: ICollectionService,
    envConfigService: IEnvironmentConfigService
): Promise<{ replacedCount: number; addedVars: number; envName: string }> {
    const collection = collectionService.getCollection(collectionId);
    if (!collection) {
        throw new Error('Collection not found.');
    }
    if (selected.length === 0) {
        throw new Error('No suggestions selected.');
    }

    let replacedCount = 0;
    applyReplacementsToItems(collection.items, selected, () => replacedCount++);

    await collectionService.saveCollection(collection);

    for (const s of selected) {
        envConfigService.setEnvironmentVariable(s.varName, s.value);
    }

    const envName = (envConfigService as any).getSelectedEnvironment?.() ?? 'environment';
    return { replacedCount, addedVars: selected.length, envName };
}

// ─── Apply helpers (kept local — VS Code handlers call applyEnvSuggestions) ──

import type { CollectionItem, CollectionRequestItem } from '@http-forge/core';

export function collectAllRequests(items: CollectionItem[]): CollectionRequestItem[] {
    const results: CollectionRequestItem[] = [];
    for (const item of items) {
        if (item.type === 'request') {
            results.push(item as CollectionRequestItem);
        } else if (item.type === 'folder' && (item as any).items) {
            results.push(...collectAllRequests((item as any).items));
        }
    }
    return results;
}

export function findOccurrences(
    requests: CollectionRequestItem[],
    value: string
): Array<{ requestId: string; requestName: string; field: string }> {
    const results: Array<{ requestId: string; requestName: string; field: string }> = [];
    for (const r of requests) {
        const name = r.name ?? r.url ?? r.id;
        if (r.url?.includes(value)) {
            results.push({ requestId: r.id, requestName: name, field: 'URL' });
        }
        for (const h of r.headers ?? []) {
            if (String(h.value ?? '').includes(value)) {
                results.push({ requestId: r.id, requestName: name, field: `Header: ${h.key}` });
            }
        }
        for (const q of r.query ?? []) {
            if (String(q.value ?? '').includes(value)) {
                results.push({ requestId: r.id, requestName: name, field: `Query: ${q.key}` });
            }
        }
        if (r.body?.type === 'raw' && typeof r.body.content === 'string' && r.body.content.includes(value)) {
            results.push({ requestId: r.id, requestName: name, field: 'Body' });
        }
    }
    return results;
}

export function applyReplacementsToItems(
    items: CollectionItem[],
    selected: Array<{ value: string; varName: string }>,
    onReplaced: () => void
): void {
    for (const item of items) {
        if (item.type === 'folder' && (item as any).items) {
            applyReplacementsToItems((item as any).items, selected, onReplaced);
        } else if (item.type === 'request') {
            const req = item as CollectionRequestItem;
            for (const s of selected) {
                const ph = `{{${s.varName}}}`;
                if (req.url?.includes(s.value)) {
                    req.url = req.url.split(s.value).join(ph);
                    onReplaced();
                }
                for (const h of req.headers ?? []) {
                    if (String(h.value ?? '').includes(s.value)) {
                        h.value = String(h.value).split(s.value).join(ph);
                        onReplaced();
                    }
                }
                for (const q of req.query ?? []) {
                    if (String(q.value ?? '').includes(s.value)) {
                        q.value = String(q.value).split(s.value).join(ph);
                        onReplaced();
                    }
                }
                if (req.body?.type === 'raw' && typeof req.body.content === 'string' && req.body.content.includes(s.value)) {
                    (req.body as any).content = (req.body.content as string).split(s.value).join(ph);
                    onReplaced();
                }
            }
        }
    }
}

