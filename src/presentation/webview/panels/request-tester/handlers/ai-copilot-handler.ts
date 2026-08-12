/**
 * AI features that open GitHub Copilot Chat with the query pre-filled and
 * context files attached: generate a script, generate contract tests, chat,
 * suggest assertions, and the generic open-in-copilot command.
 */

import * as vscode from 'vscode';
import { IWebviewMessenger } from '../../../shared-interfaces';
import { AiOperations } from './ai-operations';

export class AiCopilotHandler {
  constructor(private readonly ai: AiOperations) {}

  async generateScript(
    message: {
      phase?: string; description?: string; existingScript?: string; method?: string; url?: string;
      responseStatus?: number; responseBody?: string; responseContentType?: string;
      chatHistory?: Array<{ role: string; content: string }>;
      historyContext?: string;
    },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const hasCopilot = !!vscode.extensions.getExtension('GitHub.copilot-chat');
    if (!hasCopilot) {
      messenger.postMessage({ command: 'aiGeneratedScript', phase: message.phase ?? 'post-response', error: 'GitHub Copilot Chat is required.' });
      return;
    }

    const phase = message.phase ?? 'post-response';
    const attachFiles = this.ai.getRequestDirAttachFiles();
    const fileBlock = attachFiles.length
      ? `\nRequest files (description, existing scripts, request body, and response schema are attached)\n`
      : '';

    const responseBlock = message.responseStatus
      ? `\nLast response: HTTP ${message.responseStatus}` +
        (message.responseContentType ? ` | ${message.responseContentType}` : '') +
        (message.responseBody ? `\nResponse body:\n${message.responseBody.slice(0, 800)}` : '')
      : '';

    const query = this.ai.buildCopilotQuery(
      `Generate a ${phase} JavaScript pm.js script for this HTTP request in HTTP Forge.\n\n` +
      `Request: ${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      (message.description ? `Instruction: "${message.description}"\n` : '') +
      fileBlock +
      responseBlock +
      `\nPlease:\n` +
      `1. Read the request files above — they contain the endpoint description, existing scripts (extend or improve, don't replace), and response schema.\n` +
      `2. Understand the business context from the description, the collection/suite in this workspace, and the backend source code (attach it if needed). ` +
      `If a Confluence/Jira MCP server is configured, it may add extra context — otherwise skip it.\n` +
      `3. Generate a ${phase} pm.js script that is idiomatic, concise, and handles the business rules.\n` +
      `4. Use pm.* Postman sandbox APIs only. Return raw JavaScript (no markdown fences, no explanation).\n\n` +
      `💡 Drag your backend service/controller files here for even richer context.`
    );

    try {
      await this.ai.openCopilotChat(query, attachFiles);
      messenger.postMessage({ command: 'aiGeneratedScript', phase, openedInCopilot: true });
    } catch (err: any) {
      messenger.postMessage({ command: 'aiGeneratedScript', phase, error: err?.message ?? 'Failed to open Copilot Chat.' });
    }
  }

  async generateContractTests(
    message: { status?: number; body?: string; contentType?: string; method?: string; url?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const hasCopilot = !!vscode.extensions.getExtension('GitHub.copilot-chat');
    if (!hasCopilot) {
      messenger.postMessage({ command: 'aiContractTestsResult', error: 'GitHub Copilot Chat is required.' });
      return;
    }

    const attachFiles = this.ai.getRequestDirAttachFiles();
    const fileBlock = attachFiles.length
      ? `\nRequest files (responseSchema and related request artifacts are attached)\n`
      : '';

    const truncatedBody = (message.body ?? '').slice(0, 1500);
    const query = this.ai.buildCopilotQuery(
      `Generate comprehensive contract pm.test() assertions for this HTTP request in HTTP Forge.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `HTTP ${message.status ?? '?'}` +
      (message.contentType ? ` | ${message.contentType}` : '') +
      (truncatedBody ? `\nResponse body:\n${truncatedBody}` : '') +
      fileBlock +
      `\nPlease:\n` +
      `1. Read the request files above — the \`responseSchema\` field is the authoritative contract. If present, generate assertions that verify EVERY constraint (required fields, types, formats, enums, ranges).\n` +
      `2. If no schema is present, infer the contract from the response body structure.\n` +
      `3. Also check business rules from the workspace collections/suites and backend source. If a Confluence/Jira MCP server is configured, use it as extra context — otherwise skip it.\n` +
      `4. Generate exhaustive pm.test() assertions: field presence, types, formats, value constraints, array items.\n` +
      `5. Check existing post-response script in the request files — avoid duplicating existing assertions.\n\n` +
      `Return pm.test() snippets ready to paste into the post-response script.`
    );

    try {
      await this.ai.openCopilotChat(query, attachFiles);
      messenger.postMessage({ command: 'aiContractTestsResult', openedInCopilot: true });
    } catch (err: any) {
      messenger.postMessage({ command: 'aiContractTestsResult', error: err?.message ?? 'Failed to open Copilot Chat.' });
    }
  }

  async chat(
    message: {
      messages?: Array<{ role: string; content: string }>;
      newMessage?: string;
      context?: {
        method?: string; url?: string;
        headers?: string; requestBody?: string; requestBodyType?: string;
        status?: number; statusText?: string;
        responseBody?: string; contentType?: string;
        responseHistorySummary?: string;
        endpointHistory?: string;
      };
    },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const hasCopilot = !!vscode.extensions.getExtension('GitHub.copilot-chat');
    if (!hasCopilot) {
      messenger.postMessage({ command: 'aiChatResponse', error: 'GitHub Copilot Chat is required. Install it from the Extensions marketplace.' });
      return;
    }

    const ctx = message.context ?? {};
    const history = message.messages ?? [];

    // Build a rich context preamble so Copilot understands the HTTP Forge session
    const requestSection =
      `API request: ${ctx.method ?? 'GET'} ${ctx.url || '(URL not set)'}` +
      (ctx.headers ? `\nHeaders:\n${ctx.headers}` : '') +
      (ctx.requestBody && ctx.requestBodyType !== 'none'
        ? `\nRequest body (${ctx.requestBodyType ?? 'raw'}):\n${ctx.requestBody}` : '');

    const responseSection = ctx.status
      ? `Last HTTP response: HTTP ${ctx.status}${ctx.statusText ? ` ${ctx.statusText}` : ''}` +
        (ctx.contentType ? `\nContent-Type: ${ctx.contentType}` : '') +
        (ctx.responseBody ? `\nResponse body:\n${ctx.responseBody}` : '')
      : 'No HTTP response received yet.';

    const historySection = ctx.endpointHistory
      ? `\nCall history for this endpoint:\n${ctx.endpointHistory}` : '';

    const attachFiles = this.ai.getRequestDirAttachFiles();
    const fileBlock = attachFiles.length
      ? `\nRequest files (description, existing scripts, and response schema are attached)\n`
      : '';

    const priorContext = history.length > 0
      ? `\n\nPrior conversation context (${Math.ceil(history.length / 2)} turn${history.length > 2 ? 's' : ''}):\n` +
        history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 200)}`).join('\n')
      : '';

    const query = this.ai.buildCopilotQuery(
      `I'm using HTTP Forge (a VS Code API testing extension) and need help with the following request.\n\n` +
      `${requestSection}\n\n${responseSection}${historySection}${fileBlock}${priorContext}\n\n` +
      `My question: ${message.newMessage ?? 'Please help me with this API request.'}`
    );

