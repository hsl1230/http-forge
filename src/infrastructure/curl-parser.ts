/**
 * Curl Command Parser
 *
 * Uses GitHub Copilot to parse a curl command into an HTTP Forge request structure.
 * Also detects hardcoded values and suggests parametrizing them as {{variables}}.
 */

import { KeyValueEntry } from '@http-forge/core';
import * as vscode from 'vscode';

export interface ParsedCurlRequest {
    name: string;
    method: string;
    url: string;
    headers: KeyValueEntry[];
    query: KeyValueEntry[];
    body: { type: 'raw'; contentType: string; content: string } | null;
    /** Suggested env vars extracted from hardcoded values */
    suggestedVars: Array<{ key: string; value: string }>;
}

/**
 * Parse a curl command string using GitHub Copilot and return a structured request.
 */
export async function parseCurlCommand(curlCommand: string): Promise<ParsedCurlRequest> {
    const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (!models.length) {
        throw new Error('GitHub Copilot is not available. Install and sign in to Copilot.');
    }

    const prompt = `Parse the following curl command into a structured HTTP request JSON object.

curl command:
${curlCommand.trim()}

Return ONLY a valid JSON object with this exact shape (no markdown fences):
{
  "name": "short descriptive name for this request",
  "method": "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS",
  "url": "full URL with hardcoded values replaced by {{varName}} placeholders where appropriate (base URL, API keys in URL, tenant IDs, etc.)",
  "headers": [{"name": "Header-Name", "value": "value or {{varName}}", "enabled": true}],
  "query": [{"name": "paramName", "value": "value or {{varName}}", "enabled": true}],
  "body": null or {"type": "raw", "contentType": "application/json", "content": "raw body string"},
  "suggestedVars": [{"key": "varName", "value": "the original hardcoded value"}]
}

Rules:
- Extract base URLs (scheme + host + optional port) to {{baseUrl}}
- Extract Authorization header values to {{authToken}} or {{apiKey}}
- Extract any UUIDs, org/tenant IDs in path/query to sensible {{varName}}
- suggestedVars must list every {{varName}} placeholder with its original value
- query params that appear in the URL should appear in "query", not in the URL string
- If no body, body is null`;

    const cts = new vscode.CancellationTokenSource();
    const response = await models[0].sendRequest(
        [vscode.LanguageModelChatMessage.User(prompt)],
        {},
        cts.token
    );

    let raw = '';
    for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) { raw += part.value; }
    }

    // Extract JSON object from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Could not parse AI response. Try again with a simpler curl command.');
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedCurlRequest;

    // Normalise fields
    parsed.method = (parsed.method ?? 'GET').toUpperCase();
    parsed.headers = (parsed.headers ?? []).map(h => ({ ...h, enabled: h.enabled !== false }));
    parsed.query = (parsed.query ?? []).map(q => ({ ...q, enabled: q.enabled !== false }));
    parsed.suggestedVars = parsed.suggestedVars ?? [];

    return parsed;
}
