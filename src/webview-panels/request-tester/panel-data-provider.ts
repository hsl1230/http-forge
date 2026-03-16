/**
 * Panel Data Provider
 * 
 * Provides data for the Request Tester panel initialization and updates.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only prepares data for webview display
 * - Dependency Inversion: Implements IPanelContextProvider for handlers
 */

import { CollectionItem, CollectionRequestItem, ICollectionService, IEnvironmentConfigService, type CollectionRequest, type KeyValueEntry, type PathParamEntry } from '@http-forge/core';
import { ensureRequestDefaults, RequestContext } from '../../shared/utils';
import { CookieHandler } from './handlers/cookie-handler';
import { EnvironmentSelectionHandler } from './handlers/environment-handler';
import { VariableHandler } from './handlers/variable-handler';
import { HistoryStoragePath, HistoryUIEntry, IPanelContextProvider } from './interfaces';

/**
 * Provides data for the panel initialization and updates
 * Implements IPanelContextProvider for handlers that need context
 */
export class PanelDataProvider implements IPanelContextProvider {
  private currentContext?: RequestContext;

  constructor(
    private envConfigService: IEnvironmentConfigService,
    private environmentHandler: EnvironmentSelectionHandler,
    private cookieHandler: CookieHandler,
    private variableHandler: VariableHandler,
    private collectionService: ICollectionService
  ) {}

  /**
   * Set the current request context
   */
  setContext(context: RequestContext): void {
    this.currentContext = context;
  }

  /**
   * Get current context (for handlers)
   */
  getCurrentContext(): RequestContext | undefined {
    return this.currentContext;
  }

  /**
   * Get history storage path from current context
   */
  getHistoryStoragePath(): HistoryStoragePath | undefined {
    if (!this.currentContext) return undefined;

    const collectionId = this.currentContext.collectionId;
    if (!collectionId) return undefined;

    const environment = this.envConfigService.getSelectedEnvironment();
    if (!environment) return undefined;

    const pathParts = [collectionId];
    if (this.currentContext.folderPath) {
      pathParts.push(this.currentContext.folderPath);
    }

    const requestId = this.currentContext.requestId || this.currentContext.request?.id || '';
    if (!requestId) return undefined;

    return {
      environment,
      requestPath: pathParts.join('/'),
      requestId
    };
  }

  /**
   * Get collection ID from current context
   */
  getCollectionId(): string | undefined {
    return this.currentContext?.collectionId;
  }

  /**
   * Check if a collection ID is a virtual collection
   * Virtual collections use the pattern __name__ (double underscores)
   */
  private isVirtualCollectionId(collectionId: string): boolean {
    return /^__.*__$/.test(collectionId);
  }

  /**
   * Resolve collectionId from collectionName if missing
   */
  private resolveCollectionIdFromName(): void {
    if (!this.currentContext) return;
    if (this.currentContext.collectionId) return;
    if (!this.currentContext.collectionName) return;

    const collection = this.collectionService.getCollectionByName(this.currentContext.collectionName);
    if (collection) {
      this.currentContext.collectionId = collection.id;
    }
  }

  /**
   * Merge saved request values into the latest generated request
   */
  private mergeCollectionRequests(base: CollectionRequest, saved: CollectionRequest): CollectionRequest {
    const mergeKeyed = (
      baseItems: KeyValueEntry[] = [],
      savedItems: KeyValueEntry[] = []
    ) => {
      const map = new Map<string, KeyValueEntry>();
      // Base first, then saved overwrites — saved (user's manual edits) wins
      baseItems.forEach(item => map.set(item.key, { ...item }));
      savedItems.forEach(item => map.set(item.key, { ...item }));
      return Array.from(map.values());
    };

    const mergeParams = (
      baseParams?: Record<string, string | PathParamEntry>,
      savedParams?: Record<string, string | PathParamEntry>
    ): Record<string, string | PathParamEntry> | undefined => {
      if (!baseParams && !savedParams) return undefined;
      // Base first, then saved overwrites — saved wins
      return { ...(baseParams || {}), ...(savedParams || {}) };
    };

    const mergeBody = (baseBody: CollectionRequest['body'], savedBody: CollectionRequest['body']) => {
      if (!savedBody) return baseBody ?? null;
      if (!baseBody) return savedBody;
      if (baseBody.type === savedBody.type && baseBody.type === 'raw') {
        const baseContent = baseBody.content;
        const savedContent = savedBody.content;
        if (baseBody.format === 'json' && typeof baseContent === 'object' && typeof savedContent === 'object') {
          return {
            ...baseBody,
            content: { ...baseContent, ...savedContent }
          };
        }
      }
      return savedBody;
    };

    return {
      ...base,
      id: saved.id || base.id,
      name: saved.name || base.name,
      method: saved.method || base.method,
      url: saved.url || base.url,
      headers: mergeKeyed(base.headers, saved.headers),
      query: mergeKeyed(base.query, saved.query),
      params: mergeParams(base.params, saved.params),
      body: mergeBody(base.body, saved.body),
      auth: saved.auth ?? base.auth,
      settings: saved.settings ?? base.settings,
      scripts: {
        preRequest: saved.scripts?.preRequest || base.scripts?.preRequest || '',
        postResponse: saved.scripts?.postResponse || base.scripts?.postResponse || ''
      },
      // Saved takes precedence for all fields — preserves the user's manual
      // edits. Users can delete the saved request to pick up fresh base values.
      deprecated: saved.deprecated ?? base.deprecated,
      description: saved.description ?? base.description,
      responseSchema: saved.responseSchema ?? base.responseSchema,
      bodySchema: saved.bodySchema ?? base.bodySchema
    };
  }

