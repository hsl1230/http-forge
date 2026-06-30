import { EnvSuggestion, ICollectionService, IEnvironmentConfigService, applyEnvSuggestionsToItems, scanCollectionForEnvVarsWithAi } from '@http-forge/core';
import * as vscode from 'vscode';
import { CopilotAiProvider } from '../../../../../infrastructure/copilot-ai-provider';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { IPanelContextProvider } from '../interfaces';

export type { EnvSuggestion };

/**
 * Handles collection-wide "Suggest Env Variables" feature for the Request Tester panel.
 * Delegates scan logic to @http-forge/core via CopilotAiProvider.
 *
 * Commands:
 *   scanCollectionForEnv  – AI scans the whole collection and returns hardcoded value suggestions
 *   applyEnvSuggestions   – replaces hardcoded values with {{varName}} across all requests
 *                           and adds the variables to the active environment
 */
export class SuggestEnvHandler implements IMessageHandler {
  constructor(
    private contextProvider: IPanelContextProvider,
    private envConfigService: IEnvironmentConfigService,
    private collectionService: ICollectionService
  ) {}

  getSupportedCommands(): string[] {
    return ['scanCollectionForEnv', 'applyEnvSuggestions'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    switch (command) {
      case 'scanCollectionForEnv': await this.handleScan(message, messenger);  return true;
      case 'applyEnvSuggestions':  await this.handleApply(message, messenger); return true;
      default:                     return false;
    }
  }

  // ─── Scan ─────────────────────────────────────────────────────────────────

  private async handleScan(
    _message: any,
    messenger: IWebviewMessenger
  ): Promise<void> {
    const context = this.contextProvider.getCurrentContext();
    const collectionId = context?.collectionId;

    if (!collectionId) {
      messenger.postMessage({ command: 'envScanResult', error: 'No collection is loaded. Open a collection request first.' });
      return;
    }

    const collection = this.collectionService.getCollection(collectionId);
    if (!collection) {
      messenger.postMessage({ command: 'envScanResult', error: 'Collection not found.' });
      return;
    }

    try {
      const provider = new CopilotAiProvider();
      const suggestions = await scanCollectionForEnvVarsWithAi(collection, provider);
      messenger.postMessage({ command: 'envScanResult', suggestions, collectionName: collection.name });
    } catch (err: any) {
      messenger.postMessage({ command: 'envScanResult', error: err?.message ?? 'Scan failed.' });
    }
  }

  // ─── Apply ────────────────────────────────────────────────────────────────

  private async handleApply(
    message: { selected: Array<{ value: string; varName: string }> },
    messenger: IWebviewMessenger
  ): Promise<void> {
    const context = this.contextProvider.getCurrentContext();
    const collectionId = context?.collectionId;

    if (!collectionId) {
      messenger.postMessage({ command: 'envApplyResult', error: 'No collection is loaded.' });
      return;
    }

    const collection = this.collectionService.getCollection(collectionId);
    if (!collection) {
      messenger.postMessage({ command: 'envApplyResult', error: 'Collection not found.' });
      return;
    }

    const selected = message.selected ?? [];
    if (selected.length === 0) {
      messenger.postMessage({ command: 'envApplyResult', error: 'No suggestions selected.' });
      return;
    }

    const counts = applyEnvSuggestionsToItems(collection.items, selected);
    const replacedCount = Object.values(counts).reduce((a, b) => a + b, 0);

    await this.collectionService.saveCollection(collection);

    for (const s of selected) {
      this.envConfigService.setEnvironmentVariable(s.varName, s.value);
    }

    const envName = (this.envConfigService as any).getSelectedEnvironment?.() ?? 'environment';
    vscode.window.showInformationMessage(
      `✅ Added ${selected.length} variable${selected.length !== 1 ? 's' : ''} to "${envName}" ` +
      `and replaced ${replacedCount} occurrence${replacedCount !== 1 ? 's' : ''} in the collection.`
    );
    messenger.postMessage({
      command: 'envApplyResult',
      success: true,
      addedVars: selected.length,
      replacedCount,
    });
  }
}
