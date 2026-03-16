import {
  Collection,
  CollectionItem,
  type CollectionRequest,
  CollectionRequestItem,
  CollectionService,
  CookieService,
  EnvironmentConfigService,
  type HistoryEntry,
  type HttpRequestOptions,
  HttpRequestService,
  type HttpResponse,
  RequestHistoryService,
  ResolvedEnvironment
} from '@http-forge/core';
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../shared';
import { ensureRequestDefaults } from '../shared/utils';

/**
 * Input for opening a request with full context
 * Used by external extensions (e.g., agl-essentials) for endpoint testing
 */
export interface RequestContextInput {
  request: CollectionRequest;
  readonly?: boolean;
  allowSave?: boolean;
  title?: string;
  collectionId?: string;
  collectionName?: string;
  requestId?: string;
  folderPath?: string;
  group?: { ticket: string | null; branch: string };
}

/**
 * HTTP Forge Public API
 * 
 * This interface exposes HTTP Forge functionality to other extensions
 * via the VS Code extension API:
 * 
 * ```typescript
 * const httpForge = vscode.extensions.getExtension('henry-huang.http-forge');
 * if (httpForge) {
 *   const api = httpForge.exports as HttpForgeApi;
 *   // Use API
 * }
 * ```
 */
export interface HttpForgeApi {
  /**
   * API version for compatibility checks
   */
  readonly version: string;

  // ========================================
  // Environment Management
  // ========================================

  /**
   * Get all available environment names
   */
  getEnvironmentNames(): string[];

  /**
   * Get the currently selected environment name
   */
  getSelectedEnvironment(): string;

  /**
   * Set the selected environment
   */
  setSelectedEnvironment(name: string): Promise<void>;

  /**
   * Get resolved environment configuration (merged with inheritance)
   */
  getResolvedEnvironment(name: string): ResolvedEnvironment | null;

  /**
   * Resolve variables in a string using the current environment
   */
  resolveVariables(text: string, environmentName?: string): string;

  // ========================================
  // Collection Management
  // ========================================

  /**
   * Get all collections
   */
  getAllCollections(): Collection[];

  /**
   * Get a collection by ID
   */
  getCollection(id: string): Collection | undefined;

  /**
   * Create a new collection
   */
  createCollection(name: string): Promise<Collection>;

  /**
   * Save/update a collection
   */
  saveCollection(collection: Collection): Promise<void>;

  /**
   * Delete a collection
   */
  deleteCollection(id: string): Promise<boolean>;

  /**
   * Find a request in a collection
   */
  findRequest(collectionId: string, requestId: string): CollectionRequestItem | undefined;

  // ========================================
  // HTTP Requests
  // ========================================

  /**
   * Execute an HTTP request
   */
  executeRequest(options: HttpRequestOptions): Promise<HttpResponse>;

  /**
   * Build a full URL from path, params, and query
   */
  buildUrl(
    path: string,
    params?: Record<string, string>,
    query?: Record<string, string>
  ): string;

  // ========================================
  // Request History
  // ========================================

  /**
   * Get request history entries for a specific request
   */
  getRequestHistory(
    environment: string,
    requestPath: string,
    requestId: string
  ): HistoryEntry[];

  // ========================================
  // Cookie Management
  // ========================================

  /**
   * Get all stored cookies
   */
  getAllCookies(): any[];

  /**
   * Get cookie header for a domain
   */
  getCookieHeader(domain: string): string;

  /**
   * Clear all cookies
   */
  clearCookies(): Promise<void>;

  // ========================================
  // UI Commands
  // ========================================

  /**
   * Open the request tester panel with a specific request
   */
  openRequest(
    collectionId: string,
    folderPath: string[],
    request: CollectionItem
  ): void;

  /**
   * Open the request tester panel with a full RequestContext
   * Use this when you have complete context (e.g., from endpoint testing)
   */
  openRequestContext(context: RequestContextInput): void;

  /**
   * Open the environment editor
   */
  openEnvironmentEditor(selectedEnvironment?: string): void;

