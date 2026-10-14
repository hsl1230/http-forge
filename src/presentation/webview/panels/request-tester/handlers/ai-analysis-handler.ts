/**
 * AI analysis features for the Request Tester panel.
 *
 * The "call Copilot and return a result" commands: explain a response, fix a
 * failing assertion, generate docs, generate a request body, generate
 * TypeScript types, and compare two responses. All share the {@link AiOperations}
 * helper for model selection, context attachment, and prompt building.
 */

import { IWebviewMessenger } from '../../../shared-interfaces';
import { AiOperations } from './ai-operations';

export class AiAnalysisHandler {
  constructor(private readonly ai: AiOperations) {}

  async explainResponse(
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
      this.ai.buildChatBlock(message.chatHistory) +
      this.ai.buildHistoryBlock(message.historyContext) +
      `\nReply with plain text only (no markdown headers or fences). Under 150 words.`;

    const result = await this.ai.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiExplainResult', error: result.error });
    } else {
      messenger.postMessage({
        command: 'aiExplainResult',
        text: result.raw.trim(),
        copilotQuery: this.ai.buildCopilotQuery(prompt)
      });
    }
  }

  async fixTest(
    message: { testName?: string; error?: string; method?: string; url?: string; responseStatus?: number; responseBody?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.responseBody ?? '').slice(0, 1500);

    // Attach the request file dir so Copilot can read the full post-response script
    const attachFiles = this.ai.getRequestDirAttachFiles();
    const fileBlock = attachFiles.length
      ? `\nRequest files (contains the full post-response script with this test and related request artifacts)\n`
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

    const copilotQuery = this.ai.buildCopilotQuery(
      `A pm.test() assertion is failing and I need help fixing it.\n\n` +
      `Test: "${message.testName ?? ''}"\nError: ${message.error ?? ''}\n` +
      `Request: ${message.method ?? 'GET'} ${message.url ?? ''} | HTTP ${message.responseStatus ?? '?'}\n` +
      (attachFiles.length ? `\nThe request directory is attached so you can inspect the full post-response script and related request files.\n` : '') +
      `\nResponse body:\n${truncatedBody}\n\n` +
      `Please explain why this assertion fails and provide a corrected pm.test() snippet.`
    );

    const attachFilePaths = attachFiles.map(f => f.fsPath);
    const result = await this.ai.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiFixTestResult', testName: message.testName, error: result.error, copilotQuery, attachFiles: attachFilePaths });
      return;
    }
    try {
      const cleaned = this.ai.stripCodeFences(result.raw, 'json');
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      messenger.postMessage({ command: 'aiFixTestResult', testName: message.testName, ...parsed, copilotQuery, attachFiles: attachFilePaths });
    } catch {
      messenger.postMessage({ command: 'aiFixTestResult', testName: message.testName, error: 'Could not parse AI response. Try again.', copilotQuery, attachFiles: attachFilePaths });
    }
  }

  async generateDocs(
    message: { method?: string; url?: string; headers?: string[]; body?: string; responseStatus?: number; responseBody?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const headerList = (message.headers ?? []).join(', ') || 'none';
    const bodyBlock = message.body?.trim() ? `\nRequest body:\n${message.body.slice(0, 800)}` : '';
    const responseBlock = message.responseStatus
      ? `\nExample response: ${message.responseStatus}\n${(message.responseBody ?? '').slice(0, 600)}`
      : '';

    const attachFiles = this.ai.getRequestDirAttachFiles();

    const prompt =
      `Generate concise markdown documentation for this HTTP API endpoint.\n` +
      `Include: one-line description, request parameters/body fields, auth (if evident), expected responses.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}` +
      `\nHeaders: ${headerList}` +
      bodyBlock + responseBlock +
      this.ai.buildChatBlock(message.chatHistory) +
      this.ai.buildHistoryBlock(message.historyContext) +
      `\n\nReturn ONLY markdown. Use ## headings. Under 200 words.`;

    const copilotQuery = this.ai.buildCopilotQuery(
      `Generate or improve markdown documentation for this HTTP API endpoint in HTTP Forge.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      (attachFiles.length ? `\nThe request directory is attached so you can inspect existing doc.md and the endpoint description.\n` : '') +
      (headerList !== 'none' ? `\nHeaders: ${headerList}` : '') +
      bodyBlock + responseBlock +
      `\n\nPlease:\n` +
      `1. Read the request files above — existing doc.md gives you the starting point, the description field gives the business intent.\n` +
      `2. Base the docs on the endpoint, its response schema, the collection/suite in this workspace, and the backend source. ` +
      `Optional: if a Confluence/Jira MCP server is configured, you may consult it for official API documentation — otherwise skip it.\n` +
      `3. Generate complete markdown docs: description, parameters, request body, response schema, example, auth.\n` +
      `4. Return ONLY markdown. Use ## headings.`
    );

    const attachFilePaths = attachFiles.map(f => f.fsPath);
    const result = await this.ai.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiGeneratedDocs', error: result.error, copilotQuery, attachFiles: attachFilePaths });
    } else {
      messenger.postMessage({ command: 'aiGeneratedDocs', markdown: result.raw.trim(), copilotQuery, attachFiles: attachFilePaths });
    }
  }

  async generateBody(
    message: { description?: string; method?: string; url?: string; format?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const format = message.format ?? 'json';
    const prompt =
      `Generate a realistic sample ${format.toUpperCase()} request body for this API endpoint.\n\n` +
      `${message.method ?? 'POST'} ${message.url ?? ''}\n` +
      `Description: "${message.description ?? 'a typical request payload'}"` +
      this.ai.buildChatBlock(message.chatHistory) +
      this.ai.buildHistoryBlock(message.historyContext) +
      `\n\nReturn ONLY the raw ${format.toUpperCase()} body. No explanation, no markdown fences.`;

    const result = await this.ai.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiGeneratedBody', error: result.error });
    } else {
      const body = this.ai.stripCodeFences(result.raw);
      messenger.postMessage({ command: 'aiGeneratedBody', body });
    }
  }

  async generateTypes(
    message: { body?: string; method?: string; url?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const truncatedBody = (message.body ?? '').slice(0, 2000);
    const prompt =
      `Generate TypeScript interface definitions for this HTTP API response.\n\n` +
      `${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      `Response body:\n${truncatedBody}\n` +
      this.ai.buildChatBlock(message.chatHistory) +
      this.ai.buildHistoryBlock(message.historyContext) +
      `\nReturn ONLY the TypeScript interfaces — no explanation, no markdown fences.\n` +
      `Use union types for enums, optional fields (?), and nested interfaces. Name the root interface after the endpoint resource.`;

    const result = await this.ai.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiGeneratedTypes', error: result.error });
    } else {
      const types = this.ai.stripCodeFences(result.raw, 'typescript');
      messenger.postMessage({ command: 'aiGeneratedTypes', types });
    }
  }

  async compareResponses(
    message: { currentBody?: string; currentStatus?: number; previousBody?: string; previousStatus?: number; method?: string; url?: string; chatHistory?: Array<{ role: string; content: string }>; historyContext?: string },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const currentTrunc  = (message.currentBody ?? '').slice(0, 1500);
    const previousTrunc = (message.previousBody ?? '').slice(0, 1500);

    const attachFiles = this.ai.getRequestDirAttachFiles();

    const prompt =
      `You are an API testing expert. Compare these two HTTP responses for the same endpoint.\n\n` +
      `Endpoint: ${message.method ?? 'GET'} ${message.url ?? ''}\n\n` +
      `PREVIOUS response (HTTP ${message.previousStatus ?? '?'}):\n${previousTrunc}\n\n` +
      `CURRENT response (HTTP ${message.currentStatus ?? '?'}):\n${currentTrunc}\n` +
      this.ai.buildChatBlock(message.chatHistory) +
      this.ai.buildHistoryBlock(message.historyContext) +
      `\nExplain the key differences in plain English. Cover: new/removed/changed fields, status differences, structural changes.\n` +
      `Reply with plain text only. 3-8 sentences. No markdown headers or fences.`;

    const copilotQuery = this.ai.buildCopilotQuery(
      `I need to understand what changed between two responses for the same endpoint in HTTP Forge.\n\n` +
      `Endpoint: ${message.method ?? 'GET'} ${message.url ?? ''}\n` +
      (attachFiles.length ? `\nThe request directory is attached so you can inspect the endpoint description and related files.\n` : '') +
      `\nPREVIOUS response (HTTP ${message.previousStatus ?? '?'}):\n${previousTrunc}\n\n` +
      `CURRENT response (HTTP ${message.currentStatus ?? '?'}):\n${currentTrunc}\n\n` +
      `Please:\n` +
      `1. Read the request files above to understand what this endpoint is supposed to do.\n` +
      `2. Explain the key differences: new/removed/changed fields, status changes, structural changes.\n` +
      `3. Flag whether any differences indicate a regression or a business rule violation.\n` +
      `4. Suggest pm.test() assertions that would catch this difference in future runs.`
    );

    const attachFilePaths = attachFiles.map(f => f.fsPath);
    const result = await this.ai.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiCompareResult', error: result.error, copilotQuery, attachFiles: attachFilePaths });
    } else {
      messenger.postMessage({ command: 'aiCompareResult', text: result.raw.trim(), copilotQuery, attachFiles: attachFilePaths });
    }
  }
}
