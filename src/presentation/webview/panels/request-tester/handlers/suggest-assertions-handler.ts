import { ICollectionService } from '@http-forge/core';
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
    private collectionService?: ICollectionService
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
    ];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
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
      default:                        return false;
    }
  }

  // ─── Shared LM helper ────────────────────────────────────────────────────────

  private async callLm(prompt: string): Promise<{ raw: string } | { error: string }> {
    const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (!models.length) {
      return { error: 'GitHub Copilot is not available. Please sign in to use AI features.' };
    }
    try {
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

  // ─── Feature 1: Explain / diagnose response ──────────────────────────────

  private async handleAiExplainResponse(
    message: { status?: number; statusText?: string; body?: string; contentType?: string; method?: string; url?: string },
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
      `Body:\n${truncatedBody}\n\n` +
      `Reply with plain text only (no markdown headers or fences). Under 150 words.`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiExplainResult', error: result.error });
    } else {
      messenger.postMessage({ command: 'aiExplainResult', text: result.raw.trim() });
    }
  }

  // ─── Feature 2: Fix a failing pm.test() ──────────────────────────────────

  private async handleAiFixTest(
    message: { testName?: string; error?: string; method?: string; url?: string; responseStatus?: number; responseBody?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.responseBody ?? '').slice(0, 1500);
    const prompt =
      `A Postman pm.test() assertion failed. Explain why and provide a corrected pm.test() snippet.\n\n` +
      `Test name: "${message.testName ?? ''}"\n` +
      `Assertion error: ${message.error ?? ''}\n` +
      `Request: ${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Response status: ${message.responseStatus ?? '?'}\n` +
      `Response body (truncated):\n${truncatedBody}\n\n` +
      `Return ONLY valid JSON, no markdown fences:\n` +
      `{"explanation":"<why it failed in one sentence>","snippet":"pm.test(\\"...\\",...) { ... };"}`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiFixTestResult', testName: message.testName, error: result.error });
      return;
    }
    try {
      const jsonMatch = result.raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      messenger.postMessage({ command: 'aiFixTestResult', testName: message.testName, ...parsed });
    } catch {
      messenger.postMessage({ command: 'aiFixTestResult', testName: message.testName, error: 'Could not parse AI response. Try again.' });
    }
  }

  // ─── Feature 3: Generate pre/post-request script ──────────────────────────

  private async handleAiGenerateScript(
    message: { phase?: string; description?: string; existingScript?: string; method?: string; url?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const phase = message.phase ?? 'post-response';
    const existingBlock = message.existingScript?.trim()
      ? `Existing script (extend or improve it):\n${message.existingScript.slice(0, 1000)}`
      : 'No existing script — write from scratch.';

    const prompt =
      `You are a Postman/Newman pm.js script expert.\n` +
      `Generate a ${phase} JavaScript script for this HTTP request.\n\n` +
      `Request: ${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Instruction: "${message.description ?? ''}"\n` +
      `${existingBlock}\n\n` +
      `Return ONLY the raw JavaScript. No markdown fences, no explanation.\n` +
      `Use pm.* Postman sandbox APIs. Keep it concise and correct.`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiGeneratedScript', phase, error: result.error });
    } else {
      const script = result.raw.replace(/^```(?:javascript|js)?\n?/gm, '').replace(/^```\s*$/gm, '').trim();
      messenger.postMessage({ command: 'aiGeneratedScript', phase, script });
    }
  }

  // ─── Feature 4: Generate request documentation ───────────────────────────

  private async handleAiGenerateDocs(
    message: { method?: string; url?: string; headers?: string[]; body?: string; responseStatus?: number; responseBody?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const headerList = (message.headers ?? []).join(', ') || 'none';
    const bodyBlock = message.body?.trim() ? `\nRequest body:\n${message.body.slice(0, 800)}` : '';
    const responseBlock = message.responseStatus
      ? `\nExample response: ${message.responseStatus}\n${(message.responseBody ?? '').slice(0, 600)}`
      : '';

    const prompt =
      `Generate concise markdown documentation for this HTTP API endpoint.\n` +
      `Include: one-line description, request parameters/body fields, auth (if evident), expected responses.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}` +
      `\nHeaders: ${headerList}` +
      bodyBlock + responseBlock +
      `\n\nReturn ONLY markdown. Use ## headings. Under 200 words.`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiGeneratedDocs', error: result.error });
    } else {
      messenger.postMessage({ command: 'aiGeneratedDocs', markdown: result.raw.trim() });
    }
  }

  // ─── Feature 5: Generate request body ────────────────────────────────────

  private async handleAiGenerateBody(
    message: { description?: string; method?: string; url?: string; format?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const format = message.format ?? 'json';
    const prompt =
      `Generate a realistic sample ${format.toUpperCase()} request body for this API endpoint.\n\n` +
      `${message.method ?? 'POST'} ${message.url ?? ''}\n` +
      `Description: "${message.description ?? 'a typical request payload'}"\n\n` +
      `Return ONLY the raw ${format.toUpperCase()} body. No explanation, no markdown fences.`;

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
    message: { status?: number; body?: string; contentType?: string; method?: string; url?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.body ?? '').slice(0, 2000);
    const prompt =
      `You are an API contract testing expert.\n` +
      `Generate comprehensive pm.test() assertions that validate the STRUCTURE of this response.\n` +
      `Focus on: field presence (to.have.property), type checks (to.be.a), format validation, value constraints, array items.\n` +
      `Be exhaustive — cover every field visible in the response body.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Status: ${message.status ?? '?'}\n` +
      `Content-Type: ${message.contentType ?? 'unknown'}\n` +
      `Body:\n${truncatedBody}\n\n` +
      `Return ONLY a valid JSON array, no markdown fences:\n` +
      `[{"snippet":"pm.test(\\"...\\",...);","field":"fieldName","rationale":"why this check matters"}]`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiContractTestsResult', error: result.error });
      return;
    }
    try {
      const jsonMatch = result.raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array in response');
      const snippets: Array<{ snippet: string; field: string; rationale: string }> = JSON.parse(jsonMatch[0]);
      messenger.postMessage({ command: 'aiContractTestsResult', snippets });
    } catch {
      messenger.postMessage({ command: 'aiContractTestsResult', error: 'Could not parse AI response. Try again.' });
    }
  }

  // ─── Feature 7: Extract Variables ────────────────────────────────────────

  private async handleAiExtractVariables(
    message: { body?: string; status?: number; method?: string; url?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.body ?? '').slice(0, 2000);
    const prompt =
      `You are an API workflow automation expert.\n` +
      `Analyse this HTTP response and identify fields worth saving as Postman environment variables for use in later requests.\n` +
      `Look for: tokens, IDs, URLs, session keys, resource identifiers, pagination cursors.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Status: ${message.status ?? '?'}\n` +
      `Body:\n${truncatedBody}\n\n` +
      `Return ONLY valid JSON, no markdown fences:\n` +
      `{"variables":[{"field":"fieldName","path":"$.path.to.field","suggestedName":"envVarName","reason":"one-line reason"}],"script":"pm.environment.set('envVarName', pm.response.json().path);\\n..."}`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiExtractVarsResult', error: result.error });
      return;
    }
    try {
      const jsonMatch = result.raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object in response');
      const parsed = JSON.parse(jsonMatch[0]);
      messenger.postMessage({ command: 'aiExtractVarsResult', ...parsed });
    } catch {
      messenger.postMessage({ command: 'aiExtractVarsResult', error: 'Could not parse AI response. Try again.' });
    }
  }

  // ─── Feature 8: Generate TypeScript Types ────────────────────────────────

  private async handleAiGenerateTypes(
    message: { body?: string; method?: string; url?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.body ?? '').slice(0, 2000);
    const prompt =
      `Generate TypeScript interface definitions for this HTTP API response.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Response body:\n${truncatedBody}\n\n` +
      `Return ONLY the TypeScript interfaces — no explanation, no markdown fences.\n` +
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
      `Return ONLY valid JSON, no markdown fences:\n` +
      `{"issues":[{"location":"URL|Header name|Body","value":"hardcoded value","suggestedVar":"varName","severity":"high|medium|low","reason":"explanation"}]}`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiDetectedHardcoded', error: result.error });
      return;
    }
    try {
      const jsonMatch = result.raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object in response');
      const parsed = JSON.parse(jsonMatch[0]);
      messenger.postMessage({ command: 'aiDetectedHardcoded', ...parsed });
    } catch {
      messenger.postMessage({ command: 'aiDetectedHardcoded', error: 'Could not parse AI response. Try again.' });
    }
  }

  // ─── Feature 10: Compare Responses ───────────────────────────────────────

  private async handleAiCompareResponses(
    message: { currentBody?: string; currentStatus?: number; previousBody?: string; previousStatus?: number; method?: string; url?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const currentTrunc  = (message.currentBody ?? '').slice(0, 1500);
    const previousTrunc = (message.previousBody ?? '').slice(0, 1500);
    const prompt =
      `You are an API testing expert. Compare these two HTTP responses for the same endpoint.\n\n` +
      `Endpoint: ${message.method ?? 'GET'} ${message.url ?? ''}\n\n` +
      `PREVIOUS response (HTTP ${message.previousStatus ?? '?'}):\n${previousTrunc}\n\n` +
      `CURRENT response (HTTP ${message.currentStatus ?? '?'}):\n${currentTrunc}\n\n` +
      `Explain the key differences in plain English. Cover: new/removed/changed fields, status differences, structural changes.\n` +
      `Reply with plain text only. 3-8 sentences. No markdown headers or fences.`;

    const result = await this.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiCompareResult', error: result.error });
    } else {
      messenger.postMessage({ command: 'aiCompareResult', text: result.raw.trim() });
    }
  }

  // ─── Feature 11: Context-Aware Chat ──────────────────────────────────────

  private async handleAiChat(
    message: {
      messages?: Array<{ role: string; content: string }>;
      newMessage?: string;
      context?: { method?: string; url?: string; status?: number; body?: string; contentType?: string };
    },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const ctx = message.context ?? {};
    const contextPreamble =
      `You are an AI assistant embedded in HTTP Forge, a VS Code API testing extension.\n` +
      `Current request context:\n` +
      `- Endpoint: ${ctx.method ?? 'GET'} ${ctx.url ?? '(not set)'}\n` +
      (ctx.status    ? `- Last response: HTTP ${ctx.status}\n`                                  : '') +
      (ctx.contentType ? `- Content-Type: ${ctx.contentType}\n`                                 : '') +
      (ctx.body      ? `- Response body (truncated):\n${(ctx.body ?? '').slice(0, 800)}\n`       : '') +
      `\nHelp the user with API testing: write pm.test() scripts, explain errors, suggest improvements.`;

    const history = message.messages ?? [];
    const allMessages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(contextPreamble),
      vscode.LanguageModelChatMessage.Assistant("Ready to help with your API testing. What would you like to know?"),
      ...history.map(m =>
        m.role === 'user'
          ? vscode.LanguageModelChatMessage.User(m.content)
          : vscode.LanguageModelChatMessage.Assistant(m.content)
      ),
      vscode.LanguageModelChatMessage.User(message.newMessage ?? ''),
    ];

    const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (!models.length) {
      messenger.postMessage({ command: 'aiChatResponse', error: 'GitHub Copilot is not available.' });
      return;
    }
    try {
      const cts = new vscode.CancellationTokenSource();
      const response = await models[0].sendRequest(allMessages, {}, cts.token);
      let raw = '';
      for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) raw += part.value;
      }
      messenger.postMessage({ command: 'aiChatResponse', message: raw.trim() });
    } catch (err: any) {
      messenger.postMessage({ command: 'aiChatResponse', error: err?.message ?? 'Chat failed.' });
    }
  }

  private async handleAiSuggestAssertions(
    message: { status?: number; body?: string; contentType?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (!models.length) {
      messenger.postMessage({
        command: 'aiAssertionSuggestions',
        error: 'GitHub Copilot is not available. Please sign in to use AI suggestions.'
      });
      return;
    }

    const model = models[0];
    const truncatedBody = (message.body ?? '').slice(0, 1500);
    const prompt =
      `You are a test generation assistant for HTTP APIs.\n` +
      `Given this HTTP response:\n` +
      `Status: ${message.status ?? 'unknown'}\n` +
      `Content-Type: ${message.contentType ?? 'unknown'}\n` +
      `Body:\n${truncatedBody}\n\n` +
      `Generate up to 6 Postman/Newman pm.test() assertion snippets that are specific and meaningful for this response.\n` +
      `Return ONLY a valid JSON array in this exact shape (no markdown fences, no extra text):\n` +
      `[{"snippet":"pm.test(...) {...};","rationale":"Why this assertion is useful."}]`;

    try {
      const token = new vscode.CancellationTokenSource().token;
      const response = await model.sendRequest(
        [vscode.LanguageModelChatMessage.User(prompt)],
        {},
        token
      );

      let raw = '';
      for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          raw += part.value;
        }
      }

      // Extract JSON array from the response (strip any accidental markdown fences)
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        messenger.postMessage({ command: 'aiAssertionSuggestions', error: 'Could not parse AI response. Try again.' });
        return;
      }

      const suggestions: Array<{ snippet: string; rationale: string }> = JSON.parse(jsonMatch[0]);
      messenger.postMessage({ command: 'aiAssertionSuggestions', suggestions });
    } catch (err: any) {
      messenger.postMessage({
        command: 'aiAssertionSuggestions',
        error: err?.message ?? 'AI suggestion failed.'
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
}
