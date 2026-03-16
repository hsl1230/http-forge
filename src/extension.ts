import type { Collection, CollectionItem } from '@http-forge/core';
import { CollectionFolderItem, CollectionRequestItem, CollectionService, ConfigService, CookieService, EnvironmentConfigService, exportCollectionToRestClient, generateId, HttpRequestService, OpenApiExporter, type OpenApiExportOptions, OpenApiImporter, RequestHistoryService, SchemaInferenceService, TestSuite, TestSuiteService } from '@http-forge/core';
import * as vscode from 'vscode';
import { HttpForgeApi, HttpForgeApiImpl } from './api';
import { CollectionsTreeProvider, CollectionTreeItem } from './providers/collections-tree-provider';
import { EnvironmentsTreeProvider, EnvironmentTreeItem } from './providers/environments-tree-provider';
import { TestSuitesTreeProvider, TestSuiteTreeItem } from './providers/test-suites-tree-provider';
import { BootstrapResult, bootstrapServices } from './services/service-bootstrap';
import { getServiceContainer, ServiceIdentifiers } from './services/service-container';
import { COMMAND_IDS, EXTENSION_ID } from './shared/constants';
import { ensureRequestDefaults, RequestContext } from './shared/utils';
import { CollectionEditorPanel } from './webview-panels/collection-editor';
import { EnvironmentEditorPanel } from './webview-panels/environment-editor';
import { FolderEditorPanel } from './webview-panels/folder-editor';
import { RequestTesterPanel } from './webview-panels/request-tester';
import { RequestTesterPanelManager } from './webview-panels/request-tester/request-tester-panel-manager';
import { TestSuitePanel } from './webview-panels/test-suite';

// Service container for dependency injection
let services: BootstrapResult | undefined;

// Test Suite service
let testSuiteService: TestSuiteService | undefined;

// Tree providers
let collectionsTreeProvider: CollectionsTreeProvider;
let environmentsTreeProvider: EnvironmentsTreeProvider;
let testSuitesTreeProvider: TestSuitesTreeProvider;

// Tree views
let collectionsView: vscode.TreeView<CollectionTreeItem>;

/**
 * Extension activation
 * 
 * Uses service bootstrap for dependency injection (Dependency Inversion Principle)
 */
