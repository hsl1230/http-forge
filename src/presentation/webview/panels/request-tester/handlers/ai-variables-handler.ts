/**
 * AI variable-management features for the Request Tester panel: extract
 * response fields worth saving as environment variables, detect hardcoded
 * values, and commit extracted variables into the active environment.
 */

import { IEnvironmentConfigService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IWebviewMessenger } from '../../../shared-interfaces';
import { AiOperations } from './ai-operations';

export class AiVariablesHandler {
  constructor(
    private readonly ai: AiOperations,
    private readonly envConfigService?: IEnvironmentConfigService
  ) {}

  async extractVariables(
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
      this.ai.buildChatBlock(message.chatHistory) +
      this.ai.buildHistoryBlock(message.historyContext) +
      `\nReturn ONLY valid JSON, no markdown fences:\n` +
      `{"variables":[{"field":"fieldName","path":"$.path.to.field","suggestedName":"envVarName","reason":"one-line reason"}],"script":"pm.environment.set('envVarName', pm.response.json().path);\\n..."}`;

    const result = await this.ai.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiExtractVarsResult', error: result.error });
      return;
    }
    try {
      const cleaned = this.ai.stripCodeFences(result.raw, 'json');
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object in response');
      const parsed = JSON.parse(jsonMatch[0]);
      messenger.postMessage({ command: 'aiExtractVarsResult', ...parsed });
    } catch {
      messenger.postMessage({ command: 'aiExtractVarsResult', error: 'Could not parse AI response. Try again.' });
    }
  }

  async detectHardcoded(
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

    const result = await this.ai.callLm(prompt);
    if ('error' in result) {
      messenger.postMessage({ command: 'aiDetectedHardcoded', error: result.error });
      return;
    }
    try {
      // Strip markdown fences before attempting to parse
      const cleaned = this.ai.stripCodeFences(result.raw, 'json');
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      // If no JSON found the response was plain text (e.g. "nothing found") — treat as no issues
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { issues: [] };
      messenger.postMessage({ command: 'aiDetectedHardcoded', ...parsed });
    } catch {
      messenger.postMessage({ command: 'aiDetectedHardcoded', error: 'Could not parse AI response. Try again.' });
    }
  }

  async addExtractedVarsToEnv(
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
