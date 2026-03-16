/**
 * Collection Editor Panel
 * 
 * Panel for editing collection properties (name, description, variables, auth, scripts).
 * 
 * SOLID Compliance:
 * - Single Responsibility: Panel manages UI lifecycle, delegates to handlers
 * - Open/Closed: New message types handled by adding handlers
 * - Dependency Inversion: Depends on abstractions (IMessageHandler, IWebviewMessenger)
 */

import { ICollectionService } from '@http-forge/core';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../services/service-container';
import { IWebviewMessenger, WebviewMessageRouter, WebviewMessenger } from '../shared-interfaces';
import { SaveHandler, UpdateHandler } from './handlers';
import { ReadyHandler } from './handlers/ready-handler';

export class CollectionEditorPanel implements IWebviewMessenger {
    public static currentPanels: Map<string, CollectionEditorPanel> = new Map();
    private static readonly viewType = 'httpForgeCollectionEditor';

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private readonly collectionService: ICollectionService;
    private readonly collectionId: string;
    private readonly messenger: WebviewMessenger;
    private readonly router: WebviewMessageRouter;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        collectionId: string
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.collectionId = collectionId;

        // Get service from container (Dependency Inversion)
        const container = getServiceContainer();
        this.collectionService = container.collection;

        // Create messenger for webview communication
        this.messenger = new WebviewMessenger(panel);

        // Create and configure message router
        this.router = new WebviewMessageRouter();

        // Create handlers with name change callback
        const onNameChange = (name: string) => {
            this.panel.title = `Collection: ${name}`;
        };

        const readyHandler = new ReadyHandler(this.collectionService, collectionId);
        const saveHandler = new SaveHandler(this.collectionService, collectionId, onNameChange);
        const updateHandler = new UpdateHandler(this.collectionService, collectionId, onNameChange);

        // Register handlers
        this.router.registerHandlers([readyHandler, saveHandler, updateHandler]);

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
     * Show or create the Collection Editor panel for a specific collection
     */
    public static show(
        extensionUri: vscode.Uri,
        collectionId: string
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Check if we already have a panel for this collection
        const existingPanel = CollectionEditorPanel.currentPanels.get(collectionId);
        if (existingPanel) {
            existingPanel.panel.reveal(column);
            return;
        }

        // Get service from container to validate collection exists
        const container = getServiceContainer();
        const collectionService = container.collection;
        const collection = collectionService.getCollection(collectionId);
        if (!collection) {
            vscode.window.showErrorMessage(`Collection not found: ${collectionId}`);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            CollectionEditorPanel.viewType,
            `Collection: ${collection.name}`,
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

        // Set panel icon if available
        const iconPath = vscode.Uri.joinPath(extensionUri, 'resources', 'icons', 'collection.svg');
        if (fs.existsSync(iconPath.fsPath)) {
            panel.iconPath = iconPath;
        }

        const editorPanel = new CollectionEditorPanel(panel, extensionUri, collectionId);
        CollectionEditorPanel.currentPanels.set(collectionId, editorPanel);
    }

    /**
     * Set up message handlers using router
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
     * Get HTML content for the webview from external file
     */
    private getHtmlContent(): string {
        const webview = this.panel.webview;
        const resourcePath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'features', 'collection-editor');
        const sharedPath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'shared');

        // Get URIs for resources
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(resourcePath, 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(resourcePath, 'script.js'));
        const monacoViewerUri = webview.asWebviewUri(vscode.Uri.joinPath(sharedPath, 'monaco-viewer.js'));

        // Build CSP
        const cspContent = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdnjs.cloudflare.com; script-src ${webview.cspSource} https://cdnjs.cloudflare.com; font-src ${webview.cspSource} https://cdnjs.cloudflare.com; img-src ${webview.cspSource} data:; connect-src https://cdnjs.cloudflare.com;`;

        // Read HTML template
        const htmlPath = path.join(resourcePath.fsPath, 'index.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        // Replace template variables
        html = html.replace('{{cspContent}}', cspContent);
        html = html.replace('{{styleUri}}', styleUri.toString());
        html = html.replace('{{scriptUri}}', scriptUri.toString());
        html = html.replace('{{monacoViewerUri}}', monacoViewerUri.toString());

        return html;
    }

    /**
     * Dispose of the panel
     */
    public dispose(): void {
        CollectionEditorPanel.currentPanels.delete(this.collectionId);
        this.panel.dispose();
        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }
}
