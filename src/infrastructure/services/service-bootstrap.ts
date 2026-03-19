/**
 * Service Bootstrap
 * 
 * Single Responsibility: Only handles service initialization and registration.
 * 
 * This is the VS Code composition root. It:
 * 1. Creates VS Code-specific platform adapters
 * 2. Delegates all service wiring to core's registerCoreServices()
 * 3. Registers the one extension-only value (ExtensionContext)
 */

import {
  type IAsyncCookieService,
  type ICollectionService,
  type IConfigService,
  type IDisposable,
  type IEnvironmentConfigService,
  type IExternalBrowserService,
  type IFileWatcher,
  type IFileWatcherFactory,
  type IHttpRequestService,
  type IKeyValueStore,
  type INotificationService,
  type IRequestHistoryService,
  type ISecretStore,
  type PlatformAdapters,
  registerCoreServices
} from '@http-forge/core';
import * as vscode from 'vscode';
import { ConsoleService } from './console-service';
import { ServiceContainer, ServiceIdentifiers } from './service-container';

// ========== GENERATION #11: Application Layer Imports ==========
import { EventBus } from '../event-bus/event-bus';

// ========== GENERATION #12: Orchestrator Imports ==========
import { CollectionOrchestrator } from '../../orchestration/services/collection.orchestrator';
import { EnvironmentOrchestrator } from '../../orchestration/services/environment.orchestrator';
import { FolderOrchestrator } from '../../orchestration/services/folder.orchestrator';
import { GraphQLOrchestrator } from '../../orchestration/services/graphql.orchestrator';
import { OAuth2Orchestrator } from '../../orchestration/services/oauth2.orchestrator';
import { RequestOrchestrator } from '../../orchestration/services/request.orchestrator';
import { SchemaOrchestrator } from '../../orchestration/services/schema.orchestrator';
import { TestSuiteOrchestrator } from '../../orchestration/services/test-suite.orchestrator';

// ========== GENERATION #13: Application Commands Imports ==========
import {
  BrowseSuiteDataCommand,
  ExecuteRequestCommand,
  ExportSuiteResultsCommand,
  ManageConfigCommand,
  ManageCookiesCommand,
  ManageEnvironmentsCommand,
  ManageGraphQLCommand,
  ManageHistoryCommand,
  ManageOAuth2Command,
  ManageSchemaCommand,
  ManageVariablesCommand,
  RunTestSuiteCommand,
  SaveCollectionCommand,
  SaveFolderCommand,
  SaveRequestCommand,
  SaveTestSuiteCommand,
  SelectEnvironmentCommand,
  UpdateCollectionCommand,
} from '../../application/commands';

// ========== GENERATION #13: Presentation Layer Imports ==========
import { CollectionsTreeProviderV2 } from '../../presentation/components/tree-providers/collections-tree-provider-v2';
import { EnvironmentsTreeProviderV2 } from '../../presentation/components/tree-providers/environments-tree-provider-v2';
import { CollectionsModelLoader } from '../../presentation/components/tree-providers/loaders/collections-model-loader';
import { EnvironmentsModelLoader } from '../../presentation/components/tree-providers/loaders/environments-model-loader';
import { TestSuitesModelLoader } from '../../presentation/components/tree-providers/loaders/test-suites-model-loader';
import { TestSuitesTreeProviderV2 } from '../../presentation/components/tree-providers/test-suites-tree-provider-v2';

// ========================================
// VS Code Platform Adapters
// ========================================

/**
 * Adapts vscode.FileSystemWatcher → IFileWatcher
 */
class VscodeFileWatcher implements IFileWatcher {
  private readonly disposables: vscode.Disposable[] = [];
  constructor(private readonly watcher: vscode.FileSystemWatcher) { }

  onDidChange(callback: (uri: string) => void): IDisposable {
    const d = this.watcher.onDidChange(e => callback(e.fsPath));
    this.disposables.push(d);
    return { dispose: () => d.dispose() };
  }
  onDidCreate(callback: (uri: string) => void): IDisposable {
    const d = this.watcher.onDidCreate(e => callback(e.fsPath));
    this.disposables.push(d);
    return { dispose: () => d.dispose() };
  }
  onDidDelete(callback: (uri: string) => void): IDisposable {
    const d = this.watcher.onDidDelete(e => callback(e.fsPath));
    this.disposables.push(d);
    return { dispose: () => d.dispose() };
  }
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.watcher.dispose();
  }
}

