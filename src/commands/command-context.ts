/**
 * CommandContext — the dependency contract for all command registrars.
 *
 * Single Responsibility: describes *what* a command needs to do its job,
 * without binding to concrete singletons or global mutable state. This lets
 * every command module depend on abstractions (Dependency Inversion) and
 * keeps registration side-effect free (commands are only wired in the
 * composition root).
 */

import type { CollectionService, ConfigService, EnvironmentConfigService, TestSuiteService } from '@http-forge/core';
import * as vscode from 'vscode';
import type { ServiceContainer } from '../infrastructure/services/service-container';
import type { CollectionsTreeProvider, CollectionTreeItem } from '../presentation/components/tree-providers/collections-tree-provider';
import type { DiscoveredApisTreeProvider } from '../presentation/components/tree-providers/discovered-apis-tree-provider';
import type { EnvironmentsTreeProvider } from '../presentation/components/tree-providers/environments-tree-provider';
import type { RequestGitHistoryProvider } from '../presentation/components/tree-providers/request-git-history-provider';
import type { TestSuitesTreeProvider } from '../presentation/components/tree-providers/test-suites-tree-provider';

/**
 * Everything a command registrar may need. Built once in the composition root
 * (extension.ts) and passed to every registrar — no hidden globals.
 */
export interface CommandContext {
  /** VS Code extension context (for URI, subscriptions, state). */
  context: vscode.ExtensionContext;
  /** Absolute path of the active workspace folder. */
  workspaceFolder: string;

  // Domain services
  collectionService: CollectionService;
  envConfigService: EnvironmentConfigService;
  configService: ConfigService;
  testSuiteService: TestSuiteService;
  container: ServiceContainer;

  // Tree providers
  collectionsTreeProvider: CollectionsTreeProvider;
  environmentsTreeProvider: EnvironmentsTreeProvider;
  testSuitesTreeProvider: TestSuitesTreeProvider;
  discoveredApisTreeProvider: DiscoveredApisTreeProvider;
  requestGitHistoryProvider: RequestGitHistoryProvider;

  // Tree views (for selection/reveal)
  collectionsView: vscode.TreeView<CollectionTreeItem>;
}