    try {
      await this.ai.openCopilotChat(query, attachFiles);
      // Signal the webview that we've opened Copilot Chat (no response body needed)
      messenger.postMessage({ command: 'aiChatResponse', openedInCopilot: true });
    } catch (err: any) {
      messenger.postMessage({ command: 'aiChatResponse', error: err?.message ?? 'Failed to open Copilot Chat.' });
    }
  }

  async suggestAssertions(
    message: {
      status?: number;
      body?: string;
      contentType?: string;
      method?: string;
      url?: string;
    },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const hasCopilot = !!vscode.extensions.getExtension('GitHub.copilot-chat');
    if (!hasCopilot) {
      messenger.postMessage({
        command: 'aiAssertionSuggestions',
        error: 'GitHub Copilot Chat is required. Install it from the Extensions marketplace.'
      });
      return;
    }

    // Attach the request directory and the history folder so Copilot can inspect the files directly
    const attachFiles: vscode.Uri[] = [
      ...this.ai.getRequestDirAttachFiles(),
      ...this.ai.getHistoryAttachFiles()
    ];

    const fileRefBlock = attachFiles.length > 0
      ? `\nContext files (description, existing assertions, response schema, and history are attached)\n`
      : '';

    const truncatedResponseBody = (message.body ?? '').slice(0, 1500);
    const requestLine = `${message.method ?? 'GET'} ${message.url ?? '(URL unknown)'}`;
    const responseBlock =
      `HTTP ${message.status ?? '?'}` +
      (message.contentType ? ` | ${message.contentType}` : '') +
      (truncatedResponseBody ? `\nResponse body:\n${truncatedResponseBody}` : '');

    const query = this.ai.buildCopilotQuery(
      `I need high-quality business-level pm.test() assertions for this HTTP request.\n\n` +
      `${requestLine}\n${responseBlock}\n` +
      fileRefBlock +
      `\nPlease:\n` +
      `1. Read the context files above — they contain the request description (business intent), ` +
      `existing assertions (don't duplicate), response schema (contract), and call history (patterns).\n` +
      `2. **Gather additional business context** (priority order):\n` +
      `   a. Source files above — **highest priority, treat as ground truth**\n` +
      `   b. The response body above — fallback only\n` +
      `   c. Optional: a Confluence/Jira MCP server, if one is configured AND the team keeps ` +
      `      knowledge pages there — search by endpoint URL or feature name\n` +
      `   If code and docs conflict, follow the code and note the discrepancy.\n` +
      `3. Identify **business invariants** that must hold (e.g. "total = sum of line items", "token expires in 24h").\n` +
      `4. Generate **pm.test() assertions** that verify those invariants. Avoid generic status/field-exists checks.\n` +
      `5. Also suggest assertions that verify nothing sensitive is leaked (passwords, secrets, internal IDs).\n\n` +
      `💡 Drag backend service/controller/domain model files here for even richer context.`
    );

    try {
      await this.ai.openCopilotChat(query, attachFiles);
      messenger.postMessage({ command: 'aiAssertionSuggestions', openedInCopilot: true });
    } catch (err: any) {
      messenger.postMessage({
        command: 'aiAssertionSuggestions',
        error: err?.message ?? 'Failed to open Copilot Chat.'
      });
    }
  }

  async openInCopilot(message: { query?: string; extraFiles?: string[] }): Promise<void> {
    // Reconstruct URI objects from serialized file paths sent from the webview.
    const extraFiles = (message.extraFiles ?? []).map(path => vscode.Uri.file(path));
    await this.ai.openCopilotChat(message.query ?? '', extraFiles);
  }
}
