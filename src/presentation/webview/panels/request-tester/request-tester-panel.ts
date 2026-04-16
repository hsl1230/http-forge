import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../../../infrastructure/services/service-container';
import { RequestContext } from '../../../../shared/utils';
import { WebviewMessageRouter, WebviewMessenger } from '../../shared-interfaces';
import {
  CookieHandler,
  EnvironmentSelectionHandler,
  GraphQLHandler,
  HistoryHandler,
  OAuth2Handler,
  RequestExecutionHandler,
  SaveRequestHandler,
  SchemaHandler,
  VariableHandler
} from './handlers';
import { PanelDataProvider } from './panel-data-provider';

/**
 * Request Tester Panel - Refactored following SOLID principles
 *
 * Single Responsibility: Panel lifecycle management only
 * Open/Closed: New message handlers can be added via router without modification
 * Liskov Substitution: All handlers implement IMessageHandler interface
 * Interface Segregation: Small focused interfaces (IWebviewMessenger, IMessageHandler, IPanelContextProvider)
 * Dependency Inversion: Depends on abstractions, not concrete implementations
 */
export class RequestTesterPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private messageDisposable?: vscode.Disposable;
  private docSaveDisposable?: vscode.Disposable;
  private webviewReady: boolean = false;
  private readonly panelId: string;
  
  // Track dirty state locally (updated by webview notifications)
  private isDirty: boolean = false;

  // Event emitter for disposal
  private readonly _onDidDispose = new vscode.EventEmitter<void>();
  public readonly onDidDispose: vscode.Event<void> = this._onDidDispose.event;

  // Composition over inheritance - delegate responsibilities
  private readonly messenger: WebviewMessenger;
  private readonly router: WebviewMessageRouter;
  private readonly dataProvider: PanelDataProvider;

  // Handlers (Single Responsibility)
  private readonly environmentHandler: EnvironmentSelectionHandler;
  private readonly cookieHandler: CookieHandler;
  private readonly variableHandler: VariableHandler;

  private constructor(
    private extensionUri: vscode.Uri,
    panelId: string
  ) {
    this.panelId = panelId;
    // Get all services from the container (Dependency Inversion)
    const container = getServiceContainer();
    const envConfigService = container.environmentConfig;
    const historyService = container.requestHistory;
    const httpService = container.httpRequest;
    const cookieService = container.cookie;
    const collectionService = container.collection;

    this.messenger = new WebviewMessenger(undefined);
    this.router = new WebviewMessageRouter();

    // Create handlers with proper dependencies
    this.cookieHandler = new CookieHandler(cookieService);
    this.variableHandler = new VariableHandler(envConfigService, this as any, collectionService);

    // Create environment handler (needed by other handlers)
    this.environmentHandler = new EnvironmentSelectionHandler(
      envConfigService,
      historyService,
      this as any // Will be replaced with dataProvider
    );

    // Create data provider
    this.dataProvider = new PanelDataProvider(
      envConfigService,
      this.environmentHandler,
      this.cookieHandler,
      this.variableHandler,
      collectionService
    );

    // Update handlers with correct context provider
    (this.environmentHandler as any).contextProvider = this.dataProvider;
    (this.variableHandler as any).contextProvider = this.dataProvider;

    // Create remaining handlers
    const requestHandler = new RequestExecutionHandler(
      envConfigService,
      httpService,
      historyService,
      cookieService,
      this.dataProvider,
      this.environmentHandler
    );

    const historyHandler = new HistoryHandler(
      historyService,
      envConfigService,
      this.dataProvider,
      this.environmentHandler
    );

    const saveRequestHandler = new SaveRequestHandler(this.dataProvider, collectionService);

    // Schema handler for body/response schema operations
    const schemaInferenceService = container.resolve<any>(Symbol.for('SchemaInferenceService'));
    const schemaHandler = new SchemaHandler(this.dataProvider, collectionService, schemaInferenceService);

    // OAuth2 handler for token management
    const oauth2Handler = new OAuth2Handler(
      container.oauth2TokenManager,
      envConfigService,
      this.dataProvider
    );

    // GraphQL handler for schema introspection and completions
    const graphqlHandler = new GraphQLHandler(
      container.httpClient
    );

    // Register all handlers (Open/Closed - new handlers can be added here)
    this.router.registerHandlers([
      this.environmentHandler,
      requestHandler,
      historyHandler,
      this.cookieHandler,
      this.variableHandler,
      saveRequestHandler,
      schemaHandler,
      oauth2Handler,
      graphqlHandler
    ]);
  }

  /**
   * Create a new Request Tester panel with the given context
   * Used by RequestTesterPanelManager for multi-panel support
   */
  public static create(
    extensionUri: vscode.Uri,
    context: RequestContext,
    panelId: string,
    panelTitle: string
  ): RequestTesterPanel {
    const panel = new RequestTesterPanel(extensionUri, panelId);
    panel.createAndShow(context, panelTitle);
    return panel;
  }

  /**
   * @deprecated Use RequestTesterPanelManager.getInstance().show() instead
   * Kept for backward compatibility
   */
  public static show(
    extensionUri: vscode.Uri,
    context: RequestContext
  ): RequestTesterPanel {
    // Import dynamically to avoid circular dependency
    const { RequestTesterPanelManager } = require('./request-tester-panel-manager');
    const manager = RequestTesterPanelManager.getInstance();
    manager.setExtensionUri(extensionUri);
    return manager.show(context);
  }

  /**
   * Reveal this panel
   */
  public reveal(): void {
    this.panel?.reveal(vscode.ViewColumn.One);
  }

  /**
   * Check if this panel is currently active
   */
  public isActive(): boolean {
    return this.panel?.active === true;
  }

  /**
   * Check if the panel has unsaved changes
   */
  public hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  /**
   * Update this panel with new request content
   */
  public async updateContent(context: RequestContext, panelTitle: string): Promise<void> {
    if (!this.panel) {
      return;
    }

    // Reset dirty state when loading new content
    this.isDirty = false;

    // Update panel title
    this.panel.title = panelTitle;

    // Update context
    this.dataProvider.setContext(context);

    // Send new data to webview
    if (this.webviewReady) {
      await this.sendInitialData();
    }

    // Reveal the panel
    this.reveal();
  }

  public dispose(): void {
    // Prevent double disposal
    if (!this.panel) {
      return;
    }

    this._onDidDispose.fire();
    this._onDidDispose.dispose();
    this.webviewReady = false;
    this.messageDisposable?.dispose();
    this.docSaveDisposable?.dispose();
    
    const panelToDispose = this.panel;
    this.panel = undefined;
    panelToDispose.dispose();
  }

  /**
   * Notify this panel of an environment change
   */
  public notifyEnvironmentChange(environment: string): void {
    if (this.webviewReady) {
      this.environmentHandler.handleEnvironmentChanged(
        environment,
        this.messenger
      );
    }
  }

  /**
   * Reload data from disk and push to webview.
   * Called when collection files change externally.
   */
  public reloadFromDisk(): void {
    if (this.webviewReady) {
      try {
        const data = this.dataProvider.getInitialData();
        this.messenger.postMessage({ command: 'loadRequest', ...data });
      } catch {
        // Context may no longer be valid (e.g. request deleted)
      }
    }
  }

  private async createAndShow(context: RequestContext, panelTitle: string): Promise<void> {
    this.dataProvider.setContext(context);

    if (!this.panel) {
      this.panel = this.createPanel(panelTitle);
      this.messenger.setPanel(this.panel);
    }

    // Register message handler BEFORE revealing to avoid missing webviewLoaded
    this.registerMessageHandler();
    this.registerDocFileWatcher();
    this.panel.reveal(vscode.ViewColumn.One);
  }

  private createPanel(panelTitle: string): vscode.WebviewPanel {
    const extensionPath = this.extensionUri.fsPath;
    const resourcePath = path.join(extensionPath, 'resources', 'features', 'request-tester');
    const sharedPath = path.join(extensionPath, 'resources', 'shared');

    const panel = vscode.window.createWebviewPanel(
      `request-tester-${this.panelId}`,
      panelTitle,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(resourcePath),
          vscode.Uri.file(sharedPath)
        ]
      }
    );

    panel.iconPath = vscode.Uri.file(
      path.join(extensionPath, 'resources', 'http-forge-icon.svg')
    );

    panel.webview.html = this.getHtmlContent(panel, resourcePath, sharedPath);

    panel.onDidDispose(() => {
      this.dispose();
    });

    return panel;
  }

  private registerMessageHandler(): void {
    this.messageDisposable?.dispose();

    this.messageDisposable = this.panel?.webview.onDidReceiveMessage(async (msg) => {
      const cmd = msg.command || msg.type;

      // Handle webviewLoaded specially (initialization)
      if (cmd === 'webviewLoaded') {
        this.webviewReady = true;
        await this.sendInitialData();
        return;
      }

      // Track dirty state from webview
      if (cmd === 'dirtyStateChanged') {
        this.isDirty = msg.isDirty || false;
        return;
      }

      // Open doc.md file in editor
      if (cmd === 'openDocFile') {
        await this.openDocFile();
        return;
      }

      // Route all other messages through the router
      await this.router.route(msg, this.messenger);
    });
  }

  private async sendInitialData(): Promise<void> {
    try {
      const data = this.dataProvider.getInitialData();
      this.messenger.postMessage({ command: 'init', data });
    } catch (error) {
      console.error('[RequestTesterPanel] Failed to send initial data:', error);
    }
  }

  /**
   * Watch for doc.md saves and push updated content to the webview
   */
  private registerDocFileWatcher(): void {
    this.docSaveDisposable?.dispose();

    this.docSaveDisposable = vscode.workspace.onDidSaveTextDocument((doc) => {
      if (!this.webviewReady || !doc.fileName.endsWith('doc.md')) {
        return;
      }

      const context = this.dataProvider.getCurrentContext();
      if (!context?.collectionId || !context?.requestId) {
        return;
      }

      // Verify this doc.md belongs to the current request
      const requestJsonPath = path.join(path.dirname(doc.fileName), 'request.json');
      try {
        if (!fs.existsSync(requestJsonPath)) return;
        const metadata = JSON.parse(fs.readFileSync(requestJsonPath, 'utf-8'));
        if (metadata.id !== context.requestId) return;
      } catch {
        return;
      }

      const newContent = doc.getText();
      this.messenger.postMessage({ command: 'docUpdated', doc: newContent });
    });
  }

  /**
   * Open the doc.md file for the current request in VS Code editor
   */
  private async openDocFile(): Promise<void> {
    const context = this.dataProvider.getCurrentContext();
    if (!context?.collectionId || !context?.requestId) {
      return;
    }

    const container = getServiceContainer();
    const collectionsDir = container.config.getCollectionsPath();
    const docPath = this.findDocFile(collectionsDir, context.requestId);

    if (docPath && fs.existsSync(docPath)) {
      const doc = await vscode.workspace.openTextDocument(docPath);
      await vscode.window.showTextDocument(doc);
    }
  }

  /**
   * Search for doc.md in the collections directory for the given request ID
   */
  private findDocFile(basePath: string, requestId: string): string | undefined {
    const searchDir = (dir: string): string | undefined => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return undefined;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const entryPath = path.join(dir, entry.name);
        const requestJsonPath = path.join(entryPath, 'request.json');

        if (fs.existsSync(requestJsonPath)) {
          try {
            const content = fs.readFileSync(requestJsonPath, 'utf-8');
            const metadata = JSON.parse(content);
            if (metadata.id === requestId) {
              const docPath = path.join(entryPath, 'doc.md');
              return fs.existsSync(docPath) ? docPath : undefined;
            }
          } catch {
            // Skip invalid request.json files
          }
        }

        // Recurse into subdirectories
        const found = searchDir(entryPath);
        if (found) return found;
      }

      return undefined;
    };

    return searchDir(basePath);
  }

  private getHtmlContent(
    panel: vscode.WebviewPanel,
    resourcePath: string,
    sharedPath: string
  ): string {
    const htmlPath = path.join(resourcePath, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');

    const styleUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(resourcePath, 'style.css'))
    );
    const sharedStyleUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(sharedPath, 'monaco-viewer.css'))
    );
    const sharedScriptUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(sharedPath, 'monaco-viewer.js'))
    );
    const bundleUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(resourcePath, 'bundle.js'))
    );

    html = html
      .replace(/\{\{styleUri\}\}/g, styleUri.toString())
      .replace(/\{\{bundleUri\}\}/g, bundleUri.toString())
      .replace(/\{\{sharedStyleUri\}\}/g, sharedStyleUri.toString())
      .replace(/\{\{sharedScriptUri\}\}/g, sharedScriptUri.toString());

    return html;
  }
}