export function activate(context: vscode.ExtensionContext): HttpForgeApi {
  console.log(`[${EXTENSION_ID}] Activating HTTP Forge extension`);

  // Get workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('HTTP Forge: No workspace folder open');
    // Return empty API
    return createEmptyApi();
  }

  // Bootstrap services using dependency injection container
  services = bootstrapServices({
    context,
    workspaceFolder
  });

  RequestTesterPanelManager.resetInstance();

  // Initialize the Request Tester Panel Manager
  const panelManager = RequestTesterPanelManager.getInstance();
  panelManager.setExtensionUri(context.extensionUri);

  // Get typed services from container (Dependency Inversion - using interfaces)
  const { envConfigService, collectionService, httpService, cookieService, historyService, configService } = services;

  // Initialize Test Suite service
  testSuiteService = new TestSuiteService(collectionService as CollectionService, configService, { watch: true, onSuitesChanged: () => testSuitesTreeProvider?.refresh() });

  // Initialize tree providers
  collectionsTreeProvider = new CollectionsTreeProvider(collectionService as CollectionService);
  environmentsTreeProvider = new EnvironmentsTreeProvider(envConfigService as EnvironmentConfigService);
  testSuitesTreeProvider = new TestSuitesTreeProvider(testSuiteService);

  // Register tree views
  collectionsView = vscode.window.createTreeView('httpForge.collections', {
    treeDataProvider: collectionsTreeProvider,
    showCollapseAll: true,
    dragAndDropController: collectionsTreeProvider,
    canSelectMany: false
  });

  const testSuitesView = vscode.window.createTreeView('httpForge.testSuites', {
    treeDataProvider: testSuitesTreeProvider
  });

  const environmentsView = vscode.window.createTreeView('httpForge.environments', {
    treeDataProvider: environmentsTreeProvider
  });

  // Register all commands
  registerCommands(context, workspaceFolder);

  // Register OAuth2 callback URI handler
  const oauth2TokenManager = services.container.oauth2TokenManager;
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri) {
        if (uri.path === '/oauth2/callback') {
          const params = new URLSearchParams(uri.query);
          const code = params.get('code') || undefined;
          const state = params.get('state') || undefined;
          const error = params.get('error') || undefined;
          const accessToken = params.get('access_token') || undefined;
          const tokenType = params.get('token_type') || undefined;
          const expiresInStr = params.get('expires_in');
          const expiresIn = expiresInStr ? parseInt(expiresInStr, 10) : undefined;

          if (accessToken) {
            // Implicit flow callback — access_token in query/fragment
            oauth2TokenManager.handleImplicitCallback(accessToken, tokenType, expiresIn, state);
          } else {
            // Authorization code flow callback (or error)
            oauth2TokenManager.handleAuthorizationCallback(code, state, error);
          }
        }
      }
    })
  );

  // Add disposables
  context.subscriptions.push(
    collectionsView,
    testSuitesView,
    environmentsView
  );

  // Create and return the public API
  const api = new HttpForgeApiImpl(
    context,
    envConfigService as EnvironmentConfigService,
    collectionService as CollectionService,
    httpService as HttpRequestService,
    cookieService as CookieService,
    historyService as RequestHistoryService,
    () => collectionsTreeProvider.refresh(),
    () => environmentsTreeProvider.refresh()
  );

  console.log(`[${EXTENSION_ID}] HTTP Forge extension activated`);
  return api;
}

/**
 * Register all extension commands
 * Uses services from the bootstrap result (Dependency Inversion)
 */
function registerCommands(context: vscode.ExtensionContext, workspaceFolder: string): void {
  // Get services from container
  const envConfigService = services!.envConfigService as EnvironmentConfigService;
  const collectionService = services!.collectionService as CollectionService;

  // Refresh commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.refreshCollections, () => {
      collectionsTreeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.refreshEnvironments, () => {
      environmentsTreeProvider.refresh();
    })
  );

  // Environment commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.newEnvironment, async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter environment name',
        placeHolder: 'production'
      });
      if (name) {
        try {
          await envConfigService.createEnvironment(name);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Environment "${name}" created`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to create environment: ${message}`);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.deleteEnvironment, async (item: EnvironmentTreeItem) => {
      if (!item?.environmentId) return;
      
      const confirm = await vscode.window.showWarningMessage(
        `Delete environment "${item.label}"?`,
        { modal: true },
        'Delete'
      );
      
      if (confirm === 'Delete') {
        try {
          await envConfigService.deleteEnvironment(item.environmentId);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Environment "${item.label}" deleted`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to delete environment: ${message}`);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.duplicateEnvironment, async (item: EnvironmentTreeItem) => {
      if (!item?.environmentId) return;
      
      const newName = await vscode.window.showInputBox({
        prompt: 'Enter name for duplicated environment',
        placeHolder: `${item.environmentId}-copy`
      });
      
      if (newName) {
        try {
          await envConfigService.duplicateEnvironment(item.environmentId, newName);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Environment duplicated as "${newName}"`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to duplicate environment: ${message}`);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.renameEnvironment, async (item: EnvironmentTreeItem) => {
      if (!item?.environmentId) return;
      
      const newName = await vscode.window.showInputBox({
        prompt: 'Enter new name for environment',
        value: item.environmentId,
        valueSelection: [0, item.environmentId.length]
      });
      
      if (newName && newName !== item.environmentId) {
        try {
          await envConfigService.renameEnvironment(item.environmentId, newName);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Environment renamed to "${newName}"`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to rename environment: ${message}`);
        }
      }
    })
  );

  // Collection commands
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

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.editCollection, (item: CollectionTreeItem) => {
      if (item?.collectionId) {
        CollectionEditorPanel.show(context.extensionUri, item.collectionId);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.editFolder, (item: CollectionTreeItem) => {
      if (item?.collectionId && item?.folderId) {
        FolderEditorPanel.show(context.extensionUri, item.collectionId, item.folderId);
      }
    })
  );

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
        try {
          const collection = await collectionService.importCollection(fileUri[0].fsPath);
          collectionsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Imported collection "${collection.name}"`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to import collection: ${error}`);
        }
      }
    })
  );

  // Import Postman environment (view title button)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.importPostmanEnvironment, async () => {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON Files': ['json']
        },
        title: 'Import Environment'
      });

      if (fileUri?.[0]) {
        try {
          const importedEnv = envConfigService.importPostmanEnvironmentFile(fileUri[0].fsPath);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Imported environment "${importedEnv?.name || fileUri[0].fsPath}"`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Failed to import environment: ${message}`);
        }
      }
    })
  );

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

