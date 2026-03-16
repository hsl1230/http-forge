/**
 * Folder Editor Panel
 * 
 * Panel for editing folder properties (name, description, auth, scripts).
 * Similar to Collection Editor but without Variables tab.
 */

import { ICollectionService } from '@http-forge/core';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../services/service-container';
import { IWebviewMessenger, WebviewMessageRouter, WebviewMessenger } from '../shared-interfaces';
import { ReadyHandler, SaveHandler } from './handlers';

export class FolderEditorPanel implements IWebviewMessenger {
    public static currentPanels: Map<string, FolderEditorPanel> = new Map();
    private static readonly viewType = 'httpForgeFolderEditor';

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private readonly collectionService: ICollectionService;
    private readonly collectionId: string;
    private readonly folderId: string;
    private readonly messenger: WebviewMessenger;
    private readonly router: WebviewMessageRouter;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        collectionId: string,
        folderId: string
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.collectionId = collectionId;
        this.folderId = folderId;

        // Get service from container
        const container = getServiceContainer();
        this.collectionService = container.collection;

        // Create messenger for webview communication
        this.messenger = new WebviewMessenger(panel);

        // Create and configure message router
        this.router = new WebviewMessageRouter();

        // Create handlers with name change callback
        const onNameChange = (name: string) => {
            this.panel.title = `Folder: ${name}`;
        };

        const readyHandler = new ReadyHandler(this.collectionService, collectionId, folderId);
        const saveHandler = new SaveHandler(this.collectionService, collectionId, folderId, onNameChange);

        // Register handlers
        this.router.registerHandlers([readyHandler, saveHandler]);

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
     * Show or create the Folder Editor panel for a specific folder
     */
    public static show(
        extensionUri: vscode.Uri,
        collectionId: string,
        folderId: string
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Unique key for this folder
        const panelKey = `${collectionId}:${folderId}`;

        // Check if we already have a panel for this folder
        const existingPanel = FolderEditorPanel.currentPanels.get(panelKey);
        if (existingPanel) {
            existingPanel.panel.reveal(column);
            return;
        }

        // Get service from container to validate collection and folder exist
        const container = getServiceContainer();
        const collectionService = container.collection;
        const collection = collectionService.getCollection(collectionId);
        if (!collection) {
            vscode.window.showErrorMessage(`Collection not found: ${collectionId}`);
            return;
        }

        // Find the folder
        const folder = FolderEditorPanel.findFolderById(collection.items, folderId);
        if (!folder) {
            vscode.window.showErrorMessage(`Folder not found: ${folderId}`);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            FolderEditorPanel.viewType,
            `Folder: ${folder.name}`,
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
        const iconPath = vscode.Uri.joinPath(extensionUri, 'resources', 'icons', 'folder.svg');
        if (fs.existsSync(iconPath.fsPath)) {
            panel.iconPath = iconPath;
        }

        const editorPanel = new FolderEditorPanel(panel, extensionUri, collectionId, folderId);
        FolderEditorPanel.currentPanels.set(panelKey, editorPanel);
    }

    private static findFolderById(items: any[], id: string): any | undefined {
        for (const item of items) {
            if (item.id === id && item.type === 'folder') {
                return item;
            }
            if (item.type === 'folder' && item.items) {
                const found = FolderEditorPanel.findFolderById(item.items, id);
                if (found) return found;
            }
        }
        return undefined;
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
        const resourcePath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'features', 'folder-editor');
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
        const panelKey = `${this.collectionId}:${this.folderId}`;
        FolderEditorPanel.currentPanels.delete(panelKey);
        this.panel.dispose();
        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }
}