/**
 * Adapts vscode.workspace.createFileSystemWatcher → IFileWatcherFactory
 */
class VscodeFileWatcherFactory implements IFileWatcherFactory {
  createFileWatcher(base: string, glob: string): IFileWatcher {
    const pattern = new vscode.RelativePattern(base, glob);
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    return new VscodeFileWatcher(watcher);
  }
}

/**
 * Adapts vscode.Memento (globalState/workspaceState) → IKeyValueStore
 */
class VscodeKeyValueStore implements IKeyValueStore {
  constructor(private readonly memento: vscode.Memento) { }
  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.memento.get<T>(key, defaultValue!);
  }
  async update(key: string, value: any): Promise<void> {
    await this.memento.update(key, value);
  }
}

/**
 * Adapts vscode.window.show*Message → INotificationService
 */
class VscodeNotificationService implements INotificationService {
  async showInformation(message: string): Promise<string | undefined> {
    return vscode.window.showInformationMessage(message);
  }
  async showWarning(message: string): Promise<string | undefined> {
    return vscode.window.showWarningMessage(message);
  }
  async showError(message: string): Promise<string | undefined> {
    return vscode.window.showErrorMessage(message);
  }
}

/**
 * Bootstrap options
 */
export interface BootstrapOptions {
  /** VS Code extension context */
  context: vscode.ExtensionContext;
  /** Workspace folder path */
  workspaceFolder: string;
}

/**
 * Bootstrap result containing initialized services
 */
export interface BootstrapResult {
  container: ServiceContainer;
  configService: IConfigService;
  envConfigService: IEnvironmentConfigService;
  collectionService: ICollectionService;
  httpService: IHttpRequestService;
  cookieService: IAsyncCookieService;
  historyService: IRequestHistoryService;
}

/**
 * Initialize and register all services in the container
 */
export function bootstrapServices(options: BootstrapOptions): BootstrapResult {
  const { context, workspaceFolder } = options;
  const container = ServiceContainer.instance;

  // Clear any existing registrations (for reinitialization)
  container.clear();

  // ========================================
  // 1. Create VS Code platform adapters
  // ========================================

  const secretStore: ISecretStore = {
    get: (key) => Promise.resolve(context.secrets.get(key)),
    store: (key, value) => Promise.resolve(context.secrets.store(key, value)),
    delete: (key) => Promise.resolve(context.secrets.delete(key)),
  };

  const browserService: IExternalBrowserService = {
    uriScheme: vscode.env.uriScheme,
    openExternal: (url) => Promise.resolve(vscode.env.openExternal(vscode.Uri.parse(url))),
    asExternalUri: async (uri) => {
      const result = await vscode.env.asExternalUri(vscode.Uri.parse(uri));
      return result.toString();
    },
  };

  const ext = vscode.extensions.getExtension('henry-huang.http-forge');

  const adapters: PlatformAdapters = {
    workspaceFolder,
    fileWatcherFactory: new VscodeFileWatcherFactory(),
    notificationService: new VscodeNotificationService(),
    workspaceStore: new VscodeKeyValueStore(context.workspaceState),
    globalStore: new VscodeKeyValueStore(context.globalState),
    secretStore,
    browserService,
    applicationInfo: { name: 'HttpForge', version: ext?.packageJSON?.version || '0.0.0' },
    consoleService: new ConsoleService('HTTP Forge'),
  };

  // ========================================
  // 2. Register all core services (one call)
  // ========================================

  registerCoreServices(container, adapters);

  // ========================================
  // 3. Register extension-only value
  // ========================================

  container.registerValue(ServiceIdentifiers.ExtensionContext, context);

  // ========================================
  // 4. GENERATION #11: Register application layer services
  // ========================================

  bootstrapApplicationLayer(container);

  // ========================================
  // 5. Eagerly resolve key services
  // ========================================

  const configService = container.config;
  const envConfigService = container.environmentConfig;
  const collectionService = container.collection;
  const httpService = container.httpRequest;
  const cookieService = container.cookie;
  const historyService = container.requestHistory;

  return {
    container,
    configService,
    envConfigService,
    collectionService,
    httpService,
    cookieService,
    historyService
  };
}

