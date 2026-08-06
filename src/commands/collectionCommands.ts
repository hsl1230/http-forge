/**
 * Collection & Folder commands.
 *
 * Single Responsibility: register every command that creates, edits, deletes,
 * duplicates, runs, imports, exports or reorders collections and folders
 * (plus the cross-type rename/delete tree actions).
 */

import type { CollectionService, ConfigService } from '@http-forge/core';
import { encodeFolderName, exportCollectionToRestClient } from '@http-forge/core';
import * as vscode from 'vscode';
import { enhanceCollectionWithAi } from '../infrastructure/ai-collection-enhancer';
import { CollectionEditorPanel } from '../presentation/webview/panels/collection-editor';
import { FolderEditorPanel } from '../presentation/webview/panels/folder-editor';
import { TestSuitePanel } from '../presentation/webview/panels/test-suite';
import { CollectionTreeItem } from '../presentation/components/tree-providers/collections-tree-provider';
import { COMMAND_IDS } from '../shared/constants';
import { moveItemInDirection } from './helpers/collection-utils';
import type { CommandContext } from './command-context';

export function registerCollectionCommands(ctx: CommandContext): void {
  const { context, collectionService, envConfigService, collectionsTreeProvider, collectionsView, testSuiteService } = ctx;

  // Refresh Collections
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.refreshCollections, () => {
      collectionsTreeProvider.refresh();
    })
  );

  // New Collection
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.newCollection, async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter collection name',
        placeHolder: 'My Collection'
      });
      if (name) {
        await collectionService.createCollection(name);
        collectionsTreeProvider.refresh();
        vscode.window.showInformationMessage(`Collection "${name}" created`);
      }
    })
  );

  // Edit Collection
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.editCollection, (item: CollectionTreeItem) => {
      if (item?.collectionId) {
        CollectionEditorPanel.show(context.extensionUri, item.collectionId);
      }
    })
  );

  // Delete Collection
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.deleteCollection, async (item: CollectionTreeItem) => {
      if (!item?.collectionId) return;

      const confirm = await vscode.window.showWarningMessage(
        `Delete collection "${item.label}"?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        await collectionService.deleteCollection(item.collectionId);
        collectionsTreeProvider.refresh();
        vscode.window.showInformationMessage('Collection deleted');
      }
    })
  );

  // Duplicate Collection
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.duplicateCollection, async (item: CollectionTreeItem) => {
      if (!item?.collectionId) return;

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter name for the duplicated collection',
        value: `${item.label} (Copy)`
      });

      if (newName) {
        try {
          await collectionService.duplicateCollection(item.collectionId, newName);
          collectionsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Collection duplicated as "${newName}"`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to duplicate collection: ${message}`);
        }
      }
    })
  );

  // New Folder
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.newFolder, async (item: CollectionTreeItem) => {
      if (!item?.collectionId) return;

      const name = await vscode.window.showInputBox({
        prompt: 'Enter folder name',
        placeHolder: 'New Folder'
      });

      if (name) {
        await collectionService.createFolder({
          name,
          collectionId: item.collectionId,
          parentId: item.folderId
        });
        collectionsTreeProvider.refresh();
        // Expand the parent item to show the new folder
        collectionsView.reveal(item, { expand: true });
      }
    })
  );

  // Edit Folder
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.editFolder, (item: CollectionTreeItem) => {
      if (item?.collectionId && item?.folderId) {
        FolderEditorPanel.show(context.extensionUri, item.collectionId, item.folderId);
      }
    })
  );

  // Delete Folder
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.deleteFolder, async (item: CollectionTreeItem) => {
      if (!item?.collectionId || !item?.folderId) return;

      const confirm = await vscode.window.showWarningMessage(
        `Delete folder "${item.label}" and all its contents?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        await collectionService.deleteFolder(item.collectionId, item.folderId);
        collectionsTreeProvider.refresh();
      }
    })
  );

  // Duplicate Folder
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.duplicateFolder, async (item: CollectionTreeItem) => {
      if (!item?.collectionId || !item?.folderId) return;

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter name for the duplicated folder',
        value: `${item.label} (Copy)`
      });

      if (newName) {
        try {
          await collectionService.duplicateFolder(item.collectionId, item.folderId, newName);
          collectionsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Folder duplicated as "${newName}"`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to duplicate folder: ${message}`);
        }
      }
    })
  );

  // Rename item (collection, folder, or request)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.renameItem, async (item: CollectionTreeItem) => {
      if (!item) return;

      const newName = await vscode.window.showInputBox({
        prompt: `Rename ${item.itemType}`,
        value: item.label as string,
        placeHolder: 'New name'
      });

      if (newName && newName !== item.label) {
        let success = false;
        switch (item.itemType) {
          case 'collection':
            success = await collectionService.renameCollection(item.collectionId, newName);
            break;
          case 'folder':
            if (item.folderId) {
              success = await collectionService.renameFolder(item.collectionId, item.folderId, newName);
            }
            break;
          case 'request':
            if (item.requestId) {
              success = await collectionService.renameRequest(item.collectionId, item.requestId, newName);
            }
            break;
        }
        if (success) {
          collectionsTreeProvider.refresh();
        }
      }
    })
  );

  // Delete item (collection, folder, or request)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.deleteItem, async (item: CollectionTreeItem) => {
      if (!item) return;

      const confirm = await vscode.window.showWarningMessage(
        `Delete ${item.itemType} "${item.label}"?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        let success = false;
        switch (item.itemType) {
          case 'collection':
            success = await collectionService.deleteCollection(item.collectionId);
            break;
          case 'folder':
            if (item.folderId) {
              success = await collectionService.deleteFolder(item.collectionId, item.folderId);
            }
            break;
          case 'request':
            if (item.requestId) {
              success = await collectionService.deleteRequest(item.collectionId, item.requestId);
            }
            break;
        }
        if (success) {
          collectionsTreeProvider.refresh();
        }
      }
    })
  );

  // Run Collection
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.runCollection, async (item: CollectionTreeItem) => {
      if (item?.collectionId && testSuiteService) {
        // Create temp suite from collection (unified approach)
        const tempSuite = await testSuiteService.createTempSuiteFromCollection(item.collectionId);
        if (tempSuite) {
          TestSuitePanel.createOrShow(context.extensionUri, tempSuite, testSuiteService);
        }
      }
    })
  );

  // Run Folder
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.runFolder, async (item: CollectionTreeItem) => {
      if (item?.collectionId && item.itemType === 'folder' && testSuiteService) {
        // Folder runs are recursive: include requests in nested subfolders.
        const displayPath = (item.itemPath ?? []).join('/');
        const folderPath = (item.itemPath ?? []).map(encodeFolderName).join('/');
        const tempSuite = await testSuiteService.createTempSuiteFromFolder(item.collectionId, folderPath, true);
        if (tempSuite) {
          TestSuitePanel.createOrShow(context.extensionUri, tempSuite, testSuiteService);
        } else {
          vscode.window.showWarningMessage(`No requests found under folder "${displayPath}".`);
        }
      }
    })
  );

  // Run Performance Test
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.runPerformanceTest, async (item: CollectionTreeItem) => {
      if (item?.collectionId && item.requestId && testSuiteService) {
        const tempSuite = await testSuiteService.createTempSuiteFromRequest(item.collectionId, item.requestId);
        if (tempSuite) {
          TestSuitePanel.createOrShow(context.extensionUri, tempSuite, testSuiteService);
        } else {
          vscode.window.showWarningMessage('Could not create performance test suite for this request.');
        }
      }
    })
  );

  // Import Collection
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.importCollection, async () => {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON Files': ['json']
        },
        title: 'Import Collection'
      });

      if (fileUri?.[0]) {
        const aiEnhance = await vscode.window.showQuickPick(
          [
            { label: '✨ Yes, enhance with AI', description: 'Fills realistic request bodies and generates test scripts', value: true },
            { label: 'No, import as-is', value: false }
          ],
          { placeHolder: 'Enhance imported collection with AI (GitHub Copilot)?' }
        );
        if (aiEnhance === undefined) return;

        try {
          const collection = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Importing collection...' },
            () => collectionService.importCollection(fileUri[0].fsPath)
          );
          collectionsTreeProvider.refresh();

          if (aiEnhance.value) {
            try {
              await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'AI enhancing collection…', cancellable: false },
                (progress) => enhanceCollectionWithAi(collection, collectionService, progress)
              );
            } catch (aiError: unknown) {
              const msg = aiError instanceof Error ? aiError.message : String(aiError);
              vscode.window.showWarningMessage(`AI enhancement skipped: ${msg}`);
            }
          }

          vscode.window.showInformationMessage(
            `Imported collection "${collection.name}"` + (aiEnhance.value ? ' ✨ AI enhanced' : '')
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to import collection: ${error}`);
        }
      }
    })
  );

  // Export Collection (JSON)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.exportCollection, async (item: CollectionTreeItem) => {
      if (!item?.collectionId) return;

      const collection = collectionService.getCollection(item.collectionId);
      if (!collection) return;

      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${collection.name}.json`),
        filters: {
          'JSON Files': ['json']
        },
        title: 'Export Collection'
      });

      if (saveUri) {
        try {
          await collectionService.exportCollection(item.collectionId, saveUri.fsPath);
          vscode.window.showInformationMessage(`Exported collection to ${saveUri.fsPath}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to export collection: ${error}`);
        }
      }
    })
  );

  // Export to rest-client folder (no UI prompt; path comes from http-forge.config.json)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.exportCollectionToRestClientFolder, async (item: CollectionTreeItem) => {
      if (!item?.collectionId) return;

      const collection = collectionService.getCollection(item.collectionId);
      if (!collection) return;

      try {
        const cfg = ctx.configService as ConfigService;
        const mergeGlobals = cfg.getRestClientMergeGlobals();
        const targetFolder = cfg.getRestClientExportPath();
        await exportCollectionToRestClient(collectionService, envConfigService, item.collectionId, targetFolder, mergeGlobals);
        vscode.window.showInformationMessage(`Exported collection to ${targetFolder}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to export collection: ${error}`);
      }
    })
  );

  // Move Item Up command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.moveItemUp, async (item?: CollectionTreeItem) => {
      // If no item passed (keyboard shortcut), get selected item from tree view
      const targetItem = item || collectionsView.selection[0];
      if (!targetItem?.collectionId) return;

      // Don't allow moving collections
      if (targetItem.itemType === 'collection') return;

      const itemId = targetItem.requestId || targetItem.folderId;
      if (!itemId) return;

      const moved = await moveItemInDirection(collectionService, targetItem.collectionId, itemId, 'up');
      if (moved) {
        collectionsTreeProvider.refresh();
      }
    })
  );

  // Move Item Down command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.moveItemDown, async (item?: CollectionTreeItem) => {
      // If no item passed (keyboard shortcut), get selected item from tree view
      const targetItem = item || collectionsView.selection[0];
      if (!targetItem?.collectionId) return;

      // Don't allow moving collections
      if (targetItem.itemType === 'collection') return;

      const itemId = targetItem.requestId || targetItem.folderId;
      if (!itemId) return;

      const moved = await moveItemInDirection(collectionService, targetItem.collectionId, itemId, 'down');
      if (moved) {
        collectionsTreeProvider.refresh();
      }
    })
  );
}
