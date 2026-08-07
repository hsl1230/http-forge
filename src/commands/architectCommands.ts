/**
 * API Architect commands.
 *
 * Single Responsibility: register the "Design an API from intent" command that
 * runs the Phase 4 / Layer 8 architect flow inside VS Code — intent → designed
 * OpenAPI spec → collection → test suite + flow + workflow chains + docs, shown
 * as a reviewable package with an approve (apply) step.
 *
 * All design/generation logic lives in @http-forge/core. This file is a thin
 * VS Code adapter: prompt collection + result presentation only.
 */

import {
  ApiArchitectService,
  ApiArchitectResult,
  OpenApiExporter,
  OpenApiImporter,
  SchemaInferenceService,
} from '@http-forge/core';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CopilotAiProvider } from '../infrastructure/copilot-ai-provider';
import { ServiceIdentifiers } from '../infrastructure/services/service-container';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

export function registerArchitectCommands(ctx: CommandContext): void {
  const {
    context,
    container,
    collectionsTreeProvider,
    testSuitesTreeProvider,
    environmentsTreeProvider,
    workspaceFolder,
  } = ctx;

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.architect, async () => {
      const intent = await vscode.window.showInputBox({
        prompt: 'Describe the API you want designed',
        placeHolder: 'e.g. "I need a shopping cart" or "a todo list with auth"',
        ignoreFocusOut: true,
      });
      if (!intent?.trim()) return;

      const collectionName = await vscode.window.showInputBox({
        prompt: 'Collection/API name (optional — derived from the spec if left blank)',
        placeHolder: 'e.g. Shopping Cart API',
        ignoreFocusOut: true,
      });
      if (collectionName === undefined) return;

      const baseUrl = await vscode.window.showInputBox({
        prompt: 'Base URL for the designed API (optional)',
        placeHolder: 'http://localhost:3000',
        ignoreFocusOut: true,
      });
      if (baseUrl === undefined) return;

      const environmentName = await vscode.window.showInputBox({
        prompt: 'Environment name to create with the server URL (optional)',
        placeHolder: 'e.g. prod',
        ignoreFocusOut: true,
      });
      if (environmentName === undefined) return;

      try {
        const provider = new CopilotAiProvider();
        const importer = container.resolve<OpenApiImporter>(ServiceIdentifiers.OpenApiImporter);
        const exporter = container.resolve<OpenApiExporter>(ServiceIdentifiers.OpenApiExporter);
        const inference = container.resolve<SchemaInferenceService>(ServiceIdentifiers.SchemaInferenceService);
        const architect = new ApiArchitectService(importer, exporter, provider);

        const result = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Designing API from intent…',
            cancellable: false,
          },
          () =>
            architect.designFromIntent(intent.trim(), {
              collectionName: collectionName?.trim() || undefined,
              baseUrl: baseUrl?.trim() || undefined,
              environmentName: environmentName?.trim() || undefined,
              workspaceFolder,
            })
        );

        await presentResult(ctx, result);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to design API: ${message}`);
      }
    })
  );
}

/**
 * Present the reviewable package and run the approve (apply) step when chosen.
 */
async function presentResult(
  ctx: CommandContext,
  result: ApiArchitectResult
): Promise<void> {
  const {
    testSuiteService,
    collectionsTreeProvider,
    testSuitesTreeProvider,
    environmentsTreeProvider,
    workspaceFolder,
  } = ctx;

  // Show the designed docs in a markdown preview for review.
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: result.docs,
  });
  void vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.One });

  const endpointLines = result.endpoints
    .map((ep) => `${ep.method.toUpperCase().padEnd(6)} ${ep.pathExpression}${ep.auth?.required ? ' (auth)' : ''}`)
    .join('\n');

  const workflowLines =
    result.workflows.length > 0
      ? '\n\nWorkflows:\n' +
        result.workflows
          .map((w) => `  - [${w.kind}] ${w.name} (${w.dependents.length} dependents)`)
          .join('\n')
      : '';

  const choice = await vscode.window.showInformationMessage(
    `Designed API "${result.collectionName}" — ${result.endpoints.length} endpoints, suite ${result.suite.nodes.length} nodes, ${result.workflows.length} workflow chains.`,
    { modal: false },
    'Apply package',
    'Show OpenAPI',
    'Show flow'
  );

  if (choice === 'Apply package') {
    await testSuiteService.updateSuite(result.suite);

    // Write byproduct files into the workspace .http-forge/ folder.
    const byproducts: string[] = [];
    if (workspaceFolder) {
      const forgeDir = path.join(workspaceFolder, '.http-forge');
      fs.mkdirSync(forgeDir, { recursive: true });

      const flowPath = path.join(forgeDir, `${result.collectionName}.flow.js`);
      fs.writeFileSync(flowPath, result.flow, 'utf-8');
      byproducts.push(flowPath);

      const docsPath = path.join(forgeDir, `${result.collectionName}.docs.md`);
      fs.writeFileSync(docsPath, result.docs, 'utf-8');
      byproducts.push(docsPath);

      const openapiPath = path.join(forgeDir, `${result.collectionName}.openapi.json`);
      fs.writeFileSync(openapiPath, result.openapi, 'utf-8');
      byproducts.push(openapiPath);
    }

    collectionsTreeProvider.refresh();
    testSuitesTreeProvider.refresh();
    if (result.environmentCreated) environmentsTreeProvider.refresh();

    const detail = byproducts.length > 0 ? `\nWritten to:\n${byproducts.map((p) => `  ${p}`).join('\n')}` : '';
    const open = await vscode.window.showInformationMessage(
      `Applied package "${result.collectionName}".\n\nEndpoints:\n${endpointLines}${workflowLines}${detail}`,
      'Open OpenAPI',
      'Open flow'
    );
    if (open === 'Open OpenAPI' && byproducts.length >= 3) {
      const uri = vscode.Uri.file(byproducts[2]);
      const d = await vscode.workspace.openTextDocument(uri);
      void vscode.window.showTextDocument(d, { preview: true });
    } else if (open === 'Open flow' && byproducts.length >= 1) {
      const uri = vscode.Uri.file(byproducts[0]);
      const d = await vscode.workspace.openTextDocument(uri);
      void vscode.window.showTextDocument(d, { preview: true });
    }
    return;
  }

  if (choice === 'Show OpenAPI') {
    const d = await vscode.workspace.openTextDocument({
      language: 'json',
      content: result.openapi,
    });
    void vscode.window.showTextDocument(d, { preview: true });
    return;
  }

  if (choice === 'Show flow') {
    const d = await vscode.workspace.openTextDocument({
      language: 'javascript',
      content: result.flow,
    });
    void vscode.window.showTextDocument(d, { preview: true });
    return;
  }
}
