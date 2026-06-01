import { ICollectionService, IEnvironmentConfigService, applyExtractionPlan, buildExtractionPlan, type SensitiveExtraction } from '@http-forge/core';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../../../../../shared/constants';
import { UIRequest } from '../../../../../shared/types';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { IPanelContextProvider } from '../interfaces';
import { getSuiteContext } from '../suite-context-registry';

/**
 * Handles save request operations
 * Single Responsibility: Only manages saving requests to collections or suite folders
 */
export class SaveRequestHandler implements IMessageHandler {
  constructor(
    private contextProvider: IPanelContextProvider,
    private collectionService?: ICollectionService,
    private envConfigService?: IEnvironmentConfigService
  ) {}

  getSupportedCommands(): string[] {
    return ['saveRequest'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    if (command === 'saveRequest') {
      await this.handleSaveRequest(message.request, messenger);
      return true;
    }
    return false;
  }

  private async handleSaveRequest(request: UIRequest, messenger: IWebviewMessenger): Promise<void> {
    const context = this.contextProvider.getCurrentContext();

    // Suite-aware save: write back to suite folder instead of collection
    if (context?.suiteId && context?.suiteRequestKey) {
      const suiteCtx = getSuiteContext(context.suiteId);
      if (suiteCtx) {
        await this.handleSaveSuiteRequest(request, context, suiteCtx, messenger);
        return;
      }
    }

    console.log('[SaveRequestHandler] handleSaveRequest called');
    console.log('[SaveRequestHandler] context:', JSON.stringify({
      readonly: context?.readonly,
      allowSave: context?.allowSave,
      collectionId: context?.collectionId,
      collectionName: context?.collectionName,
      requestId: context?.requestId
    }));
    console.log('[SaveRequestHandler] request:', JSON.stringify({
      collectionId: request.collectionId,
      id: request.id,
      name: request.name
    }));
    console.log('[SaveRequestHandler] collectionService available:', !!this.collectionService);

    // Only allow save in non-readonly mode, unless allowSave is explicitly set (e.g., Endpoint Tester)
    if (context?.readonly && !context?.allowSave) {
      console.log('[SaveRequestHandler] Blocked by readonly check');
      return;
    }

    // ── Sensitive data detection & extraction ──────────────────
    const extractions = buildExtractionPlan(request);
    if (extractions.length > 0) {
      const fieldList = extractions.map(e => e.field).join(', ');
      const choice = await vscode.window.showWarningMessage(
        `Sensitive data detected in: ${fieldList}. Extract to .local.json?`,
        { modal: true },
        'Extract to .local.json',
        'Save Anyway'
      );

      if (!choice) {
        // User cancelled
        return;
      }

      if (choice === 'Extract to .local.json') {
        request = this.extractSecretsToLocalJson(request, extractions);
      }
      // 'Save Anyway' falls through to normal save
    }

    // Get collection and request IDs - prefer from context as they are the source of truth
    let collectionId = request.collectionId || context?.collectionId;
    const requestId = request.id || context?.requestId || context?.request?.id;
    const requestUrl = request.url || request.path || context?.request?.url || '';

    // If no collectionId but we have collectionName, find or create the collection
    if (!collectionId && context?.collectionName && this.collectionService) {
      console.log('[SaveRequestHandler] Looking for collection by name:', context.collectionName);
      const existingCollection = this.collectionService.getCollectionByName(context.collectionName);
      if (existingCollection) {
        collectionId = existingCollection.id;
        console.log('[SaveRequestHandler] Found existing collection:', collectionId);
      } else {
        // Create new collection with this name
        const newCollection = await this.collectionService.createCollection(context.collectionName);
        collectionId = newCollection.id;
        console.log('[SaveRequestHandler] Created new collection:', collectionId);
        vscode.window.showInformationMessage(`Created collection: ${context.collectionName}`);
      }
    }

    console.log('[SaveRequestHandler] After collection resolution - collectionId:', collectionId, 'requestId:', requestId);

    if (!collectionId) {
      // No collection specified - prompt user to select one
      console.log('[SaveRequestHandler] No collectionId - prompting user to select collection');
      const result = await vscode.commands.executeCommand(COMMAND_IDS.saveRequestToCollection, {
        method: request.method || context?.request?.method || 'GET',
        url: requestUrl,
        headers: request.headers ?? context?.request?.headers ?? {},
        body: request.body,
        query: request.query,
        params: request.params,
        auth: request.auth,
        settings: request.settings,
        scripts: request.scripts,
        name: request.name || context?.request?.name,
        // Preserve OpenAPI metadata
        deprecated: request.deprecated ?? context?.request?.deprecated,
        description: request.description ?? context?.request?.description,
        doc: request.doc ?? context?.request?.doc,
        responseSchema: request.responseSchema ?? context?.request?.responseSchema,
        bodySchema: request.bodySchema ?? context?.request?.bodySchema
      });

      if (result) {
        vscode.window.showInformationMessage('Request saved to collection');
        messenger.postMessage({ command: 'requestSaved' });
      }
    } else {
      // Collection specified - check if request exists in collection
      let requestExistsInCollection = false;
      if (requestId && requestId !== 'new-request' && this.collectionService) {
        const collection = this.collectionService.getCollection(collectionId);
        if (collection) {
          requestExistsInCollection = this.findRequestInCollection(collection.items || [], requestId);
        }
      }
      console.log('[SaveRequestHandler] Request exists in collection:', requestExistsInCollection);

      if (!requestId || requestId === 'new-request' || !requestExistsInCollection) {
        // Create new request in collection
        console.log('[SaveRequestHandler] Creating new request in collection');
        console.log('[SaveRequestHandler] request.params:', JSON.stringify(request.params));
        const result = await vscode.commands.executeCommand(COMMAND_IDS.createRequestWithData, {
          collectionId,
          folderPath: context?.folderPath,
          requestId,
          name: request.name || context?.request?.name || 'New Request',
          method: request.method || context?.request?.method || 'GET',
          url: requestUrl,
          headers: request.headers ?? context?.request?.headers ?? {},
          body: request.body,
          query: request.query,
          params: request.params,
          auth: request.auth,
          settings: request.settings,
          scripts: request.scripts,
          // Preserve OpenAPI metadata
          deprecated: request.deprecated ?? context?.request?.deprecated,
          description: request.description ?? context?.request?.description,
          doc: request.doc ?? context?.request?.doc,
          responseSchema: request.responseSchema ?? context?.request?.responseSchema,
          bodySchema: request.bodySchema ?? context?.request?.bodySchema
        }) as { success: boolean; requestId: string; name: string } | undefined;

        if (result?.success) {
          vscode.window.showInformationMessage('Request saved to collection');
          // Send the new request ID back to webview so subsequent saves will update
          messenger.postMessage({ 
            command: 'requestSaved',
            requestId: result.requestId,
            name: result.name
          });
        }
      } else {
        // Request exists - update it
        console.log('[SaveRequestHandler] Updating existing request');
        await vscode.commands.executeCommand(COMMAND_IDS.updateRequest, {
          collectionId,
          requestId,
          name: request.name || context?.request?.name,
          method: request.method || context?.request?.method || 'GET',
          url: requestUrl,
          headers: request.headers ?? context?.request?.headers ?? {},
          body: request.body,
          query: request.query,
          params: request.params,
          auth: request.auth,
          settings: request.settings,
          scripts: request.scripts,
          // Preserve OpenAPI metadata
          deprecated: request.deprecated ?? context?.request?.deprecated,
          description: request.description ?? context?.request?.description,
          doc: request.doc ?? context?.request?.doc,
          responseSchema: request.responseSchema ?? context?.request?.responseSchema,
          bodySchema: request.bodySchema ?? context?.request?.bodySchema
        });
        vscode.window.showInformationMessage('Request updated');
        messenger.postMessage({ command: 'requestSaved' });
      }
    }
  }

  /**
   * Save request to suite folder (suite-aware save path)
   */
  private async handleSaveSuiteRequest(
    request: UIRequest,
    context: any,
    suiteCtx: NonNullable<ReturnType<typeof getSuiteContext>>,
    messenger: IWebviewMessenger
  ): Promise<void> {
    const slug = context.suiteRequestKey;
    if (!slug) return;

    // Build CollectionRequest from UI request
    const updatedRequest: any = {
      id: request.id || context.requestId,
      name: request.name || context.request?.name || '',
      method: request.method || context.request?.method || 'GET',
      url: request.url || request.path || context.request?.url || '',
      headers: request.headers ?? context.request?.headers ?? [],
      query: request.query ?? context.request?.query ?? [],
      params: request.params ?? context.request?.params ?? [],
      body: request.body ?? context.request?.body ?? null,
      auth: request.auth ?? context.request?.auth,
      settings: request.settings ?? context.request?.settings,
      scripts: request.scripts ?? context.request?.scripts
    };

    // Update the suite's request folder
    suiteCtx.suiteStore.updateSuiteRequest(slug, updatedRequest);

    // Persist suite.json (updates cached name/method)
    const suite = suiteCtx.suiteStore.getSuite();
    if (suite) {
      await suiteCtx.testSuiteService.updateSuite(suite);
    }

    vscode.window.showInformationMessage('Suite request saved');
    messenger.postMessage({ command: 'requestSaved' });
  }

  /**
   * Extract sensitive data to .local.json and replace values with {{variable}} references.
   * Returns the modified request.
   */
  private extractSecretsToLocalJson(request: UIRequest, extractions: SensitiveExtraction[]): UIRequest {
    if (!this.envConfigService) {
      vscode.window.showErrorMessage('Environment service unavailable. Cannot extract secrets.');
      return request;
    }

    const envName = this.envConfigService.getSelectedEnvironment();
    const localFilePath = this.envConfigService.getEnvLocalPath(envName);

    // Read existing local config or start fresh
    let existingVars: Record<string, string> = {};
    try {
      if (fs.existsSync(localFilePath)) {
        const content = JSON.parse(fs.readFileSync(localFilePath, 'utf-8'));
        existingVars = content.variables || {};
      }
    } catch { /* start fresh */ }

    // Merge new extractions
    for (const extraction of extractions) {
      existingVars[extraction.variableName] = extraction.value;
    }

    // Write to .local.json
    const dir = path.dirname(localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localFilePath, JSON.stringify({ variables: existingVars }, null, 2), 'utf-8');

    // Apply replacements to the request
    const modified = applyExtractionPlan(request, extractions) as UIRequest;

    const varNames = extractions.map(e => `{{${e.variableName}}}`).join(', ');
    vscode.window.showInformationMessage(
      `Extracted ${extractions.length} secret(s) to ${path.basename(localFilePath)}. Variables: ${varNames}`
    );

    return modified;
  }

  /**
   * Recursively search for a request in collection items
   */
  private findRequestInCollection(items: any[], requestId: string): boolean {
    for (const item of items) {
      if (item.type === 'request' && item.id === requestId) {
        return true;
      }
      if (item.type === 'folder' && item.items) {
        if (this.findRequestInCollection(item.items, requestId)) {
          return true;
        }
      }
    }
    return false;
  }
}
