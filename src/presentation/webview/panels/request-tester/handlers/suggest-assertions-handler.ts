import { ICollectionService, IEnvironmentConfigService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { IPanelContextProvider } from '../interfaces';
import { AiAnalysisHandler } from './ai-analysis-handler';
import { AiCopilotHandler } from './ai-copilot-handler';
import { AiOperations } from './ai-operations';
import { AiVariablesHandler } from './ai-variables-handler';

/**
 * Dispatches all AI-powered features in the Request Tester panel via vscode.lm (Copilot).
 * No external API key required — uses the active GitHub Copilot model.
 *
 * This handler is a thin command router. The actual work lives in:
 * - {@link AiAnalysisHandler}  — explain / fix-test / docs / body / types / compare
 * - {@link AiCopilotHandler}   — generate-script / contract-tests / chat / suggest-assertions / open-in-copilot
 * - {@link AiVariablesHandler} — extract-variables / detect-hardcoded / add-vars-to-env
 * - this class                — applyAssertions (collection script write)
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
  private readonly ai: AiOperations;
  private readonly analysis: AiAnalysisHandler;
  private readonly copilot: AiCopilotHandler;
  private readonly variables: AiVariablesHandler;

  constructor(
    private contextProvider: IPanelContextProvider,
    private collectionService?: ICollectionService,
    envConfigService?: IEnvironmentConfigService
  ) {
    this.ai = new AiOperations(contextProvider, collectionService);
    this.analysis = new AiAnalysisHandler(this.ai);
    this.copilot = new AiCopilotHandler(this.ai);
    this.variables = new AiVariablesHandler(this.ai, envConfigService);
  }

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
        case 'aiSuggestAssertions':     await this.copilot.suggestAssertions(message, messenger);     return true;
        case 'aiExplainResponse':       await this.analysis.explainResponse(message, messenger);      return true;
        case 'aiFixTest':               await this.analysis.fixTest(message, messenger);              return true;
        case 'aiGenerateScript':        await this.copilot.generateScript(message, messenger);        return true;
        case 'aiGenerateDocs':          await this.analysis.generateDocs(message, messenger);         return true;
        case 'aiGenerateBody':          await this.analysis.generateBody(message, messenger);         return true;
        case 'aiGenerateContractTests': await this.copilot.generateContractTests(message, messenger); return true;
        case 'aiExtractVariables':      await this.variables.extractVariables(message, messenger);    return true;
        case 'aiGenerateTypes':         await this.analysis.generateTypes(message, messenger);        return true;
        case 'aiDetectHardcoded':       await this.variables.detectHardcoded(message, messenger);     return true;
        case 'aiCompareResponses':      await this.analysis.compareResponses(message, messenger);     return true;
        case 'aiChat':                  await this.copilot.chat(message, messenger);                  return true;
        case 'openInCopilot':           await this.copilot.openInCopilot(message);                    return true;
        case 'addExtractedVarsToEnv':   await this.variables.addExtractedVarsToEnv(message, messenger); return true;
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
