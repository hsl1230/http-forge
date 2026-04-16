import * as vscode from 'vscode';
import { RequestContext } from '../../../../shared/utils';
import { RequestTesterPanel } from './request-tester-panel';

/**
 * Maximum number of request panels that can be open simultaneously
 */
const MAX_PANELS = 5;

/**
 * Manages multiple Request Tester panels
 * 
 * - One panel per unique request (no duplicates)
 * - Maximum 5 panels open at a time
 * - Provides "Close All" functionality
 */
export class RequestTesterPanelManager {
  private static instance: RequestTesterPanelManager | undefined;

  private panels: Map<string, RequestTesterPanel> = new Map();
  private panelOrder: string[] = []; // Track order for LRU eviction
  private extensionUri: vscode.Uri | undefined;

  private constructor() { }

  static resetInstance(): void {
    if (this.instance) {
      this.instance.dispose();
      this.instance = undefined;
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): RequestTesterPanelManager {
    if (!RequestTesterPanelManager.instance) {
      RequestTesterPanelManager.instance = new RequestTesterPanelManager();
    }
    return RequestTesterPanelManager.instance;
  }

  /**
   * Set the extension URI (must be called during activation)
   */
  public setExtensionUri(uri: vscode.Uri): void {
    this.extensionUri = uri;
  }

  /**
   * Generate a unique panel ID from the request context
   */
  private generatePanelId(context: RequestContext): string {
    // Use collectionId:requestId if available, otherwise use a hash of the context
    if (context.collectionId && context.requestId) {
      return `${context.collectionId}:${context.requestId}`;
    }
    // For requests without IDs, use collection + folder + title
    const parts = [
      context.collectionId || 'standalone',
      context.folderPath || '',
      context.title || 'request'
    ];
    return parts.join(':');
  }

  /**
   * Generate panel title in format "METHOD - Request Name"
   */
  private generatePanelTitle(context: RequestContext): string {
    const method = context.request?.method?.toUpperCase() || 'GET';
    const name = context.title || context.request?.name || 'Request';
    return `${method} - ${name}`;
  }

  /**
   * Show or reveal a request panel
   * - If panel already exists for this request, reveal it (never create duplicates)
   * - If forceNew is false and active editor is a request tester, reuse it with new content
   * - Otherwise create a new panel (up to MAX_PANELS limit)
   */
  public async show(context: RequestContext, forceNew: boolean = false): Promise<RequestTesterPanel | undefined> {
    if (!this.extensionUri) {
      vscode.window.showErrorMessage('HTTP Forge: Extension not properly initialized');
      return undefined;
    }

    const panelId = this.generatePanelId(context);

    // ALWAYS check if panel already exists for this exact request - never create duplicates
    if (this.panels.has(panelId)) {
      const existingPanel = this.panels.get(panelId)!;
      existingPanel.reveal();

      // Move to end of order (most recently used)
      this.panelOrder = this.panelOrder.filter(id => id !== panelId);
      this.panelOrder.push(panelId);

      return existingPanel;
    }

    // Determine which panel to overwrite (if any)
    let targetPanel: RequestTesterPanel | undefined;
    let targetPanelId: string | undefined;

    // First priority: reuse active panel if not forcing new
    if (!forceNew) {
      targetPanel = this.getActiveRequestPanel();
      if (targetPanel) {
        targetPanelId = this.findPanelId(targetPanel);
      }
    }

    // Second priority: if at max capacity and need new panel, reuse oldest
    if (!targetPanel && this.panels.size >= MAX_PANELS) {
      const oldestPanelId = this.panelOrder[0];
      if (oldestPanelId) {
        targetPanel = this.panels.get(oldestPanelId);
        targetPanelId = oldestPanelId;
      }
    }

    // If we have a target panel to overwrite, check for unsaved changes
    if (targetPanel && targetPanelId) {
      const action = await this.checkUnsavedChanges(targetPanel);

      if (action === 'cancel') {
        return undefined;
      }

      if (action === 'new-panel') {
        // User wants new panel (only possible if not at max capacity)
        // Clear targetPanel so we create a new one below
        targetPanel = undefined;
        targetPanelId = undefined;
      } else {
        // action === 'overwrite' - reuse the target panel
        this.removePanel(targetPanelId);

        const panelTitle = this.generatePanelTitle(context);
        await targetPanel.updateContent(context, panelTitle);

        this.panels.set(panelId, targetPanel);
        this.panelOrder.push(panelId);

        // Re-register dispose listener with the NEW panelId
        // (the old listener still references the old panelId which is now invalid)
        targetPanel.onDidDispose(() => {
          this.removePanel(panelId);
        });

        return targetPanel;
      }
    }

    // Create new panel
    const panelTitle = this.generatePanelTitle(context);
    const panel = RequestTesterPanel.create(this.extensionUri, context, panelId, panelTitle);

    // Track the panel
    this.panels.set(panelId, panel);
    this.panelOrder.push(panelId);

    // Listen for disposal
    panel.onDidDispose(() => {
      this.removePanel(panelId);
    });

    return panel;
  }

  /**
   * Check if a panel has unsaved changes and prompt user if needed
   * @param panel The panel to check
   * @returns 'overwrite' | 'new-panel' | 'cancel'
   */
  private async checkUnsavedChanges(panel: RequestTesterPanel): Promise<'overwrite' | 'new-panel' | 'cancel'> {
    const hasUnsaved = panel.hasUnsavedChanges();

    if (!hasUnsaved) {
      return 'overwrite'; // No unsaved changes, safe to overwrite
    }

    const atMaxCapacity = this.panels.size >= MAX_PANELS;

    // At max capacity, user can only overwrite or cancel (can't create new panel)
    if (atMaxCapacity) {
      const choice = await vscode.window.showWarningMessage(
        'The request panel has unsaved changes. Maximum panel limit reached.',
        { modal: true },
        'Overwrite'
      );

      return choice === 'Overwrite' ? 'overwrite' : 'cancel';
    }

    // Not at max capacity, user can choose to open in new panel
    const choice = await vscode.window.showWarningMessage(
      'The request panel has unsaved changes.',
      { modal: true },
      'Overwrite',
      'Open in New Panel'
    );

    if (choice === 'Overwrite') return 'overwrite';
    if (choice === 'Open in New Panel') return 'new-panel';
    return 'cancel';
  }

  /**
   * Remove a panel from tracking
   */
  private removePanel(panelId: string): void {
    this.panels.delete(panelId);
    this.panelOrder = this.panelOrder.filter(id => id !== panelId);
  }

  /**
   * Get the active request panel if one is currently active
   */
  private getActiveRequestPanel(): RequestTesterPanel | undefined {
    for (const panel of this.panels.values()) {
      if (panel.isActive()) {
        return panel;
      }
    }
    return undefined;
  }

  /**
   * Find the panel ID for a given panel instance
   */
  private findPanelId(panel: RequestTesterPanel): string | undefined {
    for (const [id, p] of this.panels.entries()) {
      if (p === panel) {
        return id;
      }
    }
    return undefined;
  }

  /**
   * Close all open request panels
   */
  public closeAll(): void {
    const panelIds = [...this.panels.keys()];
    for (const panelId of panelIds) {
      const panel = this.panels.get(panelId);
      if (panel) {
        panel.dispose();
      }
    }
    this.panels.clear();
    this.panelOrder = [];
  }

  /**
   * Get the count of open panels
   */
  public getOpenPanelCount(): number {
    return this.panels.size;
  }

  /**
   * Notify all panels of an environment change
   */
  public notifyEnvironmentChange(environment: string): void {
    for (const panel of this.panels.values()) {
      panel.notifyEnvironmentChange(environment);
    }
  }

  /**
   * Notify all panels that collection files have changed on disk
   */
  public notifyCollectionsChanged(): void {
    for (const panel of this.panels.values()) {
      panel.reloadFromDisk();
    }
  }

  /**
   * Notify all panels that environment files have changed on disk
   */
  public notifyEnvironmentsChanged(): void {
    for (const panel of this.panels.values()) {
      panel.reloadFromDisk();
    }
  }

  /**
   * Dispose of the manager and all panels
   */
  public dispose(): void {
    this.closeAll();
    RequestTesterPanelManager.instance = undefined;
  }
}
