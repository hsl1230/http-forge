/**
 * Shared utility functions for HTTP Forge
 */

import type { CollectionRequest } from '@http-forge/core';

/**
 * Group info for request context (branch/ticket tracking)
 */
export interface GroupInfo {
    branch?: string;
    ticket?: string | null;
}

/**
 * Request context for webview communication
 */
export interface RequestContext {
    title?: string;
    collectionId?: string;
    requestId?: string;
    requestPath?: string;
    folderPath?: string;
    collectionName?: string;
    request?: CollectionRequest;
    readonly?: boolean;
    allowSave?: boolean;  // Allow save even in readonly mode (for Endpoint Tester)
    group?: GroupInfo;
    allowDuplicatedName?: boolean; // Allow duplicate request names in collection editor
}

/**
 * Ensure a CollectionRequest has all default values set
 * Normalizes headers/query enabled flags and provides defaults for optional fields.
 * Preserves all extended KeyValueEntry fields (type, required, description, format, enum, deprecated)
 * and top-level metadata (deprecated, description, responseSchema, bodySchema).
 */
export function ensureRequestDefaults(item: Partial<CollectionRequest>): CollectionRequest {
    // Ensure enabled defaults to true for headers/query — spread to preserve extended fields
    const query = (item.query || []).map((q) => ({
        ...q,
        enabled: q.enabled !== false
    }));

    const headers = (item.headers || []).map((h) => ({
        ...h,
        enabled: h.enabled !== false
    }));

    return {
        id: item.id || item.name || '',
        name: item.name || '',
        method: item.method || 'GET',
        url: item.url || '',
        headers,
        query,
        params: item.params,
        body: item.body || null,
        scripts: {
            preRequest: item.scripts?.preRequest || '',
            postResponse: item.scripts?.postResponse || ''
        },
        auth: item.auth,
        settings: item.settings,
        // Preserve OpenAPI metadata
        deprecated: item.deprecated,
        description: item.description,
        doc: item.doc,
        responseSchema: item.responseSchema,
        bodySchema: item.bodySchema
    };
}

