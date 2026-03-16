/**
 * Test Suite Panel
 * 
 * Provides UI for running Test Suites with statistics.
 * Supports multi-collection requests.
 */

import { ITestSuiteStore, TestSuite, TestSuiteService, TestSuiteStore } from '@http-forge/core';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../services/service-container';
import { WebviewMessageRouter, WebviewMessenger } from '../shared-interfaces';
import {
    BrowseDataHandler,
    ExportHandler,
    ReadyHandler,
    SaveHandler,
    SuiteRunHandler,
} from './handlers';

export class TestSuitePanel {
    public static currentPanel: TestSuitePanel | undefined;
    public static readonly viewType = 'httpForge.testSuite';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _messenger: WebviewMessenger;
    private readonly _suiteStore: ITestSuiteStore;
    private readonly _router: WebviewMessageRouter;
    private readonly _readyHandler: ReadyHandler;
    private readonly _envConfigService: any;
    private _disposables: vscode.Disposable[] = [];

    /**
     * Create or show the Test Suite panel
     */
    public static createOrShow(
        extensionUri: vscode.Uri, 
        suite: TestSuite,
        testSuiteService: TestSuiteService
    ): TestSuitePanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it and update suite
        if (TestSuitePanel.currentPanel) {
            TestSuitePanel.currentPanel._panel.reveal(column);
            TestSuitePanel.currentPanel.setSuite(suite);
            return TestSuitePanel.currentPanel;
        }

        // Create a new panel
        const panel = vscode.window.createWebviewPanel(
            TestSuitePanel.viewType,
            `Test Suite: ${suite.name}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'resources'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        TestSuitePanel.currentPanel = new TestSuitePanel(
            panel, 
            extensionUri, 
            suite,
            testSuiteService
        );
        return TestSuitePanel.currentPanel;
    }

    /**
     * Revive panel from serialized state
     */
    public static revive(
        panel: vscode.WebviewPanel, 
        extensionUri: vscode.Uri,
        testSuiteService: TestSuiteService
    ): void {
        // Note: Suite will need to be reloaded
        TestSuitePanel.currentPanel = new TestSuitePanel(
            panel, 
            extensionUri, 
            undefined,
            testSuiteService
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        pendingSuite: TestSuite | undefined,
        testSuiteService: TestSuiteService
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        
        // Create messenger for webview communication
        this._messenger = new WebviewMessenger(panel);
        
        // Get services from container
        const container = getServiceContainer();
        
        // Create TestSuiteStore (Single Source of Truth)
        this._suiteStore = new TestSuiteStore(container.collection);
        
        // Create and configure message router
        this._router = new WebviewMessageRouter();
        const envConfigService = container.environmentConfig;
        this._envConfigService = envConfigService;
        const dataFileParser = container.dataFileParser;
        const configService = container.config;
        
        // Create handlers
        this._readyHandler = new ReadyHandler(
            envConfigService, 
            this._suiteStore,
            testSuiteService
        );
        
        if (pendingSuite) {
            this._suiteStore.setSuite(pendingSuite);
            this._readyHandler.setPendingSuite(pendingSuite);
        }
        
        const suiteRunHandler = new SuiteRunHandler(
            envConfigService,
            container.httpRequest,
            container.scriptExecutor,
            container.requestPreparer,
            dataFileParser,
            this._suiteStore,
            configService
        );
        
        const saveHandler = new SaveHandler(
            testSuiteService,
            this._suiteStore
        );
        
        const browseDataHandler = new BrowseDataHandler();
        const exportHandler = new ExportHandler();
        
        // Register handlers with router
        this._router.registerHandlers([
            this._readyHandler,
            suiteRunHandler,
            saveHandler,
            browseDataHandler,
            exportHandler
        ]);

        // Set the webview's initial HTML content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview using router
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                await this._router.route(message, this._messenger);
            },
            null,
            this._disposables
        );
    }

    /**
     * Set the suite to display/run
     */
    public setSuite(suite: TestSuite): void {
        this._suiteStore.setSuite(suite);
        this._readyHandler.setPendingSuite(suite);
        this._panel.title = `Test Suite: ${suite.name}`;
        
        // Resolve requests with full data (same as ReadyHandler does)
        const requests = this._suiteStore.getResolvedRequests();
        
        // Send to webview for display with resolved requests
        this._messenger.postMessage({
            type: 'setSuite',
            suite,
            requests
        });
    }

    /**
     * Notify the panel of an environment change from external source (e.g., tree view)
     */
    public notifyEnvironmentChange(environment: string): void {
        if (!this._envConfigService) {
            return;
        }

        // Load updated environment list
        const envNames = this._envConfigService.getEnvironmentNames();
        const environments = envNames.map((name: string) => ({
            id: name,
            name: name,
            active: name === environment
        }));

        // Send updated environments to webview
        this._messenger.postMessage({
            type: 'setEnvironments',
            environments
        });
    }

    /**
     * Update webview HTML content
     */
    private _update(): void {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    /**
     * Generate HTML for webview
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const resourcePath = path.join(
            this._extensionUri.fsPath, 
            'resources', 
            'features', 
            'test-suite'
        );
            
        const sharedPath = path.join(this._extensionUri.fsPath, 'resources', 'shared');

        // Read HTML template from external file
        const htmlPath = path.join(resourcePath, 'index.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        // Generate URIs for resources
        const styleUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(resourcePath, 'style.css'))
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(resourcePath, 'bundle.js'))
        );
        const sharedStyleUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(sharedPath, 'monaco-viewer.css'))
        );
        const sharedScriptUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(sharedPath, 'monaco-viewer.js'))
        );
        const nonce = this._getNonce();

        // Replace placeholders
        html = html
            .replace(/\{\{cspSource\}\}/g, webview.cspSource)
            .replace(/\{\{styleUri\}\}/g, styleUri.toString())
            .replace(/\{\{scriptUri\}\}/g, scriptUri.toString())
            .replace(/\{\{sharedStyleUri\}\}/g, sharedStyleUri.toString())
            .replace(/\{\{sharedScriptUri\}\}/g, sharedScriptUri.toString())
            .replace(/\{\{nonce\}\}/g, nonce);

        return html;
    }

    /**
     * Generate nonce for script security
     */
    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        TestSuitePanel.currentPanel = undefined;

        // Dispose panel
        this._panel.dispose();

        // Dispose all disposables
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
