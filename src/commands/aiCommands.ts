/**
 * AI commands.
 *
 * Single Responsibility: register commands that use AI to enhance requests
 * and collections — suggesting environment variables and generating a
 * collection from a curl command.
 */

import * as vscode from 'vscode';
import { applyEnvSuggestions, scanCollectionForEnvVars } from '../infrastructure/ai-env-suggester';
import { parseCurlCommand } from '../infrastructure/curl-parser';
import { CollectionEditorPanel } from '../presentation/webview/panels/collection-editor';
import { CollectionTreeItem } from '../presentation/components/tree-providers/collections-tree-provider';
import { COMMAND_IDS } from '../shared/constants';
import { countRequests } from './helpers/collection-utils';
import type { CommandContext } from './command-context';

export function registerAiCommands(ctx: CommandContext): void {
  const { context, collectionService, envConfigService, collectionsTreeProvider } = ctx;

  // Suggest Environment Variables
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.suggestEnvVariables, async (item?: CollectionTreeItem) => {
      if (item?.collectionId) {
        // Right-click from tree: open Collection Editor (button is in Overview tab)
        CollectionEditorPanel.show(context.extensionUri, item.collectionId);
      } else {
        // Command palette: show collection picker then run native QuickPick flow
        await runSuggestEnvFromPalette(ctx);
      }
    })
  );

  // Generate Collection from curl
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.generateCollectionFromCurl, async () => {
      await runGenerateCollectionFromCurl(ctx);
    })
  );
}

/**
 * Command palette: Suggest Env Variables
 * Shows a collection picker, scans with AI, presents MultiSelect QuickPick, then applies.
 */
async function runSuggestEnvFromPalette(ctx: CommandContext): Promise<void> {
  const { collectionService, envConfigService, collectionsTreeProvider } = ctx;
  const collections = collectionService.getAllCollections();
  if (collections.length === 0) {
    vscode.window.showWarningMessage('No collections found. Import or create one first.');
    return;
  }

  const picked = await vscode.window.showQuickPick(
    collections.map(c => ({ label: c.name, description: `${countRequests(c)} requests`, id: c.id })),
    { placeHolder: 'Select a collection to scan' }
  );
  if (!picked) { return; }

  let suggestions: Awaited<ReturnType<typeof scanCollectionForEnvVars>>['suggestions'];
  try {
    ({ suggestions } = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: '✨ Scanning collection for hardcoded values…' },
      () => scanCollectionForEnvVars(picked.id, collectionService)
    ));
  } catch (err: unknown) {
    vscode.window.showErrorMessage(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  if (suggestions.length === 0) {
    vscode.window.showInformationMessage('✅ No hardcoded values detected in this collection.');
    return;
  }

  // Multi-select QuickPick — one item per suggestion
  const qpItems = suggestions.map(s => ({
    label: s.value,
    description: `→ {{${s.varName}}}`,
    detail: `${s.occurrences.length} occurrence(s) · ${s.reason}`,
    picked: true,
    suggestion: s,
  }));

  const selected = await vscode.window.showQuickPick(qpItems, {
    placeHolder: 'Select values to extract as environment variables',
    canPickMany: true,
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!selected || selected.length === 0) { return; }

  // Apply
  try {
    const toApply = selected.map(s => ({ value: s.suggestion.value, varName: s.suggestion.varName }));
    const { replacedCount, addedVars, envName } = await applyEnvSuggestions(
      picked.id,
      toApply,
      collectionService,
      envConfigService
    );
    vscode.window.showInformationMessage(
      `✅ Added ${addedVars} variable${addedVars !== 1 ? 's' : ''} to "${envName}" ` +
      `and replaced ${replacedCount} occurrence${replacedCount !== 1 ? 's' : ''}.`
    );
  } catch (err: unknown) {
    vscode.window.showErrorMessage(`Apply failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Command palette: Generate Collection from curl (AI)
 * Prompts for a curl command, parses it with AI, creates a collection.
 */
async function runGenerateCollectionFromCurl(ctx: CommandContext): Promise<void> {
  const { context, collectionService, envConfigService, collectionsTreeProvider } = ctx;

  // Step 1: Get curl command via multi-line input box
  const curlCommand = await vscode.window.showInputBox({
    prompt: 'Paste your curl command',
    placeHolder: "curl -X POST https://api.example.com/users -H 'Authorization: Bearer sk-...' -d '{\"name\":\"test\"}'",
    validateInput: (v) => v.trim().startsWith('curl') ? undefined : 'Must start with "curl"',
  });
  if (!curlCommand) { return; }

  // Step 2: Parse with AI
  let parsed: Awaited<ReturnType<typeof parseCurlCommand>>;
  try {
    parsed = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: '✨ Parsing curl command with AI…' },
      () => parseCurlCommand(curlCommand)
    );
  } catch (err: unknown) {
    vscode.window.showErrorMessage(`Parsing failed: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  // Step 3: Collection name
  const defaultName = (() => {
    try { return new URL(parsed.url.replace(/\{\{[^}]+\}\}/g, 'x')).hostname; } catch { return 'Imported from curl'; }
  })();
  const collectionName = await vscode.window.showInputBox({
    prompt: 'Collection name',
    value: defaultName,
  });
  if (!collectionName) { return; }

  // Step 4: Create collection + request
  const collection = await collectionService.createCollection(collectionName);

  await collectionService.createRequest({
    collectionId: collection.id,
    name: parsed.name,
    method: parsed.method,
    url: parsed.url,
    headers: parsed.headers as any[],
    query: parsed.query as any[],
    body: parsed.body as any ?? undefined,
  });

  // Step 5: Add suggested vars to active environment
  if (parsed.suggestedVars.length > 0) {
    for (const v of parsed.suggestedVars) {
      (envConfigService as any).setEnvironmentVariable(v.key, v.value);
    }
  }

  collectionsTreeProvider.refresh();

  vscode.window.showInformationMessage(
    `✅ Created collection "${collectionName}" with request "${parsed.name}"` +
    (parsed.suggestedVars.length > 0
      ? ` · ${parsed.suggestedVars.length} env var${parsed.suggestedVars.length !== 1 ? 's' : ''} added`
      : '')
  );

  // Open collection editor
  CollectionEditorPanel.show(context.extensionUri, collection.id);
}
