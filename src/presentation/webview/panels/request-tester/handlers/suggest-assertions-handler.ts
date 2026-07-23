import { ICollectionService, IEnvironmentConfigService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { IPanelContextProvider } from '../interfaces';

/**
 * Handles all AI-powered features in the Request Tester panel via vscode.lm (Copilot).
 * No external API key required — uses the active GitHub Copilot model.
 *
 * Commands handled:
 *   applyAssertions           – append generated assertions to the collection post-response script
 *   aiSuggestAssertions       – generate pm.test() snippets from a live response
 *   aiExplainResponse         – explain response body / diagnose 4xx-5xx errors
 *   aiFixTest                 – diagnose & fix a failing pm.test() assertion
 *   aiGenerateScript          – write a pre/post-request pm.js script from a natural-language description
 *   aiGenerateDocs            – write markdown API docs for the current request
 *   aiGenerateBody            – generate a sample request body from a description
 *   aiGenerateContractTests   – generate exhaustive structural pm.test() contract assertions
 *   aiExtractVariables        – detect response fields to save as pm.environment vars
 *   aiGenerateTypes           – generate TypeScript interfaces from response JSON
 *   aiDetectHardcoded         – scan request for hardcoded values that should be env vars
 *   aiCompareResponses        – semantically compare two responses for the same endpoint
 *   aiChat                    – context-aware multi-turn chat scoped to current request
 */
export class SuggestAssertionsHandler implements IMessageHandler {
  constructor(
    private contextProvider: IPanelContextProvider,
    private collectionService?: ICollectionService,
    private envConfigService?: IEnvironmentConfigService
  ) {}

  getSupportedCommands(): string[] {
    return [
      'applyAssertions',
      'aiSuggestAssertions',
      'aiExplainResponse',
      'aiFixTest',
      'aiGenerateScript',
      'aiGenerateDocs',
      'aiGenerateBody',
      'aiGenerateContractTests',
      'aiExtractVariables',
      'aiGenerateTypes',
      'aiDetectHardcoded',
      'aiCompareResponses',
      'aiChat',
      'openInCopilot',
      'addExtractedVarsToEnv',
    ];
  }

  /** Maps each AI command to the result command the webview expects back. */
  private static readonly resultCommands: Record<string, string> = {
    aiExplainResponse:       'aiExplainResult',
    aiSuggestAssertions:     'aiAssertionSuggestions',
    aiFixTest:               'aiFixTestResult',
    aiGenerateScript:        'aiGeneratedScript',
    aiGenerateDocs:          'aiGeneratedDocs',
    aiGenerateBody:          'aiGeneratedBody',
    aiGenerateContractTests: 'aiContractTestsResult',
    aiExtractVariables:      'aiExtractVarsResult',
    aiGenerateTypes:         'aiGeneratedTypes',
    aiDetectHardcoded:       'aiDetectedHardcoded',
    aiCompareResponses:      'aiCompareResult',
    aiChat:                  'aiChatResponse',
  };

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    try {
      switch (command) {
        case 'applyAssertions':         await this.handleApplyAssertions(message, messenger);         return true;
        case 'aiSuggestAssertions':     await this.handleAiSuggestAssertions(message, messenger);     return true;
        case 'aiExplainResponse':       await this.handleAiExplainResponse(message, messenger);       return true;
        case 'aiFixTest':               await this.handleAiFixTest(message, messenger);               return true;
        case 'aiGenerateScript':        await this.handleAiGenerateScript(message, messenger);        return true;
        case 'aiGenerateDocs':          await this.handleAiGenerateDocs(message, messenger);          return true;
        case 'aiGenerateBody':          await this.handleAiGenerateBody(message, messenger);          return true;
        case 'aiGenerateContractTests': await this.handleAiGenerateContractTests(message, messenger); return true;
        case 'aiExtractVariables':      await this.handleAiExtractVariables(message, messenger);      return true;
        case 'aiGenerateTypes':         await this.handleAiGenerateTypes(message, messenger);         return true;
        case 'aiDetectHardcoded':       await this.handleAiDetectHardcoded(message, messenger);       return true;
        case 'aiCompareResponses':      await this.handleAiCompareResponses(message, messenger);      return true;
        case 'aiChat':                  await this.handleAiChat(message, messenger);                  return true;
        case 'openInCopilot':            await this.handleOpenInCopilot(message);                      return true;
        case 'addExtractedVarsToEnv':   await this.handleAddExtractedVarsToEnv(message, messenger);   return true;
        default:                        return false;
      }
    } catch (err: any) {
      // Ensure the webview always gets a response so it never stays stuck on the loading spinner.
      const resultCmd = SuggestAssertionsHandler.resultCommands[command];
      if (resultCmd) {
        messenger.postMessage({ command: resultCmd, error: err?.message ?? 'AI request failed.' });
      }
      return false;
    }
  }

  // ─── Shared LM helper ────────────────────────────────────────────────────────

  /**
   * Build a Copilot Chat query string from a prompt string.
   * Appends a friendly opening so the session starts naturally.
   */
  private buildCopilotQuery(prompt: string): string {
    // Trim to a reasonable length so the chat panel doesn't overflow
    const mcpFallback =
      `\n\n---\n` +
      `> **No MCP/Confluence/Jira tools available?** Ask the user to either:\n` +
      `> - Configure an MCP server (Confluence/Jira) in VS Code Copilot settings\n` +
      `> - Or paste the relevant Confluence page, Jira ticket, or API spec content here\n` +
      `>\n` +
      `> **No backend code?** Ask the user to attach the relevant service/controller/domain model files.`;
    return (prompt + mcpFallback).slice(0, 3500);
  }

  /**
   * Open GitHub Copilot Chat with the given query pre-filled.
   * Falls back gracefully if Copilot Chat isn't installed.
   */
  private async handleOpenInCopilot(message: { query?: string }): Promise<void> {
    const hasCopilot = !!vscode.extensions.getExtension('GitHub.copilot-chat');
    if (!hasCopilot) {
      vscode.window.showInformationMessage('GitHub Copilot Chat is required. Install it from the Extensions marketplace.');
      return;
    }
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: message.query ?? ''
    });
  }

  private async callLm(prompt: string): Promise<{ raw: string } | { error: string }> {
    try {
      const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (!models.length) {
        return { error: 'GitHub Copilot is not available. Please sign in to use AI features.' };
      }
      const cts = new vscode.CancellationTokenSource();
      const response = await models[0].sendRequest(
        [vscode.LanguageModelChatMessage.User(prompt)],
        {},
        cts.token
      );
      let raw = '';
      for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) raw += part.value;
      }
      return { raw };
    } catch (err: any) {
      return { error: err?.message ?? 'AI request failed.' };
    }
  }

  // ─── Shared helper ───────────────────────────────────────────────────────

  private buildChatBlock(chatHistory?: Array<{ role: string; content: string }>): string {
    if (!chatHistory?.length) return '';
    return `\nRecent chat context (use if relevant):\n` +
      chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 200)}`).join('\n');
  }

  private buildHistoryBlock(historyContext?: string): string {
    if (!historyContext?.trim()) return '';
    return `\nPast calls to this endpoint (most recent first):\n${historyContext}\n`;
  }

  // ─── Feature 1: Explain / diagnose response ──────────────────────────────

  private async handleAiExplainResponse(
    message: { status?: number; statusText?: string; body?: string; contentType?: string; method?: string; url?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.body ?? '').slice(0, 2000);
    const prompt =
      `You are an HTTP API expert assistant.\n` +
      `Explain this HTTP response concisely in 3-6 sentences.\n` +
      `Focus on what the data means, notable patterns, and flag potential issues.\n` +
      `If status is 4xx/5xx, explain the likely cause and how to fix it.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Status: ${message.status ?? '?'} ${message.statusText ?? ''}\n` +
      `Content-Type: ${message.contentType ?? 'unknown'}\n` +
      `Body:\n${truncatedBody}\n` +
      this.buildChatBlock(message.chatHistory) +
      this.buildHistoryBlock(message.historyContext) +
      `\nReply with plain text only (no markdown headers or fences). Under 150 words.`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiExplainResult', error: result.error });
    } else {
      messenger.postMessage({
        command: 'aiExplainResult',
        text: result.raw.trim(),
        copilotQuery: this.buildCopilotQuery(prompt)
      });
    }
  }

  // ─── Feature 2: Fix a failing pm.test() ──────────────────────────────────

  private async handleAiFixTest(
    message: { testName?: string; error?: string; method?: string; url?: string; responseStatus?: number; responseBody?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.responseBody ?? '').slice(0, 1500);

    // Attach the request file dir so Copilot can read the full post-response script
    const historyStorage = this.contextProvider.getHistoryStoragePath();
    const requestDirPath = historyStorage?.requestPath ?? '';
    const fileRef = requestDirPath
      ? `#file:${vscode.workspace.asRelativePath(requestDirPath, false)}`
      : '';
    const fileBlock = fileRef
      ? `\nRequest file (contains full post-response script with this test): ${fileRef}\n`
      : '';

    const prompt =
      `A Postman pm.test() assertion failed. Explain why and provide a corrected pm.test() snippet.\n\n` +
      `Test name: "${message.testName ?? ''}"\n` +
      `Assertion error: ${message.error ?? ''}\n` +
      `Request: ${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Response status: ${message.responseStatus ?? '?'}\n` +
      `Response body (truncated):\n${truncatedBody}\n` +
      fileBlock +
      `\nReturn ONLY valid JSON, no markdown fences:\n` +
      `{"explanation":"<why it failed in one sentence>","snippet":"pm.test(\\"...\\",...) { ... };"}`;

    const copilotQuery = this.buildCopilotQuery(
      `A pm.test() assertion is failing and I need help fixing it.\n\n` +
      `Test: "${message.testName ?? ''}"\nError: ${message.error ?? ''}\n` +
      `Request: ${message.method ?? 'GET'} ${message.url ?? ''} | HTTP ${message.responseStatus ?? '?'}\n` +
      (fileRef ? `\nFull post-response script: ${fileRef}\n` : '') +
      `\nResponse body:\n${truncatedBody}\n\n` +
      `Please explain why this assertion fails and provide a corrected pm.test() snippet.`
    );

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiFixTestResult', testName: message.testName, error: result.error, copilotQuery });
      return;
    }
    try {
      const cleaned = result.raw.replace(/^```(?:json)?\n?/gm, '').replace(/^```\s*$/gm, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      messenger.postMessage({ command: 'aiFixTestResult', testName: message.testName, ...parsed, copilotQuery });
    } catch {
      messenger.postMessage({ command: 'aiFixTestResult', testName: message.testName, error: 'Could not parse AI response. Try again.', copilotQuery });
    }
  }

  // ─── Feature 3: Generate pre/post-request script ──────────────────────────

  private async handleAiGenerateScript(
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
    const historyStorage = this.contextProvider.getHistoryStoragePath();
    const requestDirPath = historyStorage?.requestPath ?? '';
    const fileRef = requestDirPath
      ? `#file:${vscode.workspace.asRelativePath(requestDirPath, false)}`
      : '';
    const fileBlock = fileRef
      ? `\nRequest files (description, existing scripts, request body, response schema): ${fileRef}\n`
      : '';

    const responseBlock = message.responseStatus
      ? `\nLast response: HTTP ${message.responseStatus}` +
        (message.responseContentType ? ` | ${message.responseContentType}` : '') +
        (message.responseBody ? `\nResponse body:\n${message.responseBody.slice(0, 800)}` : '')
      : '';

    const query = this.buildCopilotQuery(
      `Generate a ${phase} JavaScript pm.js script for this HTTP request in HTTP Forge.\n\n` +
      `Request: ${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      (message.description ? `Instruction: "${message.description}"\n` : '') +
      fileBlock +
      responseBlock +
      `\nPlease:\n` +
      `1. Read the request files above — they contain the endpoint description, existing scripts (extend or improve, don't replace), and response schema.\n` +
      `2. Understand the business context from the description and any Confluence/Jira MCP tools if available.\n` +
      `3. Generate a ${phase} pm.js script that is idiomatic, concise, and handles the business rules.\n` +
      `4. Use pm.* Postman sandbox APIs only. Return raw JavaScript (no markdown fences, no explanation).\n\n` +
      `💡 Drag your backend service/controller files here for even richer context.`
    );

    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', { query });
      messenger.postMessage({ command: 'aiGeneratedScript', phase, openedInCopilot: true });
    } catch (err: any) {
      messenger.postMessage({ command: 'aiGeneratedScript', phase, error: err?.message ?? 'Failed to open Copilot Chat.' });
    }
  }

  // ─── Feature 4: Generate request documentation ───────────────────────────

  private async handleAiGenerateDocs(
    message: { method?: string; url?: string; headers?: string[]; body?: string; responseStatus?: number; responseBody?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const headerList = (message.headers ?? []).join(', ') || 'none';
    const bodyBlock = message.body?.trim() ? `\nRequest body:\n${message.body.slice(0, 800)}` : '';
    const responseBlock = message.responseStatus
      ? `\nExample response: ${message.responseStatus}\n${(message.responseBody ?? '').slice(0, 600)}`
      : '';

    // Build #file: ref so the copilotQuery can point Copilot to the existing doc.md and description
    const historyStorage = this.contextProvider.getHistoryStoragePath();
    const requestDirPath = historyStorage?.requestPath ?? '';
    const fileRef = requestDirPath
      ? `#file:${vscode.workspace.asRelativePath(requestDirPath, false)}`
      : '';

    const prompt =
      `Generate concise markdown documentation for this HTTP API endpoint.\n` +
      `Include: one-line description, request parameters/body fields, auth (if evident), expected responses.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}` +
      `\nHeaders: ${headerList}` +
      bodyBlock + responseBlock +
      this.buildChatBlock(message.chatHistory) +
      this.buildHistoryBlock(message.historyContext) +
      `\n\nReturn ONLY markdown. Use ## headings. Under 200 words.`;

    const copilotQuery = this.buildCopilotQuery(
      `Generate or improve markdown documentation for this HTTP API endpoint in HTTP Forge.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      (fileRef ? `\nRequest files (read for existing doc.md and endpoint description): ${fileRef}\n` : '') +
      (headerList !== 'none' ? `\nHeaders: ${headerList}` : '') +
      bodyBlock + responseBlock +
      `\n\nPlease:\n` +
      `1. Read the request files above — existing doc.md gives you the starting point, the description field gives the business intent.\n` +
      `2. Also check Confluence/Jira via MCP tools for official API documentation.\n` +
      `3. Generate complete markdown docs: description, parameters, request body, response schema, example, auth.\n` +
      `4. Return ONLY markdown. Use ## headings.`
    );

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiGeneratedDocs', error: result.error, copilotQuery });
    } else {
      messenger.postMessage({ command: 'aiGeneratedDocs', markdown: result.raw.trim(), copilotQuery });
    }
  }

  // ─── Feature 5: Generate request body ────────────────────────────────────

  private async handleAiGenerateBody(
    message: { description?: string; method?: string; url?: string; format?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const format = message.format ?? 'json';
    const prompt =
      `Generate a realistic sample ${format.toUpperCase()} request body for this API endpoint.\n\n` +
      `${message.method ?? 'POST'} ${message.url ?? ''}\n` +
      `Description: "${message.description ?? 'a typical request payload'}"` +
      this.buildChatBlock(message.chatHistory) +
      this.buildHistoryBlock(message.historyContext) +
      `\n\nReturn ONLY the raw ${format.toUpperCase()} body. No explanation, no markdown fences.`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiGeneratedBody', error: result.error });
    } else {
      const body = result.raw.replace(/^```(?:\w+)?\n?/gm, '').replace(/^```\s*$/gm, '').trim();
      messenger.postMessage({ command: 'aiGeneratedBody', body });
    }
  }


  // ─── Feature 6: Generate Contract Tests ────────────────────────────────────

  private async handleAiGenerateContractTests(
    message: { status?: number; body?: string; contentType?: string; method?: string; url?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const hasCopilot = !!vscode.extensions.getExtension('GitHub.copilot-chat');
    if (!hasCopilot) {
      messenger.postMessage({ command: 'aiContractTestsResult', error: 'GitHub Copilot Chat is required.' });
      return;
    }

    const historyStorage = this.contextProvider.getHistoryStoragePath();
    const requestDirPath = historyStorage?.requestPath ?? '';
    const fileRef = requestDirPath
      ? `#file:${vscode.workspace.asRelativePath(requestDirPath, false)}`
      : '';
    const fileBlock = fileRef
      ? `\nRequest files (read for responseSchema — this IS the contract): ${fileRef}\n`
      : '';

    const truncatedBody = (message.body ?? '').slice(0, 1500);
    const query = this.buildCopilotQuery(
      `Generate comprehensive contract pm.test() assertions for this HTTP request in HTTP Forge.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `HTTP ${message.status ?? '?'}` +
      (message.contentType ? ` | ${message.contentType}` : '') +
      (truncatedBody ? `\nResponse body:\n${truncatedBody}` : '') +
      fileBlock +
      `\nPlease:\n` +
      `1. Read the request files above — the \`responseSchema\` field is the authoritative contract. If present, generate assertions that verify EVERY constraint (required fields, types, formats, enums, ranges).\n` +
      `2. If no schema is present, infer the contract from the response body structure.\n` +
      `3. Also check business rules from Confluence/Jira MCP tools if available.\n` +
      `4. Generate exhaustive pm.test() assertions: field presence, types, formats, value constraints, array items.\n` +
      `5. Check existing post-response script in the request files — avoid duplicating existing assertions.\n\n` +
      `Return pm.test() snippets ready to paste into the post-response script.`
    );

    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', { query });
      messenger.postMessage({ command: 'aiContractTestsResult', openedInCopilot: true });
    } catch (err: any) {
      messenger.postMessage({ command: 'aiContractTestsResult', error: err?.message ?? 'Failed to open Copilot Chat.' });
    }
  }

  // ─── Feature 7: Extract Variables ────────────────────────────────────────

  private async handleAiExtractVariables(
    message: { body?: string; status?: number; method?: string; url?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.body ?? '').slice(0, 2000);
    const prompt =
      `You are an API workflow automation expert.\n` +
      `Analyse this HTTP response and identify fields worth saving as Postman environment variables for use in later requests.\n` +
      `Look for: tokens, IDs, URLs, session keys, resource identifiers, pagination cursors.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Status: ${message.status ?? '?'}\n` +
      `Body:\n${truncatedBody}\n` +
      this.buildChatBlock(message.chatHistory) +
      this.buildHistoryBlock(message.historyContext) +
      `\nReturn ONLY valid JSON, no markdown fences:\n` +
      `{"variables":[{"field":"fieldName","path":"$.path.to.field","suggestedName":"envVarName","reason":"one-line reason"}],"script":"pm.environment.set('envVarName', pm.response.json().path);\\n..."}`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiExtractVarsResult', error: result.error });
      return;
    }
    try {
      const cleaned = result.raw.replace(/^```(?:json)?\n?/gm, '').replace(/^```\s*$/gm, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object in response');
      const parsed = JSON.parse(jsonMatch[0]);
      messenger.postMessage({ command: 'aiExtractVarsResult', ...parsed });
    } catch {
      messenger.postMessage({ command: 'aiExtractVarsResult', error: 'Could not parse AI response. Try again.' });
    }
  }

  // ─── Feature 8: Generate TypeScript Types ────────────────────────────────

  private async handleAiGenerateTypes(
    message: { body?: string; method?: string; url?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.body ?? '').slice(0, 2000);
    const prompt =
      `Generate TypeScript interface definitions for this HTTP API response.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Response body:\n${truncatedBody}\n` +
      this.buildChatBlock(message.chatHistory) +
      this.buildHistoryBlock(message.historyContext) +
      `\nReturn ONLY the TypeScript interfaces — no explanation, no markdown fences.\n` +
      `Use union types for enums, optional fields (?), and nested interfaces. Name the root interface after the endpoint resource.`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiGeneratedTypes', error: result.error });
    } else {
      const types = result.raw.replace(/^```(?:typescript|ts)?\n?/gm, '').replace(/^```\s*$/gm, '').trim();
      messenger.postMessage({ command: 'aiGeneratedTypes', types });
    }
  }

  // ─── Feature 9: Detect Hardcoded Values ──────────────────────────────────

  private async handleAiDetectHardcoded(
    message: { method?: string; url?: string; headers?: Array<{ name?: string; key?: string; value?: string }>; body?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const headers = (message.headers ?? [])
      .map(h => `${h.name ?? h.key ?? ''}: ${h.value ?? ''}`)
      .join('\n') || 'none';
    const prompt =
      `You are a security and best-practices expert for API testing.\n` +
      `Analyse this HTTP request and identify hardcoded values that should be extracted to environment variables.\n` +
      `Look for: API keys, tokens, base URLs, user IDs, hardcoded credentials, repeated literal values.\n\n` +
      `Method: ${message.method ?? 'GET'}\n` +
      `URL: ${message.url ?? ''}\n` +
      `Headers:\n${headers}\n` +
      `Body: ${(message.body ?? '').slice(0, 500)}\n\n` +
      `Return ONLY valid JSON — no markdown fences, no explanation text.\n` +
      `If no issues are found, return exactly: {"issues":[]}\n` +
      `Format: {"issues":[{"location":"URL|Header name|Body","value":"hardcoded value","suggestedVar":"varName","severity":"high|medium|low","reason":"explanation"}]}`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiDetectedHardcoded', error: result.error });
      return;
    }
    try {
      // Strip markdown fences before attempting to parse
      const cleaned = result.raw.replace(/^```(?:json)?\n?/gm, '').replace(/^```\s*$/gm, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      // If no JSON found the response was plain text (e.g. "nothing found") — treat as no issues
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { issues: [] };
      messenger.postMessage({ command: 'aiDetectedHardcoded', ...parsed });
    } catch {
      messenger.postMessage({ command: 'aiDetectedHardcoded', error: 'Could not parse AI response. Try again.' });
    }
  }

  // ─── Feature 10: Compare Responses ───────────────────────────────────────

  private async handleAiCompareResponses(
    message: { currentBody?: string; currentStatus?: number; previousBody?: string; previousStatus?: number; method?: string; url?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const currentTrunc  = (message.currentBody ?? '').slice(0, 1500);
    const previousTrunc = (message.previousBody ?? '').slice(0, 1500);

    const historyStorage = this.contextProvider.getHistoryStoragePath();
    const requestDirPath = historyStorage?.requestPath ?? '';
    const fileRef = requestDirPath
      ? `#file:${vscode.workspace.asRelativePath(requestDirPath, false)}`
      : '';

    const prompt =
      `You are an API testing expert. Compare these two HTTP responses for the same endpoint.\n\n` +
      `Endpoint: ${message.method ?? 'GET'} ${message.url ?? ''}\n\n` +
      `PREVIOUS response (HTTP ${message.previousStatus ?? '?'}):\n${previousTrunc}\n\n` +
      `CURRENT response (HTTP ${message.currentStatus ?? '?'}):\n${currentTrunc}\n` +
      this.buildChatBlock(message.chatHistory) +
      this.buildHistoryBlock(message.historyContext) +
      `\nExplain the key differences in plain English. Cover: new/removed/changed fields, status differences, structural changes.\n` +
      `Reply with plain text only. 3-8 sentences. No markdown headers or fences.`;

    const copilotQuery = this.buildCopilotQuery(
      `I need to understand what changed between two responses for the same endpoint in HTTP Forge.\n\n` +
      `Endpoint: ${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      (fileRef ? `\nRequest files (endpoint description and business context): ${fileRef}\n` : '') +
      `\nPREVIOUS response (HTTP ${message.previousStatus ?? '?'}):\n${previousTrunc}\n\n` +
      `CURRENT response (HTTP ${message.currentStatus ?? '?'}):\n${currentTrunc}\n\n` +
      `Please:\n` +
      `1. Read the request files above to understand what this endpoint is supposed to do.\n` +
      `2. Explain the key differences: new/removed/changed fields, status changes, structural changes.\n` +
      `3. Flag whether any differences indicate a regression or a business rule violation.\n` +
      `4. Suggest pm.test() assertions that would catch this difference in future runs.`
    );

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiCompareResult', error: result.error, copilotQuery });
    } else {
      messenger.postMessage({ command: 'aiCompareResult', text: result.raw.trim(), copilotQuery });
    }
  }

  // ─── Feature 11: Context-Aware Chat — opens Copilot Chat ─────────────────

  private async handleAiChat(
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

    // Attach request dir via #file: so Copilot can read description, scripts, schema
    const historyStorage = this.contextProvider.getHistoryStoragePath();
    const requestDirPath = historyStorage?.requestPath ?? '';
    const fileRef = requestDirPath
      ? `#file:${vscode.workspace.asRelativePath(requestDirPath, false)}`
      : '';
    const fileBlock = fileRef
      ? `\nRequest files (description, existing scripts, response schema): ${fileRef}\n`
      : '';

    const priorContext = history.length > 0
      ? `\n\nPrior conversation context (${Math.ceil(history.length / 2)} turn${history.length > 2 ? 's' : ''}):\n` +
        history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 200)}`).join('\n')
      : '';

    const query = this.buildCopilotQuery(
      `I'm using HTTP Forge (a VS Code API testing extension) and need help with the following request.\n\n` +
      `${requestSection}\n\n${responseSection}${historySection}${fileBlock}${priorContext}\n\n` +
      `My question: ${message.newMessage ?? 'Please help me with this API request.'}`
    );

    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', { query });
      // Signal the webview that we've opened Copilot Chat (no response body needed)
      messenger.postMessage({ command: 'aiChatResponse', openedInCopilot: true });
    } catch (err: any) {
      messenger.postMessage({ command: 'aiChatResponse', error: err?.message ?? 'Failed to open Copilot Chat.' });
    }
  }

  private async handleAiSuggestAssertions(
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

    // Resolve .http-forge file paths so Copilot can read them directly via #file: —
    // no need to embed content in the prompt.
    const historyStorage = this.contextProvider.getHistoryStoragePath();
    const requestDirPath = historyStorage?.requestPath ?? '';

    // Build #file: references for files that exist on disk
    const fileRefs: string[] = [];
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

    const addFileRef = (absPath: string) => {
      if (!absPath) return;
      const rel = vscode.workspace.asRelativePath(absPath, false);
      if (rel && rel !== absPath) {
        fileRefs.push(`#file:${rel}`);
      }
    };

    // 1. Request dir: contains request.json (description, scripts, body schema, response schema)
    //    and scripts/post-response.js (existing assertions)
    if (requestDirPath) {
      addFileRef(requestDirPath);
    }

    // 2. History folder for this request (response patterns across runs)
    if (historyStorage?.requestId && historyStorage?.environment) {
      const historyBase = (this.collectionService as any)?.configService?.getHistoryPath?.();
      if (historyBase) {
        const historyRequestDir = require('path').join(
          historyBase,
          historyStorage.environment,
          historyStorage.requestId
        );
        addFileRef(historyRequestDir);
      }
    }

    const fileRefBlock = fileRefs.length > 0
      ? `\nContext files (read these for full details — description, existing assertions, response schema, history):\n${fileRefs.join('\n')}\n`
      : '';

    const truncatedResponseBody = (message.body ?? '').slice(0, 1500);
    const requestLine = `${message.method ?? 'GET'} ${message.url ?? '(URL unknown)'}`;
    const responseBlock =
      `HTTP ${message.status ?? '?'}` +
      (message.contentType ? ` | ${message.contentType}` : '') +
      (truncatedResponseBody ? `\nResponse body:\n${truncatedResponseBody}` : '');

    const query = this.buildCopilotQuery(
      `I need high-quality business-level pm.test() assertions for this HTTP request.\n\n` +
      `${requestLine}\n${responseBlock}\n` +
      fileRefBlock +
      `\nPlease:\n` +
      `1. Read the context files above — they contain the request description (business intent), ` +
      `existing assertions (don't duplicate), response schema (contract), and call history (patterns).\n` +
      `2. **Gather additional business context** (priority order):\n` +
      `   a. Source files above — **highest priority, treat as ground truth**\n` +
      `   b. Confluence pages / Jira tickets via MCP tools — search by endpoint URL or feature name\n` +
      `   c. The response body above — fallback only\n` +
      `   If code and docs conflict, follow the code and note the discrepancy.\n` +
      `3. Identify **business invariants** that must hold (e.g. "total = sum of line items", "token expires in 24h").\n` +
      `4. Generate **pm.test() assertions** that verify those invariants. Avoid generic status/field-exists checks.\n` +
      `5. Also suggest assertions that verify nothing sensitive is leaked (passwords, secrets, internal IDs).\n\n` +
      `💡 Drag backend service/controller/domain model files here for even richer context.`
    );

    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', { query });
      messenger.postMessage({ command: 'aiAssertionSuggestions', openedInCopilot: true });
    } catch (err: any) {
      messenger.postMessage({
        command: 'aiAssertionSuggestions',
        error: err?.message ?? 'Failed to open Copilot Chat.'
      });
    }
  }

  private async handleApplyAssertions(
    message: { script?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const { script } = message;
    const context = this.contextProvider.getCurrentContext();

    if (!script) {
      messenger.postMessage({ command: 'assertionsApplied', success: false, error: 'No script provided.' });
      return;
    }

    if (!context?.collectionId || !context?.requestId) {
      messenger.postMessage({ command: 'assertionsApplied', success: false, error: 'No collection request is loaded.' });
      return;
    }

    if (!this.collectionService) {
      messenger.postMessage({ command: 'assertionsApplied', success: false, error: 'Collection service unavailable.' });
      return;
    }

    try {
      const existing = this.collectionService.getRequestScript(
        context.collectionId,
        context.requestId,
        'post-response'
      ) ?? '';
      const combined = existing.trim() ? `${existing.trim()}\n\n${script}` : script;
      await this.collectionService.setRequestScript(
        context.collectionId,
        context.requestId,
        'post-response',
        combined
      );
      // Show a VS Code info notification so the user knows where the script went
      vscode.window.showInformationMessage('Assertions applied to post-response script.');
      messenger.postMessage({ command: 'assertionsApplied', success: true });
    } catch (err: any) {
      messenger.postMessage({ command: 'assertionsApplied', success: false, error: err?.message ?? 'Unknown error.' });
    }
  }

  // ─── Add extracted variables to the active environment ───────────────────

  private async handleAddExtractedVarsToEnv(
    message: { variables?: Array<{ suggestedName: string }> },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const vars = message.variables ?? [];
    if (!vars.length) {
      messenger.postMessage({ command: 'extractedVarsAddedToEnv', success: false, error: 'No variables provided.' });
      return;
    }
    if (!this.envConfigService) {
      messenger.postMessage({ command: 'extractedVarsAddedToEnv', success: false, error: 'Environment service unavailable.' });
      return;
    }
    for (const v of vars) {
      if (v.suggestedName) {
        // Add as empty placeholder — the pm.environment.set() script will populate the value at runtime
        this.envConfigService.setEnvironmentVariable(v.suggestedName, '');
      }
    }
    const envName = this.envConfigService.getSelectedEnvironment?.() ?? 'environment';
    vscode.window.showInformationMessage(
      `✅ Added ${vars.length} variable${vars.length !== 1 ? 's' : ''} to "${envName}". Values will be populated when the post-response script runs.`
    );
    messenger.postMessage({ command: 'extractedVarsAddedToEnv', success: true, count: vars.length });
  }
}
