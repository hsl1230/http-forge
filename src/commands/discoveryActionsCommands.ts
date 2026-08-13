/**
 * Discovered APIs action commands.
 *
 * Single Responsibility: register the actions that turn the Discovered APIs
 * tree view into a working "discover → generate → keep in sync" loop:
 *
 *   - discoverRequestFromEndpoint — a discovered endpoint becomes a working
 *     HTTP Forge request in a chosen collection.
 *   - generateSuiteFromDiscovered — a framework group (or all endpoints)
 *     becomes a test suite (one node per endpoint) with the discovered status
 *     assertions, persisted via the test-suite service.
 *   - checkDiscoveryDrift — compare the project's current freshness against the
 *     last scan; when stale, offer to regenerate the derived suite.
 *
 * All heavy lifting lives in @http-forge/core; this file only collects user
 * input (target collection/base URL) and presents results.
 */

import {
  computeProjectFreshness,
  detectProjectDrift,
  generateFlowFromEndpoints,
  generateSuiteFromEndpoints,
  endpointToCreateRequestOptions,
  type CollectionService,
  type DiscoveredApi,
} from '@http-forge/core';
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../shared/constants';
import {
  DiscoveredEndpointItem,
  FrameworkGroupItem,
} from '../presentation/components/tree-providers/discovered-apis-tree-provider';
import type { CommandContext } from './command-context';

