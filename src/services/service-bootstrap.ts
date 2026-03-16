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
  // 4. Eagerly resolve key services
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