// export to rest-client folder (no UI prompt; path comes from http-forge.config.json)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.exportCollectionToRestClientFolder, async (item: CollectionTreeItem) => {
      if (!item?.collectionId) return;

      const collection = collectionService.getCollection(item.collectionId);
      if (!collection) return;

      try {
        const cfg = services!.configService as ConfigService;
        const mergeGlobals = cfg.getRestClientMergeGlobals();
        const targetFolder = cfg.getRestClientExportPath();
        await exportCollectionToRestClient(collectionService, envConfigService, item.collectionId, targetFolder, mergeGlobals);
        vscode.window.showInformationMessage(`Exported collection to ${targetFolder}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to export collection: ${error}`);
      }
    })
  );

  // Folder commands
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

  // Environment commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.selectEnvironment, async (item: EnvironmentTreeItem) => {
      if (item?.environmentId) {
        await envConfigService.setSelectedEnvironment(item.environmentId);
        environmentsTreeProvider.refresh();
        // Notify all open request panels of the environment change
        RequestTesterPanelManager.getInstance().notifyEnvironmentChange(item.environmentId);
        // Notify Test Suite panel of the environment change
        if (TestSuitePanel.currentPanel) {
          TestSuitePanel.currentPanel.notifyEnvironmentChange(item.environmentId);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.editEnvironments, (selectedEnv?: string) => {
      EnvironmentEditorPanel.show(context.extensionUri, selectedEnv);
    })
  );

  // Edit single environment from tree view context menu
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.editEnvironment, (item: EnvironmentTreeItem) => {
      EnvironmentEditorPanel.show(context.extensionUri, item?.environmentId);
    })
  );

  // Save/Update request commands
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
            responseSchema: requestData.responseSchema,
            bodySchema: requestData.bodySchema
          });
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
        responseSchema: requestData.responseSchema,
        bodySchema: requestData.bodySchema
      });

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
          responseSchema: requestData.responseSchema,
          bodySchema: requestData.bodySchema
        }
      );
      collectionsTreeProvider.refresh();
    })
  );

  // ========================================
  // Test Suite Commands
  // ========================================

  // Refresh Test Suites
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.refreshTestSuites, () => {
      testSuitesTreeProvider.refresh();
    })
  );

  // New Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.newTestSuite, async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter test suite name',
        placeHolder: 'My Test Suite'
      });
      if (name && testSuiteService) {
        const suite = await testSuiteService.createSuite(name);
        testSuitesTreeProvider.refresh();
        // Open the newly created suite
        TestSuitePanel.createOrShow(context.extensionUri, suite, testSuiteService);
        vscode.window.showInformationMessage(`Test Suite "${name}" created`);
      }
    })
  );

  // Open Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.openTestSuite, async (suite: TestSuite) => {
      if (suite && testSuiteService) {
        TestSuitePanel.createOrShow(context.extensionUri, suite, testSuiteService);
      }
    })
  );

  // Run Test Suite (from tree view context menu)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.runTestSuite, async (item: TestSuiteTreeItem) => {
      if (item?.suite && testSuiteService) {
        TestSuitePanel.createOrShow(context.extensionUri, item.suite, testSuiteService);
        // Auto-start run could be triggered here if needed
      }
    })
  );

  // Delete Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.deleteTestSuite, async (item: TestSuiteTreeItem) => {
      if (!item?.suite || !testSuiteService) return;
      
      const confirm = await vscode.window.showWarningMessage(
        `Delete test suite "${item.suite.name}"?`,
        { modal: true },
        'Delete'
      );
      
      if (confirm === 'Delete') {
        await testSuiteService.deleteSuite(item.suite.id);
        testSuitesTreeProvider.refresh();
        vscode.window.showInformationMessage('Test Suite deleted');
      }
    })
  );

  // Rename Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.renameTestSuite, async (item: TestSuiteTreeItem) => {
      if (!item?.suite || !testSuiteService) return;

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter new name for test suite',
        value: item.suite.name,
        placeHolder: 'Test Suite Name'
      });

      if (newName && newName !== item.suite.name) {
        const updatedSuite = { ...item.suite, name: newName };
        await testSuiteService.updateSuite(updatedSuite);
        testSuitesTreeProvider.refresh();
      }
    })
  );

  // Duplicate Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.duplicateTestSuite, async (item: TestSuiteTreeItem) => {
      if (!item?.suite || !testSuiteService) return;

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter name for the duplicated test suite',
        value: `${item.suite.name} (Copy)`
      });

      if (newName) {
        const newSuite = await testSuiteService.createSuite(newName, [...item.suite.requests]);
        // Copy configuration
        newSuite.config = { ...item.suite.config };
        newSuite.description = item.suite.description;
        await testSuiteService.updateSuite(newSuite);
        testSuitesTreeProvider.refresh();
        vscode.window.showInformationMessage(`Test Suite "${newName}" created`);
      }
    })
  );

  // ========================================
  // Console Commands
  // ========================================

  // Show Console
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.showConsole, () => {
      getServiceContainer().console.show();
    })
  );

  // Clear Console
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.clearConsole, () => {
      getServiceContainer().console.clear();
    })
  );

  // ========================================
  // OpenAPI Commands
  // ========================================

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
        const container = getServiceContainer();
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

      try {
        const container = getServiceContainer();
        const importer = container.resolve<OpenApiImporter>(ServiceIdentifiers.OpenApiImporter);
        const result = await importer.import(filePath, {
          collectionName,
          environmentName: createEnvs.value ? collectionName : undefined
        });

        collectionsTreeProvider.refresh();
        if (result.environmentCreated) {
          environmentsTreeProvider.refresh();
        }

        vscode.window.showInformationMessage(
          `Imported "${result.collection.name}" (${countRequests(result.collection)} requests)` +
          (result.environmentCreated ? ` with environment "${result.environmentCreated}"` : '')
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
        const container = getServiceContainer();
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
        const container = getServiceContainer();
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

  // Update Run Collection to use Test Suite panel
  // (Keep original behavior but route through Test Suite for future unification)
}

/**
 * Move an item up or down within its parent container
 */
async function moveItemInDirection(
  collectionService: CollectionService,
  collectionId: string,
  itemId: string,
  direction: 'up' | 'down'
): Promise<boolean> {
  const collection = collectionService.getCollection(collectionId);
  if (!collection) return false;

  // Find the parent container and the item's current position
  const { parent, items } = findParentContaining(collection, itemId);
  if (!items) return false;

  const orderedIds = items.map((item: any) => item.id);
  const currentIndex = orderedIds.indexOf(itemId);
  
  if (currentIndex === -1) return false;

  // Calculate new index
  let newIndex: number;
  if (direction === 'up') {
    if (currentIndex === 0) return false; // Already at top
    newIndex = currentIndex - 1;
  } else {
    if (currentIndex === orderedIds.length - 1) return false; // Already at bottom
    newIndex = currentIndex + 1;
  }

  // Swap positions
  orderedIds.splice(currentIndex, 1);
  orderedIds.splice(newIndex, 0, itemId);

  // Save new order
  return await collectionService.reorderItems(
    collectionId,
    parent?.id,
    orderedIds
  );
}

/**
 * Find the parent container (folder or collection root) that contains an item
 */
function findParentContaining(collection: any, itemId: string): { parent: any | undefined; items: any[] | undefined } {
  // Check root level
  if (collection.items.some((item: any) => item.id === itemId)) {
    return { parent: undefined, items: collection.items };
  }
  
  // Search in folders
  return findParentInItems(collection.items, itemId);
}

function findParentInItems(items: any[], itemId: string): { parent: any | undefined; items: any[] | undefined } {
  for (const item of items) {
    if (item.type === 'folder' && item.items) {
      if (item.items.some((child: any) => child.id === itemId)) {
        return { parent: item, items: item.items };
      }
      const result = findParentInItems(item.items, itemId);
      if (result.items) {
        return result;
      }
    }
  }
  return { parent: undefined, items: undefined };
}

/**
 * Count total requests in a collection (recursively)
 */
function countRequests(collection: Collection): number {
  let count = 0;
  function walk(items: CollectionItem[]) {
    for (const item of items) {
      if (item.type === 'request') {
        count++;
      } else if (item.type === 'folder' && item.items) {
        walk(item.items);
      }
    }
  }
  walk(collection.items || []);
  return count;
}

/**
 * Collect all requests from a collection (recursively)
 */
function collectAllRequests(collection: Collection): any[] {
  const requests: any[] = [];
  function walk(items: CollectionItem[]) {
    for (const item of items) {
      if (item.type === 'request') {
        requests.push(item);
      } else if (item.type === 'folder' && item.items) {
        walk(item.items);
      }
    }
  }
  walk(collection.items || []);
  return requests;
}

/**
 * Find a request by ID in a collection (recursively)
 */
function findRequestInCollection(collection: Collection | undefined, requestId: string): any | undefined {
  if (!collection) return undefined;
  function walk(items: CollectionItem[]): any | undefined {
    for (const item of items) {
      if (item.type === 'request' && item.id === requestId) {
        return item;
      } else if (item.type === 'folder' && item.items) {
        const found = walk(item.items);
        if (found) return found;
      }
    }
    return undefined;
  }
  return walk(collection.items || []);
}

/**
 * Create empty API for when no workspace is open
 */
function createEmptyApi(): HttpForgeApi {
  return {
    version: '1.0.0',
    getEnvironmentNames: () => [],
    getSelectedEnvironment: () => '',
    setSelectedEnvironment: async () => {},
    getResolvedEnvironment: () => null,
    resolveVariables: (text) => text,
    getAllCollections: () => [],
    getCollection: () => undefined,
    createCollection: async () => ({ id: '', name: '', items: [] }),
    saveCollection: async () => {},
    deleteCollection: async () => false,
    findRequest: () => undefined,
    executeRequest: async () => ({ status: 0, statusText: '', headers: {}, body: null, time: 0, cookies: [] }),
    buildUrl: () => '',
    getRequestHistory: () => [],
    getAllCookies: () => [],
    getCookieHeader: () => '',
    clearCookies: async () => {},
    openRequest: () => {},
    openRequestContext: () => {},
    openEnvironmentEditor: () => {},
    openCollectionEditor: () => {},
    refreshCollections: () => {},
    refreshEnvironments: () => {}
  };
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log(`[${EXTENSION_ID}] HTTP Forge extension deactivated`);
}
