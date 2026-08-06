/**
 * OpenAPI + Schema commands.
 *
 * Single Responsibility: register commands that export/import OpenAPI specs
 * and infer response schemas for collections/requests.
 */

import type { OpenApiExportOptions } from '@http-forge/core';
import { OpenApiExporter, OpenApiImporter, SchemaInferenceService } from '@http-forge/core';
import * as vscode from 'vscode';
import { enhanceCollectionWithAi } from '../infrastructure/ai-collection-enhancer';
import { ServiceIdentifiers } from '../infrastructure/services/service-container';
import { CollectionTreeItem } from '../presentation/components/tree-providers/collections-tree-provider';
import { COMMAND_IDS } from '../shared/constants';
import { collectAllRequests, countRequests, findRequestInCollection } from './helpers/collection-utils';
import type { CommandContext } from './command-context';

export function registerOpenApiCommands(ctx: CommandContext): void {
  const { context, collectionService, envConfigService, collectionsTreeProvider, environmentsTreeProvider, container } = ctx;

  // Export Collection as OpenAPI
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.exportOpenApi, async (item: CollectionTreeItem) => {
      if (!item?.collectionId) return;

      const collection = collectionService.getCollection(item.collectionId);
      if (!collection) return;

      // Quick pick: format
      const formatPick = await vscode.window.showQuickPick(
        [
          { label: 'JSON', value: 'json' as const },
          { label: 'YAML', value: 'yaml' as const }
        ],
        { placeHolder: 'Export format' }
      );
      if (!formatPick) return;

      // Quick pick: infer from history
      const inferPick = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: true },
          { label: 'No', value: false }
        ],
        { placeHolder: 'Include inferred response schemas from history?' }
      );
      if (inferPick === undefined) return;

      // Multi-select: environments for servers
      const envNames = envConfigService.getEnvironmentNames();
      let selectedEnvs: string[] = [];
      if (envNames.length > 0) {
        const envPicks = await vscode.window.showQuickPick(
          envNames.map(e => ({ label: e, picked: false })),
          { placeHolder: 'Select environments for server URLs (optional)', canPickMany: true }
        );
        if (envPicks) {
          selectedEnvs = envPicks.map(p => p.label);
        }
      }

      // Save dialog
      const ext = formatPick.value === 'yaml' ? 'yaml' : 'json';
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${collection.name}.openapi.${ext}`),
        filters: formatPick.value === 'yaml'
          ? { 'YAML Files': ['yaml', 'yml'] }
          : { 'JSON Files': ['json'] },
        title: 'Export OpenAPI Spec'
      });
      if (!saveUri) return;

      try {
        const exporter = container.resolve<OpenApiExporter>(ServiceIdentifiers.OpenApiExporter);
        const options: OpenApiExportOptions = {
          format: formatPick.value,
          environments: selectedEnvs.length > 0 ? selectedEnvs : undefined,
          inferFromHistory: inferPick.value
        };

        const output = await exporter.export(item.collectionId, options);
        const fs = await import('fs');
        await fs.promises.writeFile(saveUri.fsPath, output, 'utf-8');

        const action = await vscode.window.showInformationMessage(
          `Exported OpenAPI spec to ${saveUri.fsPath}`,
          'Open File'
        );
        if (action === 'Open File') {
          const doc = await vscode.workspace.openTextDocument(saveUri);
          await vscode.window.showTextDocument(doc);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to export OpenAPI spec: ${message}`);
      }
    })
  );

  // Import OpenAPI Spec
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.importOpenApi, async () => {
      // File picker
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'OpenAPI Files': ['json', 'yaml', 'yml']
        },
        title: 'Import OpenAPI Spec'
      });
      if (!fileUri?.[0]) return;

      // Quick pick: collection name
      const filePath = fileUri[0].fsPath;
      const fileName = filePath.split('/').pop()?.replace(/\.(json|ya?ml)$/, '') || 'Imported API';
      const collectionName = await vscode.window.showInputBox({
        prompt: 'Collection name',
        value: fileName,
        placeHolder: 'My API'
      });
      if (!collectionName) return;

      // Quick pick: create environments from servers
      const createEnvs = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: true },
          { label: 'No', value: false }
        ],
        { placeHolder: 'Create environments from server URLs?' }
      );
      if (createEnvs === undefined) return;

      // Quick pick: AI enhancement
      const aiEnhance = await vscode.window.showQuickPick(
        [
          { label: '✨ Yes, enhance with AI', description: 'Fills realistic request bodies and generates test scripts', value: true },
          { label: 'No, import as-is', value: false }
        ],
        { placeHolder: 'Enhance imported collection with AI (GitHub Copilot)?' }
      );
      if (aiEnhance === undefined) return;

      try {
        const importer = container.resolve<OpenApiImporter>(ServiceIdentifiers.OpenApiImporter);
        const result = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Importing OpenAPI spec...' },
          () => importer.import(filePath, {
            collectionName,
            environmentName: createEnvs.value ? collectionName : undefined
          })
        );

        collectionsTreeProvider.refresh();
        if (result.environmentCreated) {
          environmentsTreeProvider.refresh();
        }

        if (aiEnhance?.value) {
          try {
            const collectionServiceFromContainer = container.collection;
            await vscode.window.withProgress(
              { location: vscode.ProgressLocation.Notification, title: 'AI enhancing collection…', cancellable: false },
              (progress) => enhanceCollectionWithAi(result.collection, collectionServiceFromContainer, progress)
            );
          } catch (aiError: unknown) {
            const msg = aiError instanceof Error ? aiError.message : String(aiError);
            vscode.window.showWarningMessage(`AI enhancement skipped: ${msg}`);
          }
        }

        vscode.window.showInformationMessage(
          `Imported "${result.collection.name}" (${countRequests(result.collection)} requests)` +
          (result.environmentCreated ? ` with environment "${result.environmentCreated}"` : '') +
          (aiEnhance?.value ? ' ✨ AI enhanced' : '')
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to import OpenAPI spec: ${message}`);
      }
    })
  );

  // Infer Response Schema for a single request
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.inferResponseSchema, async (item: CollectionTreeItem) => {
      if (!item?.collectionId || !item?.requestId) return;

      try {
        const inferenceService = container.resolve<SchemaInferenceService>(ServiceIdentifiers.SchemaInferenceService);

        // Get existing schema if any
        const collection = collectionService.getCollection(item.collectionId);
        const request = findRequestInCollection(collection, item.requestId);
        const existingSchema = request?.responseSchema;

        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Inferring response schema...' },
          async () => {
            const schema = await inferenceService.infer(
              item.collectionId,
              item.requestId!,
              existingSchema,
              { postResponseScript: request?.scripts?.postResponse }
            );

            // Save the schema back to the request
            await collectionService.updateRequest(item.collectionId, item.requestId!, {
              responseSchema: schema
            } as any);

            collectionsTreeProvider.refresh();
            vscode.window.showInformationMessage(
              `Response schema inferred for "${item.label}" (${Object.keys(schema).length} status codes)`
            );
          }
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to infer response schema: ${message}`);
      }
    })
  );

  // Infer All Response Schemas for a collection
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.inferAllResponseSchemas, async (item: CollectionTreeItem) => {
      if (!item?.collectionId) return;

      const collection = collectionService.getCollection(item.collectionId);
      if (!collection) return;

      const requests = collectAllRequests(collection);
      if (requests.length === 0) {
        vscode.window.showInformationMessage('No requests found in this collection.');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Infer response schemas for ${requests.length} requests in "${collection.name}"?`,
        'Infer All',
        'Cancel'
      );
      if (confirm !== 'Infer All') return;

      try {
        const inferenceService = container.resolve<SchemaInferenceService>(ServiceIdentifiers.SchemaInferenceService);
        let successCount = 0;
        let errorCount = 0;

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Inferring response schemas',
            cancellable: true
          },
          async (progress, token) => {
            for (let i = 0; i < requests.length; i++) {
              if (token.isCancellationRequested) break;

              const req = requests[i];
              progress.report({
                message: `${i + 1}/${requests.length}: ${req.name}`,
                increment: (100 / requests.length)
              });

              try {
                const schema = await inferenceService.infer(
                  item.collectionId,
                  req.id,
                  req.responseSchema,
                  { postResponseScript: req.scripts?.postResponse }
                );

                await collectionService.updateRequest(item.collectionId, req.id, {
                  responseSchema: schema
                } as any);
                successCount++;
              } catch {
                errorCount++;
              }
            }
          }
        );

        collectionsTreeProvider.refresh();
        vscode.window.showInformationMessage(
          `Schema inference complete: ${successCount} succeeded, ${errorCount} failed`
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to infer response schemas: ${message}`);
      }
    })
  );
}