  /**
   * Fallback search for a request by name or URL
   */
  private findRequestBySignature(collectionId: string, request: CollectionRequest): CollectionRequestItem | undefined {
    const collection = this.collectionService.getCollection(collectionId);
    if (!collection) return undefined;

    const match = (item: CollectionItem): boolean => {
      if (item.type !== 'request') return false;
      return (
        !!request.name && item.name === request.name
      );
    };

    const walk = (items: CollectionItem[]): CollectionRequestItem | undefined => {
      for (const item of items) {
        if (match(item)) return item as CollectionRequestItem;
        if (item.type === 'folder' && item.items) {
          const found = walk(item.items);
          if (found) return found as CollectionRequestItem;
        }
      }
      return undefined;
    };

    return walk(collection.items || []);
  }

  /**
   * Get the collection service instance
   */
  getCollectionService(): ICollectionService {
    return this.collectionService;
  }

  /**
   * Get all data needed for webview initialization
   */
  getInitialData(): Record<string, any> {
    if (!this.currentContext) {
      throw new Error('No context set');
    }

    // Ensure collectionId is resolved when collectionName is provided
    this.resolveCollectionIdFromName();

    // If saved request exists, merge its values into the latest generated request
    if (this.currentContext.collectionId && this.currentContext.request) {
      const requestId = this.currentContext.requestId || this.currentContext.request?.id || '';
      let savedItem = requestId
        ? this.collectionService.findRequest(this.currentContext.collectionId, requestId)
        : undefined;

      if (!savedItem && !this.currentContext.allowDuplicatedName) {
        savedItem = this.findRequestBySignature(this.currentContext.collectionId, this.currentContext.request);
        if (savedItem) {
          this.currentContext.requestId = savedItem.id;
          this.currentContext.request.id = savedItem.id;
        }
      }

      if (savedItem && savedItem.type === 'request') {
        const savedRequest = ensureRequestDefaults(savedItem);
        this.currentContext.request = this.mergeCollectionRequests(this.currentContext.request, savedRequest);
      }
    }

    const envData = this.environmentHandler.getEnvironmentData();
    const branchInfo = this.currentContext.group?.branch || '';
    const cookies = this.cookieHandler.getAllCookies();

    // Get collection name - for virtual collections (__name__), use the ID as name
    let collectionName: string | undefined;
    if (this.currentContext.collectionId) {
      if (this.isVirtualCollectionId(this.currentContext.collectionId)) {
        // Virtual collection: ID is the name
        collectionName = this.currentContext.collectionId;
      } else {
        // Real collection: look up name from service
        const collection = this.getCollectionService().getCollection(this.currentContext.collectionId);
        collectionName = collection?.name;
      }
    } else if (this.currentContext.collectionName) {
      collectionName = this.currentContext.collectionName;
    }

    // Get collection variables
    let collectionVariables: Record<string, string> = {};
    if (this.currentContext.collectionId) {
      collectionVariables = this.variableHandler.getCollectionVariables(this.currentContext.collectionId);
    }

    // Get history
    let history: HistoryUIEntry[] = [];
    const historyPath = this.getHistoryStoragePath();
    if (historyPath) {
      history = this.environmentHandler.getHistoryForUI(
        historyPath.environment,
        historyPath.requestPath,
        historyPath.requestId
      );
    }

    const allowSave = this.currentContext.allowSave ?? (this.currentContext.readonly === true && !!collectionName);

    return {
      request: this.currentContext.request,
      readonly: this.currentContext.readonly,
      allowSave,
      title: this.currentContext.title,
      collectionId: this.currentContext.collectionId,
      collectionName,
      ...envData,
      collectionVariables,
      branchInfo,
      history,
      cookies
    };
  }
}