export function registerDiscoveryActionCommands(ctx: CommandContext): void {
  const {
    context,
    collectionService,
    testSuiteService,
    collectionsTreeProvider,
    testSuitesTreeProvider,
    discoveredApisTreeProvider,
    workspaceFolder,
  } = ctx;

  // ── Discover a request from an endpoint ─────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.discoverRequestFromEndpoint, async (item?: DiscoveredEndpointItem) => {
      const endpoint = item?.endpoint ?? await pickEndpoint(discoveredApisTreeProvider);
      if (!endpoint) return;

      const collection = await pickCollection(collectionService, 'Target collection for the new request');
      if (!collection) return;

      const baseUrl = await promptBaseUrl('Base URL for the new request (optional)');
      if (baseUrl === undefined) return;

      try {
        const options = endpointToCreateRequestOptions(endpoint, collection.id, baseUrl);
        const req = await collectionService.createRequest(options) as any;
        collectionsTreeProvider.refresh();
        vscode.window.showInformationMessage(
          `Created request "${req?.name ?? endpointToName(endpoint)}" in "${collection.name}" ` +
          `(${endpoint.method} ${endpoint.pathExpression}).`,
          'Open Request'
        );
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to create request: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  // ── Generate a test suite from discovered endpoints ─────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.generateSuiteFromDiscovered, async (item?: FrameworkGroupItem) => {
      const endpoints = item?.endpoints ?? discoveredApisTreeProvider.getEndpoints();
      if (endpoints.length === 0) {
        vscode.window.showWarningMessage('No endpoints discovered. Run the scan first.');
        return;
      }

      const collection = await pickCollection(collectionService, 'Target collection for generated requests');
      if (!collection) return;

      const baseUrl = await promptBaseUrl('Base URL for generated requests (optional)');
      if (baseUrl === undefined) return;

      const name = await vscode.window.showInputBox({
        prompt: 'Suite name',
        value: `Generated ${collection.name} suite`,
        ignoreFocusOut: true,
      });
      if (name === undefined) return;

      try {
        // Create a request for every endpoint so suite nodes reference real ids.
        const endpointsWithIds: DiscoveredApi[] = [];
        for (const ep of endpoints) {
          const req = await collectionService.createRequest(
            endpointToCreateRequestOptions(ep, collection.id, baseUrl)
          ) as any;
          endpointsWithIds.push({ ...ep, id: req?.id });
        }

        const generated = generateSuiteFromEndpoints(endpointsWithIds, {
          collectionId: collection.id,
          collectionName: collection.name,
          name,
        });
        await testSuiteService.updateSuite(generated.suite);

        const flow = generateFlowFromEndpoints(endpointsWithIds, { name: `${name} flow` });

        collectionsTreeProvider.refresh();
        testSuitesTreeProvider.refresh();

        const action = await vscode.window.showInformationMessage(
          `Generated suite "${generated.suite.name}" — ${generated.suite.nodes.length} node(s), ` +
          `${endpointsWithIds.length} request(s) created in "${collection.name}".`,
          'Open Suite'
        );
        if (action === 'Open Suite') {
          await vscode.commands.executeCommand(COMMAND_IDS.openTestSuite, generated.suite);
        }
        void flow; // .flow.js is available as a byproduct; not persisted here.
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to generate suite: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  // ── Check drift + propose regeneration ──────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.checkDiscoveryDrift, async () => {
      const stored = discoveredApisTreeProvider.getLastScanFreshness();
      if (!stored) {
        vscode.window.showWarningMessage('No prior scan recorded. Run the scan first, then check drift.');
        return;
      }

      try {
        const drift = detectProjectDrift(workspaceFolder, {
          gitHash: stored.gitHash,
          scannedAt: stored.scannedAt,
        });

        if (drift.status === 'current') {
          vscode.window.showInformationMessage(
            `Project is up to date with the last scan.${drift.currentFreshness.gitHash ? ` (git ${drift.currentFreshness.gitHash.slice(0, 8)})` : ''}`
          );
          return;
        }

        if (drift.status === 'unknown') {
          vscode.window.showInformationMessage('Drift status is unknown (no git fingerprint available). Re-scan to refresh.');
          return;
        }

        // Stale: propose regenerating the derived suite(s).
        const current = computeProjectFreshness(workspaceFolder);
        const reason = drift.reason ?? 'source changed since the last scan';
        const regen = await vscode.window.showWarningMessage(
          `Project has drifted: ${reason}\n\n` +
          `Regenerate the discovered suite(s) to reflect the current source?`,
          { modal: false },
          'Regenerate Suite',
          'Re-scan'
        );

        if (regen === 'Regenerate Suite') {
          await vscode.commands.executeCommand(COMMAND_IDS.generateSuiteFromDiscovered);
        } else if (regen === 'Re-scan') {
          await discoveredApisTreeProvider.scan();
        }
        void current;
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Drift check failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Let the user pick an endpoint from the currently discovered set. */
async function pickEndpoint(
  provider: { getEndpoints(): DiscoveredApi[] }
): Promise<DiscoveredApi | undefined> {
  const endpoints = provider.getEndpoints();
  if (endpoints.length === 0) {
    vscode.window.showWarningMessage('No endpoints discovered. Run the scan first.');
    return undefined;
  }
  const pick = await vscode.window.showQuickPick(
    endpoints.map((ep) => ({
      label: `${ep.method.toUpperCase().padEnd(6)} ${ep.pathExpression}`,
      description: `${ep.framework} · ${ep.confidence}`,
      detail: ep.source?.filePath,
      endpoint: ep,
    })),
    { placeHolder: 'Select an endpoint' }
  );
  return pick?.endpoint;
}

/** Let the user pick a target collection. */
async function pickCollection(
  collectionService: CollectionService,
  placeHolder: string
): Promise<{ id: string; name: string } | undefined> {
  const collections = collectionService.getAllCollections();
  if (collections.length === 0) {
    const create = await vscode.window.showWarningMessage(
      'No collections exist. Create one?',
      { modal: false },
      'Create Collection'
    );
    if (create !== 'Create Collection') return undefined;
    const name = await vscode.window.showInputBox({ prompt: 'Collection name', ignoreFocusOut: true });
    if (!name?.trim()) return undefined;
    const col = await collectionService.createCollection(name.trim());
    return { id: col.id, name: col.name };
  }

  const pick = await vscode.window.showQuickPick(
    collections.map((c) => ({ label: c.name, description: c.id, collection: c })),
    { placeHolder }
  );
  return pick?.collection;
}

/** Prompt for an optional base URL (empty ⇒ use the endpoint's own path). */
async function promptBaseUrl(placeHolder: string): Promise<string | undefined> {
  const input = await vscode.window.showInputBox({
    prompt: placeHolder,
    placeHolder: 'http://localhost:3000',
    ignoreFocusOut: true,
  });
  return input === undefined ? undefined : input.trim().replace(/\/+$/, '');
}

/** Derive a display name from an endpoint (mirrors core's helper). */
function endpointToName(endpoint: DiscoveredApi): string {
  return endpoint.source?.symbolName || `${endpoint.method || 'GET'} ${endpoint.pathExpression}`;
}
