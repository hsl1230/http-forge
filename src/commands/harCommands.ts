/**
 * HAR import commands.
 *
 * Single Responsibility: register the command that imports HAR archives
 * (browser/network captures) as collections. Kept separate from the OpenAPI
 * registrar so each import format owns its own command module.
 */

import { parseHar } from '@http-forge/core';
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../shared/constants';
import { countRequests } from './helpers/collection-utils';
import type { CommandContext } from './command-context';

export function registerHarCommands(ctx: CommandContext): void {
  const { context, collectionService, collectionsTreeProvider } = ctx;

  // Import HAR Archive
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.importHar, async () => {
      // File picker
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'HAR Files': ['har', 'json']
        },
        title: 'Import HAR Archive'
      });
      if (!fileUri?.[0]) return;

      // Quick pick: collection name
      const fileName = fileUri[0].fsPath.split('/').pop()?.replace(/\.(har|json)$/i, '') || 'Imported from HAR';
      const collectionName = await vscode.window.showInputBox({
        prompt: 'Collection name',
        value: fileName,
        placeHolder: 'My Session'
      });
      if (!collectionName) return;

      try {
        const fs = await import('fs');
        const raw = await fs.promises.readFile(fileUri[0].fsPath, 'utf-8');
        const { collection: harCollection } = parseHar(raw, { skipFailed: false });

        const collection = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Importing HAR archive...' },
          async () => {
            const created = await collectionService.createCollection(collectionName);
            for (const item of harCollection.items) {
              if (item.type === 'folder') {
                const folder = await collectionService.createFolder({
                  collectionId: created.id,
                  name: item.name,
                });
                for (const child of item.items ?? []) {
                  if (child.type === 'request') {
                    await createHarRequest(collectionService, created.id, folder.id, child);
                  }
                }
              } else if (item.type === 'request') {
                await createHarRequest(collectionService, created.id, undefined, item);
              }
            }
            return created;
          }
        );

        collectionsTreeProvider.refresh();

        vscode.window.showInformationMessage(
          `Imported "${collection.name}" (${countRequests(collection)} requests)`
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to import HAR archive: ${message}`);
      }
    })
  );
}

// ─── HAR helper ───────────────────────────────────────────────────────────────

async function createHarRequest(
  collectionService: CommandContext['collectionService'],
  collectionId: string,
  parentId: string | undefined,
  req: import('@http-forge/core').UnifiedRequest
): Promise<void> {
  const options: any = {
    collectionId,
    parentId,
    name: req.name,
    method: req.method,
    url: req.url,
  };
  if (req.headers?.length) options.headers = req.headers;
  if (req.query?.length) options.query = req.query;
  if (req.body) options.body = req.body;
  await collectionService.createRequest(options);
}