  /**
   * Open the collection editor
   */
  openCollectionEditor(collectionId: string): void;

  /**
   * Refresh the collections tree view
   */
  refreshCollections(): void;

  /**
   * Refresh the environments tree view
   */
  refreshEnvironments(): void;
}

/**
 * Implementation of the HTTP Forge API
 */
export class HttpForgeApiImpl implements HttpForgeApi {
  readonly version = '1.0.0';

  constructor(
    private context: vscode.ExtensionContext,
    private envConfigService: EnvironmentConfigService,
    private collectionService: CollectionService,
    private httpService: HttpRequestService,
    private cookieService: CookieService,
    private historyService: RequestHistoryService,
    private refreshCollectionsCallback: () => void,
    private refreshEnvironmentsCallback: () => void
  ) {}

  // Environment Management
  getEnvironmentNames(): string[] {
    return this.envConfigService.getEnvironmentNames();
  }

  getSelectedEnvironment(): string {
    return this.envConfigService.getSelectedEnvironment();
  }

  async setSelectedEnvironment(name: string): Promise<void> {
    await this.envConfigService.setSelectedEnvironment(name);
  }

  getResolvedEnvironment(name: string): ResolvedEnvironment | null {
    return this.envConfigService.getResolvedEnvironment(name);
  }

  resolveVariables(text: string, environmentName?: string): string {
    return this.envConfigService.resolveVariables(text, environmentName || this.getSelectedEnvironment());
  }

  // Collection Management
  getAllCollections(): Collection[] {
    return this.collectionService.getAllCollections();
  }

  getCollection(id: string): Collection | undefined {
    return this.collectionService.getCollection(id);
  }

  async createCollection(name: string): Promise<Collection> {
    return this.collectionService.createCollection(name);
  }

  async saveCollection(collection: Collection): Promise<void> {
    return this.collectionService.saveCollection(collection);
  }

  async deleteCollection(id: string): Promise<boolean> {
    return this.collectionService.deleteCollection(id);
  }

  findRequest(collectionId: string, requestId: string): CollectionRequestItem | undefined {
    return this.collectionService.findRequest(collectionId, requestId);
  }

  // HTTP Requests
  async executeRequest(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.httpService.execute(options);
  }

  buildUrl(
    path: string,
    params?: Record<string, string>,
    query?: Record<string, string>
  ): string {
    return this.httpService.buildUrl(path, params || {}, query || {});
  }

  // Request History
  getRequestHistory(
    environment: string,
    requestPath: string,
    requestId: string
  ): HistoryEntry[] {
    return this.historyService.getEntriesForEnvironment(environment, requestPath, requestId);
  }

  // Cookie Management
  getAllCookies(): any[] {
    return this.cookieService.getAll();
  }

  getCookieHeader(domain: string): string {
    return this.cookieService.getCookieHeader(domain);
  }

  async clearCookies(): Promise<void> {
    return this.cookieService.clear();
  }

  // UI Commands
  openRequest(
    collectionId: string,
    folderPath: string[],
    request: CollectionItem
  ): void {
    const requestContext: RequestContextInput = {
      title: request.name || 'HTTP Request',
      collectionId,
      folderPath: folderPath?.join('/'),
      requestId: request.id,
      request: ensureRequestDefaults(request),
      readonly: false
    };
    vscode.commands.executeCommand(COMMAND_IDS.openRequest, requestContext);
  }

  openRequestContext(context: RequestContextInput): void {
    vscode.commands.executeCommand(COMMAND_IDS.openRequest, context);
  }

  openEnvironmentEditor(selectedEnvironment?: string): void {
    vscode.commands.executeCommand(COMMAND_IDS.editEnvironments, selectedEnvironment);
  }

  openCollectionEditor(collectionId: string): void {
    vscode.commands.executeCommand(COMMAND_IDS.editCollection, { collectionId });
  }

  refreshCollections(): void {
    this.refreshCollectionsCallback();
  }

  refreshEnvironments(): void {
    this.refreshEnvironmentsCallback();
  }
}
