/**
 * Request commands.
 *
 * Single Responsibility: register every command that creates, opens, saves,
 * updates, deletes, duplicates or closes HTTP request items/panels.
 */

import type { CollectionFolderItem, CollectionRequestItem, CollectionService } from '@http-forge/core';
import { generateId } from '@http-forge/core';
import * as vscode from 'vscode';
import { ensureRequestDefaults, RequestContext } from '../shared/utils';
import { CollectionTreeItem } from '../presentation/components/tree-providers/collections-tree-provider';
import { RequestTesterPanel } from '../presentation/webview/panels/request-tester';
import { RequestTesterPanelManager } from '../presentation/webview/panels/request-tester/request-tester-panel-manager';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

export function registerRequestCommands(ctx: CommandContext): void {
  const { context, collectionService, collectionsTreeProvider, collectionsView } = ctx;

  // New Request command (creates quick ad-hoc request, or new request in collection/folder)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.newRequest, async (item?: CollectionTreeItem) => {
      // Ask for request name
      const name = await vscode.window.showInputBox({
        prompt: 'Enter request name',
        placeHolder: 'New Request',
        value: 'New Request'
      });

      if (!name) {
        return; // User cancelled
      }

      const requestContext: RequestContext = {
        title: name,
        request: {
          id: generateId(name),
          name: name,
          method: 'GET',
          url: '',
          headers: [],
          query: [],
          body: null,
          scripts: {
            preRequest: '',
            postResponse: ''
          }
        },
        readonly: false,
        // If called from collection/folder context menu, pre-set the collection info
        collectionId: item?.collectionId,
        folderPath: item?.itemPath?.join('/'),
        allowDuplicatedName: true // Allow duplicate names for ad-hoc requests created from the tree (since they might not be saved to collection)
      };

      RequestTesterPanel.show(context.extensionUri, requestContext);
    })
  );

  // Open Request (from tree click)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.openRequest, async (requestContext: RequestContext) => {
      const manager = RequestTesterPanelManager.getInstance();
      await manager.show(requestContext, false); // Allow reusing active request panel
    })
  );

  // Open Request in New Panel command - always creates new panel
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.openRequestInNewPanel, async (item: CollectionTreeItem) => {
      if (!item?.collectionId || !item?.requestId || !item?.requestData) {
        vscode.window.showErrorMessage('Invalid request item');
        return;
      }

      // Build RequestContext from tree item
      const requestContext: RequestContext = {
        title: item.requestData.name || 'HTTP Request',
        collectionId: item.collectionId,
        folderPath: item.itemPath.join('/'),
        requestId: item.requestId,
        request: ensureRequestDefaults(item.requestData),
        readonly: false
      };

      const manager = RequestTesterPanelManager.getInstance();
      await manager.show(requestContext, true); // Force new panel (never reuse)
    })
  );

  // Close All Request Panels command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.closeAllRequestPanels, () => {
      const manager = RequestTesterPanelManager.getInstance();
      const count = manager.getOpenPanelCount();
      if (count > 0) {
        manager.closeAll();
        vscode.window.showInformationMessage(`Closed ${count} request panel${count > 1 ? 's' : ''}`);
      } else {
        vscode.window.showInformationMessage('No request panels to close');
      }
    })
  );

  // Delete Request
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.deleteRequest, async (item: CollectionTreeItem) => {
      if (!item?.collectionId || !item?.requestId) return;

      const confirm = await vscode.window.showWarningMessage(
        `Delete request "${item.label}"?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        await collectionService.deleteRequest(item.collectionId, item.requestId);
        collectionsTreeProvider.refresh();
      }
    })
  );

  // Duplicate Request
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.duplicateRequest, async (item: CollectionTreeItem) => {
      if (!item?.collectionId || !item?.requestId || !item?.requestData) return;

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter name for the duplicated request',
        value: `${item.label} (Copy)`
      });

      const requestData = item.requestData as CollectionRequestItem;
      if (newName) {
        await collectionService.createRequest({
          name: newName,
          method: requestData.method || 'GET',
          url: requestData.url || '',
          params: requestData.params,
          query: requestData.query,
          headers: requestData.headers,
          body: requestData.body,
          settings: requestData.settings,
          scripts: requestData.scripts,
          collectionId: item.collectionId,
          parentId: item.folderId
        });
        collectionsTreeProvider.refresh();
      }
    })
  );

  // Save Request to Collection (from Request Tester panel)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.saveRequestToCollection, async (requestData: any) => {
      // Show collection picker
      const collections = collectionService.getAllCollections();
      if (collections.length === 0) {
        const create = await vscode.window.showWarningMessage(
          'No collections found. Create one first?',
          'Create Collection'
        );
        if (create) {
          vscode.commands.executeCommand(COMMAND_IDS.newCollection);
        }
        return;
      }

      const selected = await vscode.window.showQuickPick(
        collections.map(c => ({ label: c.name, id: c.id })),
        { placeHolder: 'Select a collection' }
      );

      if (selected) {
        const name = await vscode.window.showInputBox({
          prompt: 'Enter request name',
          value: requestData.name || 'New Request'
        });

        if (name) {
          await collectionService.createRequest({
            name,
            method: requestData.method || 'GET',
            url: requestData.url || '',
            headers: requestData.headers,
            query: requestData.query,
            params: requestData.params,
            body: requestData.body,
            settings: requestData.settings,
            scripts: requestData.scripts,
            auth: requestData.auth,
            collectionId: selected.id,
            // Preserve OpenAPI metadata
            deprecated: requestData.deprecated,
            description: requestData.description,
            operationId: requestData.operationId,
            summary: requestData.summary,
            tags: requestData.tags,
            examples: requestData.examples,
            responses: requestData.responses,
            security: requestData.security,
            responseSchema: requestData.responseSchema,
            bodySchema: requestData.bodySchema
          } as any);
          collectionsTreeProvider.refresh();
          return true;
        }
      }
      return false;
    })
  );

  // Create request with full data (for saving new request to a pre-selected collection)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.createRequestWithData, async (requestData: any) => {
      if (!requestData.collectionId) {
        vscode.window.showErrorMessage('Cannot create request: missing collection ID');
        return false;
      }

      // Find parent folder ID from folderPath if provided
      let parentId: string | undefined;
      const folderPathParts: string[] = [];
      if (requestData.folderPath) {
        const collection = collectionService.getCollection(requestData.collectionId);
        if (collection) {
          const pathParts = requestData.folderPath.split('/').filter((p: string) => p);
          let items = collection.items || [];
          for (const pathPart of pathParts) {
            const folder = items.find(item => item.name === pathPart && item.type === 'folder') as CollectionFolderItem | undefined;
            if (folder) {
              parentId = folder.id;
              folderPathParts.push(pathPart);
              items = folder.items || [];
            }
          }
        }
      }

      const createdRequest = await collectionService.createRequest({
        id: requestData.requestId,
        name: requestData.name || 'New Request',
        method: requestData.method || 'GET',
        url: requestData.url || '',
        headers: requestData.headers,
        query: requestData.query,
        params: requestData.params,
        body: requestData.body || undefined,
        settings: requestData.settings,
        scripts: requestData.scripts,
        auth: requestData.auth,
        collectionId: requestData.collectionId,
        parentId,
        // Preserve OpenAPI metadata
        deprecated: requestData.deprecated,
        description: requestData.description,
        operationId: requestData.operationId,
        summary: requestData.summary,
        tags: requestData.tags,
        examples: requestData.examples,
        responses: requestData.responses,
        security: requestData.security,
        doc: requestData.doc,
        responseSchema: requestData.responseSchema,
        bodySchema: requestData.bodySchema
      } as any);

      // Create a tree item for the new request
      const newRequestTreeItem = new CollectionTreeItem(
        createdRequest.name,
        vscode.TreeItemCollapsibleState.None,
        'request',
        requestData.collectionId,
        folderPathParts,
        createdRequest,
        undefined,
        createdRequest.id
      );

      // Refresh tree and reveal the new item using onDidChangeTreeData event
      const disposable = collectionsTreeProvider.onDidChangeTreeData(() => {
        disposable.dispose(); // Remove listener after first fire
        collectionsView.reveal(newRequestTreeItem, { select: true, focus: true, expand: true });
      });
      collectionsTreeProvider.refresh();

      // Return the created request info so caller can update its state
      return {
        success: true,
        requestId: createdRequest.id,
        name: createdRequest.name
      };
    })
  );

  // Update Request
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.updateRequest, async (requestData: any) => {
      if (!requestData.collectionId || !requestData.requestId) {
        vscode.window.showErrorMessage('Cannot update request: missing collection or request ID');
        return;
      }

      await collectionService.updateRequest(
        requestData.collectionId,
        requestData.requestId,
        {
          name: requestData.name,
          method: requestData.method,
          url: requestData.url,
          params: requestData.params,
          headers: requestData.headers,
          query: requestData.query,
          body: requestData.body || undefined,
          settings: requestData.settings,
          scripts: requestData.scripts,
          auth: requestData.auth,
          // Preserve OpenAPI metadata
          deprecated: requestData.deprecated,
          description: requestData.description,
          operationId: requestData.operationId,
          summary: requestData.summary,
          tags: requestData.tags,
          examples: requestData.examples,
          responses: requestData.responses,
          security: requestData.security,
          doc: requestData.doc,
          responseSchema: requestData.responseSchema,
          bodySchema: requestData.bodySchema
        } as any
      );
      collectionsTreeProvider.refresh();
    })
  );
}
