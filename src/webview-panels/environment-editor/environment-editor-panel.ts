/**
 * Panel for editing environment configurations
 * Allows users to manage environments, variables, and settings
 * 
 * SOLID Compliance:
 * - Single Responsibility: Panel manages UI lifecycle, delegates to handlers
 * - Open/Closed: New message types handled by adding handlers
 * - Dependency Inversion: Depends on abstractions (IMessageHandler, IWebviewMessenger)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../services/service-container';
import { IWebviewMessenger, WebviewMessageRouter, WebviewMessenger } from '../shared-interfaces';
import {
    ConfigHandler,
    EnvironmentCrudHandler,
    FileHandler
} from './handlers';
import { ReadyHandler } from './handlers/ready-handler';

export class EnvironmentEditorPanel implements IWebviewMessenger {
    public static currentPanel: EnvironmentEditorPanel | undefined;
    private static readonly viewType = 'httpForgeEnvironmentEditor';

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private readonly messenger: WebviewMessenger;
    private readonly router: WebviewMessageRouter;
    private readonly readyHandler: ReadyHandler;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        selectedEnvironment?: string
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        
        // Get service from container (Dependency Inversion)
        const container = getServiceContainer();
        const configService = container.environmentConfig;
        
        // Create messenger for webview communication (Dependency Inversion)
        this.messenger = new WebviewMessenger(panel);
        
        // Create and configure message router (Open/Closed)
        this.router = new WebviewMessageRouter();
        
        // Create handlers with dependencies
        this.readyHandler = new ReadyHandler(configService);
        if (selectedEnvironment) {
            this.readyHandler.setSelectedEnvironment(selectedEnvironment);
        }
        
        const configHandler = new ConfigHandler(configService);
        const environmentCrudHandler = new EnvironmentCrudHandler(configService, this.readyHandler);
        const fileHandler = new FileHandler(configService);
        
        // Register handlers with router
        this.router.registerHandlers([
            this.readyHandler,
            configHandler,
            environmentCrudHandler,
            fileHandler
        ]);

        this.panel.webview.html = this.getHtmlContent();
        this.setupMessageHandlers();

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    /**
     * IWebviewMessenger implementation
     */
    public postMessage(message: any): void {
        this.panel.webview.postMessage(message);
    }

    /**
     * Show or create the Environment Editor panel
     * @param selectedEnvironment - Optional environment name to focus on
     */
    public static show(extensionUri: vscode.Uri, selectedEnvironment?: string): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (EnvironmentEditorPanel.currentPanel) {
            // Update selected environment and refresh
            EnvironmentEditorPanel.currentPanel.readyHandler.setSelectedEnvironment(selectedEnvironment);
            EnvironmentEditorPanel.currentPanel.panel.reveal(column);
            EnvironmentEditorPanel.currentPanel.sendInitialData();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            EnvironmentEditorPanel.viewType,
            'Environment Settings',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'resources'),
                    vscode.Uri.joinPath(extensionUri, 'node_modules')
                ]
            }
        );

        EnvironmentEditorPanel.currentPanel = new EnvironmentEditorPanel(panel, extensionUri, selectedEnvironment);
    }

    /**
     * Set up message handlers for webview communication using router
     */
    private setupMessageHandlers(): void {
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                await this.router.route(message, this.messenger);
            },
            null,
            this.disposables
        );
    }

    /**
     * Delegate to ready handler to send initial data
     */
    private async sendInitialData(): Promise<void> {
        await this.readyHandler.sendInitialData(this.messenger);
    }

    /**
     * Get the HTML content for the webview
     */
    private getHtmlContent(): string {
        const webview = this.panel.webview;
        
        // Get URIs for resources
        const sharedStyleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'features', 'shared', 'monaco-viewer.css')
        );
        const sharedScriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'features', 'shared', 'monaco-loader.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'features', 'environment-editor', 'style.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'features', 'environment-editor', 'script.js')
        );

        // Read HTML template
        const htmlPath = path.join(
            this.extensionUri.fsPath,
            'resources',
            'features',
            'environment-editor',
            'index.html'
        );
        
        let html = fs.readFileSync(htmlPath, 'utf8');

        // Replace template variables
        html = html.replace('{{sharedStyleUri}}', sharedStyleUri.toString());
        html = html.replace('{{sharedScriptUri}}', sharedScriptUri.toString());
        html = html.replace('{{styleUri}}', styleUri.toString());
        html = html.replace('{{scriptUri}}', scriptUri.toString());

        return html;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        EnvironmentEditorPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
