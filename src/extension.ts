/**
 * HTTP Forge — VS Code extension composition root.
 *
 * Single Responsibility: wire the whole extension together and nothing else.
 * All feature logic lives in focused modules (commands/, infrastructure/,
 * presentation/); this file only constructs dependencies (composition root),
 * registers views, and hands a CommandContext to the command facade.
 */

import type { CollectionService, ConfigService, CookieService, EnvironmentConfigService, HttpRequestService, RequestHistoryService } from '@http-forge/core';
import { TestSuiteService } from '@http-forge/core';
import * as vscode from 'vscode';
import { HttpForgeApi, HttpForgeApiImpl } from './api';
import { createEmptyApi } from './api/empty-api';
import { registerAllCommands } from './commands';
import type { CommandContext } from './commands/command-context';
import { runImportRequestCommand } from './commands/importRequest';
import { McpServerController } from './infrastructure/mcp/mcp-server-controller';
import { bootstrapServices } from './infrastructure/services/service-bootstrap';
import { CollectionsTreeProvider, CollectionTreeItem } from './presentation/components/tree-providers/collections-tree-provider';
import { DiscoveredApisTreeProvider } from './presentation/components/tree-providers/discovered-apis-tree-provider';
import { EnvironmentsTreeProvider } from './presentation/components/tree-providers/environments-tree-provider';
import { RequestGitHistoryProvider } from './presentation/components/tree-providers/request-git-history-provider';
import { TestSuitesTreeProvider } from './presentation/components/tree-providers/test-suites-tree-provider';
import { RequestTesterPanelManager } from './presentation/webview/panels/request-tester/request-tester-panel-manager';
import { EXTENSION_ID } from './shared/constants';

/**
 * Extension activation
 *
 * Composition root: bootstraps services via dependency injection and wires
 * them into tree providers, views, commands and the MCP controller.
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
  const services = bootstrapServices({
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
  const testSuiteService = new TestSuiteService(collectionService, configService, { watch: true, onSuitesChanged: () => testSuitesTreeProvider?.refresh() });

  // Initialize tree providers
  const collectionsTreeProvider = new CollectionsTreeProvider(collectionService as CollectionService);
  const environmentsTreeProvider = new EnvironmentsTreeProvider(envConfigService as EnvironmentConfigService);
  const testSuitesTreeProvider = new TestSuitesTreeProvider(testSuiteService);
  const discoveredApisTreeProvider = new DiscoveredApisTreeProvider(workspaceFolder);

  // Auto-refresh tree and open panels when collection files change on disk
  (collectionService as CollectionService).onCollectionsChanged = () => {
    collectionsTreeProvider?.refresh();
    const manager = RequestTesterPanelManager.getInstance();
    manager.notifyCollectionsChanged();
  };

  // Auto-refresh tree and open panels when environment files change on disk
  (envConfigService as EnvironmentConfigService).onEnvironmentsChanged = () => {
    environmentsTreeProvider?.refresh();
    const manager = RequestTesterPanelManager.getInstance();
    manager.notifyEnvironmentsChanged();
  };

  // Register tree views
  const collectionsView = vscode.window.createTreeView('httpForge.collections', {
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

  // Discovered APIs view (Phase 1 UI)
  const discoveredApisView = vscode.window.createTreeView('httpForge.discoveredApis', {
    treeDataProvider: discoveredApisTreeProvider
  });

  // Git history view
  const requestGitHistoryProvider = new RequestGitHistoryProvider();
  const requestHistoryView = vscode.window.createTreeView('httpForge.requestHistory', {
    treeDataProvider: requestGitHistoryProvider,
  });

  // Register all commands
  context.subscriptions.push(
    vscode.commands.registerCommand('http-forge.importRequest', async () => {
      await runImportRequestCommand(context);
    })
  );
  registerAllCommands({
    context,
    workspaceFolder,
    collectionService: collectionService as CollectionService,
    envConfigService: envConfigService as EnvironmentConfigService,
    configService: configService as ConfigService,
    testSuiteService,
    container: services.container,
    collectionsTreeProvider,
    environmentsTreeProvider,
    testSuitesTreeProvider,
    discoveredApisTreeProvider,
    requestGitHistoryProvider,
    collectionsView
  } satisfies CommandContext);

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
            oauth2TokenManager?.handleImplicitCallback(accessToken, tokenType, expiresIn, state);
          } else {
            // Authorization code flow callback (or error)
            oauth2TokenManager?.handleAuthorizationCallback(code, state, error);
          }
        }
      }
    })
  );

  // Add disposables
  context.subscriptions.push(
    collectionsView,
    testSuitesView,
    environmentsView,
    requestHistoryView
  );

  // MCP server lifecycle (lazy start via commands/status bar)
  new McpServerController({
    context,
    workspaceFolder,
    collectionService: collectionService as CollectionService,
    envConfigService: envConfigService as EnvironmentConfigService,
    configService: configService as ConfigService,
    testSuiteService
  }).setup();

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
 * Extension deactivation
 */
export function deactivate(): void {
  console.log(`[${EXTENSION_ID}] HTTP Forge extension deactivated`);
}