/**
 * GENERATION #11 & #12: Bootstrap application layer services
 * 
 * Registers event bus, orchestrators, and application commands.
 * Called during extension startup after core services are initialized.
 */
export function bootstrapApplicationLayer(container: ServiceContainer): void {
  const logger = container.console;
  const eventBus = new EventBus();

  // ========================================
  // Event Bus - Core Infrastructure
  // ========================================
  container.registerInstance(ServiceIdentifiers.EventBus, eventBus);

  // ========================================
  // GENERATION #12: Orchestrators
  // ========================================
  
  // Request Orchestrator
  container.registerSingleton<any>(
    ServiceIdentifiers.RequestOrchestrator,
    (c: any) => new RequestOrchestrator(
      c.httpRequest,
      c.requestHistory,
      c.cookie,
      c.collection,
      logger
    )
  );

  // Environment Orchestrator
  container.registerSingleton<any>(
    ServiceIdentifiers.EnvironmentOrchestrator,
    (c: any) => new EnvironmentOrchestrator(c.environmentConfig, logger)
  );

  // Collection Orchestrator
  container.registerSingleton<any>(
    ServiceIdentifiers.CollectionOrchestrator,
    (c: any) => new CollectionOrchestrator(c.collection, logger)
  );

  // Test Suite Orchestrator
  container.registerSingleton<any>(
    ServiceIdentifiers.TestSuiteOrchestrator,
    (c: any) => new TestSuiteOrchestrator(logger)
  );

  // Folder Orchestrator
  container.registerSingleton<any>(
    ServiceIdentifiers.FolderOrchestrator,
    (c: any) => new FolderOrchestrator(logger)
  );

  // Schema Orchestrator
  container.registerSingleton<any>(
    ServiceIdentifiers.SchemaOrchestrator,
    (c: any) => new SchemaOrchestrator(logger)
  );

  // OAuth2 Orchestrator
  container.registerSingleton<any>(
    ServiceIdentifiers.OAuth2Orchestrator,
    (c: any) => new OAuth2Orchestrator(logger)
  );

  // GraphQL Orchestrator
  container.registerSingleton<any>(
    ServiceIdentifiers.GraphQLOrchestrator,
    (c: any) => new GraphQLOrchestrator(logger)
  );

  // ========================================
  // GENERATION #13: Application Commands
  // ========================================
  
  // Request Commands
  container.registerSingleton<any>(
    ServiceIdentifiers.ExecuteRequestCommand,
    (c: any) => new ExecuteRequestCommand(
      c.resolve(ServiceIdentifiers.RequestOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.SaveRequestCommand,
    (c: any) => new SaveRequestCommand(
      c.resolve(ServiceIdentifiers.RequestOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.ManageCookiesCommand,
    (c: any) => new ManageCookiesCommand(
      c.resolve(ServiceIdentifiers.RequestOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.ManageHistoryCommand,
    (c: any) => new ManageHistoryCommand(
      c.resolve(ServiceIdentifiers.RequestOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.ManageVariablesCommand,
    (c: any) => new ManageVariablesCommand(
      c.resolve(ServiceIdentifiers.RequestOrchestrator),
      eventBus,
      logger
    )
  );

  // Environment Commands
  container.registerSingleton<any>(
    ServiceIdentifiers.SelectEnvironmentCommand,
    (c: any) => new SelectEnvironmentCommand(
      c.resolve(ServiceIdentifiers.EnvironmentOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.ManageEnvironmentsCommand,
    (c: any) => new ManageEnvironmentsCommand(
      c.resolve(ServiceIdentifiers.EnvironmentOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.ManageConfigCommand,
    (c: any) => new ManageConfigCommand(
      c.resolve(ServiceIdentifiers.EnvironmentOrchestrator),
      eventBus,
      logger
    )
  );

  // Collection Commands
  container.registerSingleton<any>(
    ServiceIdentifiers.SaveCollectionCommand,
    (c: any) => new SaveCollectionCommand(
      c.resolve(ServiceIdentifiers.CollectionOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.UpdateCollectionCommand,
    (c: any) => new UpdateCollectionCommand(
      c.resolve(ServiceIdentifiers.CollectionOrchestrator),
      eventBus,
      logger
    )
  );

  // Test Suite Commands
  container.registerSingleton<any>(
    ServiceIdentifiers.RunTestSuiteCommand,
    (c: any) => new RunTestSuiteCommand(
      c.resolve(ServiceIdentifiers.TestSuiteOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.SaveTestSuiteCommand,
    (c: any) => new SaveTestSuiteCommand(
      c.resolve(ServiceIdentifiers.TestSuiteOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.BrowseSuiteDataCommand,
    (c: any) => new BrowseSuiteDataCommand(
      c.resolve(ServiceIdentifiers.TestSuiteOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.ExportSuiteResultsCommand,
    (c: any) => new ExportSuiteResultsCommand(
      c.resolve(ServiceIdentifiers.TestSuiteOrchestrator),
      eventBus,
      logger
    )
  );

  // Single-domain Commands
  container.registerSingleton<any>(
    ServiceIdentifiers.SaveFolderCommand,
    (c: any) => new SaveFolderCommand(
      c.resolve(ServiceIdentifiers.FolderOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.ManageSchemaCommand,
    (c: any) => new ManageSchemaCommand(
      c.resolve(ServiceIdentifiers.SchemaOrchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.ManageOAuth2Command,
    (c: any) => new ManageOAuth2Command(
      c.resolve(ServiceIdentifiers.OAuth2Orchestrator),
      eventBus,
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.ManageGraphQLCommand,
    (c: any) => new ManageGraphQLCommand(
      c.resolve(ServiceIdentifiers.GraphQLOrchestrator),
      eventBus,
      logger
    )
  );

  // ========================================
  // GENERATION #13: Model Loaders
  // ========================================

  container.registerSingleton<any>(
    ServiceIdentifiers.CollectionsModelLoader,
    (c: any) => new CollectionsModelLoader(c.collection, logger)
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.EnvironmentsModelLoader,
    (c: any) => new EnvironmentsModelLoader(c.environmentConfig, logger)
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.TestSuitesModelLoader,
    (c: any) => new TestSuitesModelLoader({ getAllSuites: async () => [], getSuiteChildren: async () => [] }, logger)
  );

  // ========================================
  // GENERATION #13: Tree Providers
  // ========================================

  container.registerSingleton<any>(
    ServiceIdentifiers.CollectionsTreeProviderV2,
    (c: any) => new CollectionsTreeProviderV2(
      c.resolve(ServiceIdentifiers.CollectionsModelLoader),
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.EnvironmentsTreeProviderV2,
    (c: any) => new EnvironmentsTreeProviderV2(
      c.resolve(ServiceIdentifiers.EnvironmentsModelLoader),
      logger
    )
  );

  container.registerSingleton<any>(
    ServiceIdentifiers.TestSuitesTreeProviderV2,
    (c: any) => new TestSuitesTreeProviderV2(
      c.resolve(ServiceIdentifiers.TestSuitesModelLoader),
      logger
    )
  );
}


/**
 * Create a mock service container for testing
 */
export function createTestContainer(overrides: {
  envConfigService?: Partial<IEnvironmentConfigService>;
  collectionService?: Partial<ICollectionService>;
  httpService?: Partial<IHttpRequestService>;
  cookieService?: Partial<IAsyncCookieService>;
  historyService?: Partial<IRequestHistoryService>;
} = {}): ServiceContainer {
  ServiceContainer.reset();
  const container = ServiceContainer.instance;

  if (overrides.envConfigService) {
    container.registerInstance(
      ServiceIdentifiers.EnvironmentConfig,
      overrides.envConfigService as IEnvironmentConfigService
    );
  }
  if (overrides.collectionService) {
    container.registerInstance(
      ServiceIdentifiers.Collection,
      overrides.collectionService as ICollectionService
    );
  }
  if (overrides.httpService) {
    container.registerInstance(
      ServiceIdentifiers.HttpRequest,
      overrides.httpService as IHttpRequestService
    );
  }
  if (overrides.cookieService) {
    container.registerInstance(
      ServiceIdentifiers.Cookie,
      overrides.cookieService as IAsyncCookieService
    );
  }
  if (overrides.historyService) {
    container.registerInstance(
      ServiceIdentifiers.RequestHistory,
      overrides.historyService as IRequestHistoryService
    );
  }

  return container;
}
