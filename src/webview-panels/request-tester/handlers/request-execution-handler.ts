import { CollectionRequestExecutor, type ExecutionRequest, type IAsyncCookieService, IEnvironmentConfigService, type IHttpRequestService, type IRequestHistoryService, IRequestPreparer, type IScriptExecutor, type PathParamEntry, type PreparedRequest, type RequestScripts } from '@http-forge/core';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../../services/service-container';
import { RequestContext } from '../../../shared/utils';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';
import { HistoryUIEntry, IPanelContextProvider, UIRequest } from '../interfaces';
import { EnvironmentSelectionHandler } from './environment-handler';

/** Resolve PathParamEntry map to plain Record<string, string> for execution */
function resolveParamsToStrings(
  params?: Record<string, string | PathParamEntry>
): Record<string, string> | undefined {
  if (!params) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    result[key] = typeof value === 'string' ? value : (value.value ?? '');
  }
  return result;
}

/**
 * Handles HTTP request execution
 * Single Responsibility: Only manages sending requests and processing responses
 * Dependency Inversion: Uses IRequestPreparer for request preparation, IScriptExecutor for scripts
 */
export class RequestExecutionHandler implements IMessageHandler {
  private currentAbortController?: AbortController;
  private readonly scriptExecutor: IScriptExecutor;
  private readonly requestPreparer: IRequestPreparer;

  constructor(
    private envConfigService: IEnvironmentConfigService,
    private httpService: IHttpRequestService,
    private historyService: IRequestHistoryService,
    private cookieService: IAsyncCookieService,
    private contextProvider: IPanelContextProvider,
    private environmentHandler: EnvironmentSelectionHandler,
    scriptExecutorInstance?: IScriptExecutor,
    requestPreparerInstance?: IRequestPreparer
  ) {
    // Dependency Injection: get from container or use provided instance (for testing)
    this.scriptExecutor = scriptExecutorInstance ?? getServiceContainer().scriptExecutor;
    this.requestPreparer = requestPreparerInstance ?? getServiceContainer().requestPreparer;
  }

  getSupportedCommands(): string[] {
    return ['sendRequest', 'cancelRequest', 'sendHttpRequest'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    switch (command) {
      case 'sendRequest':
        await this.handleSendRequest(message.request, messenger);
        return true;

      case 'cancelRequest':
        this.handleCancelRequest();
        return true;

      case 'sendHttpRequest':
        await this.handleSendHttpRequest(message.requestId, message.options, messenger);
        return true;

      default:
        return false;
    }
  }

  private async handleSendRequest(request: UIRequest, messenger: IWebviewMessenger): Promise<void> {
    const environment = this.envConfigService.getSelectedEnvironment();
    const resolvedEnv = this.envConfigService.getResolvedEnvironment(environment);
    const context = this.contextProvider.getCurrentContext();

    if (!resolvedEnv) {
      messenger.postMessage({ command: 'requestError', error: 'No environment configured' });
      return;
    }

    if (resolvedEnv.requiresConfirmation) {
      const confirm = await vscode.window.showWarningMessage(
        `You are about to send a request to PRODUCTION (${environment}). Are you sure?`,
        { modal: true },
        'Yes, Send Request'
      );
      if (confirm !== 'Yes, Send Request') {
        return;
      }
    }

    try {
      await this.executeWithCollectionContext(request, context!, environment, messenger);
    } catch (error: any) {
      this.handleRequestError(error, messenger);
    } finally {
      this.currentAbortController = undefined;
    }
  }

  /**
   * Execute request with collection context - runs collection/folder/request scripts
   * Matches Postman behavior where all scripts in the hierarchy are executed
   */
  private async executeWithCollectionContext(
    uiRequest: UIRequest,
    context: RequestContext,
    environment: string,
    messenger: IWebviewMessenger
  ): Promise<void> {

    const collectionService = getServiceContainer().collection;
    const collection = collectionService.getCollection(context.collectionId!);

    // Find the request in the collection to get folder scripts chain
    const requestData = this.findRequestInCollection(collection, context.requestId!);
    const folderScriptsChain = requestData?.folderScriptsChain || [];
    const collectionScripts = collection?.scripts;

    // Create cookie jar adapter
    const cookieJar = getServiceContainer().persistentCookieJar;

    // Create callback to log console output to VS Code output channel
    const consoleService = getServiceContainer().console;
    const onConsoleOutput = (output: string[]) => {
      consoleService.logRawLines(output, 'Script');
    };

    // Provide collection name so scripts can access pm.info.collectionName
    // (collection object was available earlier in this scope)
    // Note: we can't change the previous executor variable, so recreate with collection name
    const executorWithCollectionName = new CollectionRequestExecutor(
      this.httpService,
      this.scriptExecutor,
      this.envConfigService,
      this.requestPreparer,
      environment,
      cookieJar,
      collectionScripts,
      folderScriptsChain,
      onConsoleOutput,
      collection?.name || context.collectionName || 'standalone'
    );

    this.currentAbortController = new AbortController();

    // Build ExecutionRequest format expected by executor
    // Normalize authType to the allowed union so it matches the CollectionRequest type
    const allowedAuthTypes = ['none', 'inherit', 'basic', 'bearer', 'apikey', 'oauth2'] as const;
    const authType = (uiRequest.auth?.type && (allowedAuthTypes as readonly string[]).includes(uiRequest.auth.type))
      ? (uiRequest.auth.type as 'none' | 'inherit' | 'basic' | 'bearer' | 'apikey' | 'oauth2')
      : undefined;

    const request: ExecutionRequest = {
      id: uiRequest.id || context?.requestId || 'standalone',
      name: uiRequest.name || context?.request?.name || 'Request',
      method: uiRequest.method || context?.request?.method || 'GET',
      url: uiRequest.path || context?.request?.url || '',
      // Execution path always receives Record<string, string> from webview's request-builder.js
      headers: uiRequest.headers as Record<string, string> | undefined,
      query: uiRequest.query as Record<string, string> | undefined,
      params: (uiRequest.params as Record<string, string> | undefined) || resolveParamsToStrings(context?.request?.params),
      body: uiRequest.body !== null && uiRequest.body !== undefined ? uiRequest.body : context?.request?.body,
      scripts: uiRequest.scripts || context?.request?.scripts,
      settings: uiRequest.settings || context?.request?.settings,
      // include authorization info so CollectionRequestExecutor can apply auth
      auth: {
        type: authType === 'inherit' ? 'none' : authType,
        bearerToken: uiRequest.auth?.bearerToken,
        basicAuth: uiRequest.auth?.basicAuth,
        apikey: uiRequest.auth?.apikey,
        oauth2: uiRequest.auth?.oauth2
      }
    };

    // Execute the request
    const result = await executorWithCollectionName.execute(
      request,
      {}, // variables - can be extended
      this.currentAbortController.signal
    );

    // Extract cookies from response headers (only if headers exist)
    const domain = this.extractDomain(result.executedRequest.url);
    const responseCookies = result.response.headers
      ? this.cookieService.parseCookieHeaders(
        result.response.headers,
        domain
      )
      : [];

    // Process the result - build response format for webview
    const response = {
      status: result.response.status,
      statusText: result.response.statusText,
      headers: result.response.headers,
      body: result.response.body,
      time: result.duration,
      cookies: responseCookies
    };

    // Collect console output from assertions
    const consoleOutput: string[] = [];
    const testResults = result.assertions || [];

    // Store cookies and notify webview
    if (responseCookies.length > 0) {
      await this.cookieService.setFromResponse(responseCookies);
      messenger.postMessage({
        command: 'cookiesLoaded',
        cookies: this.cookieService.getAll()
      });
    }

    const sentRequest = result.executedRequest;

    // Save to history
    const history = await this.saveToHistory(request, response, environment, sentRequest, context, uiRequest.saveResponse || false);

    // Flush all pending cookie operations before sending final response
    if (cookieJar.flush) {
      await cookieJar.flush();
    }

    messenger.postMessage({
      command: 'requestComplete',
      data: {
        response,
        history,
        sentRequest,
        scriptResults: {
          consoleOutput,
          testResults,
          visualizerData: result.visualizerData
        }
      }
    });
  }

  /**
   * Find a request in a collection and return its folder scripts chain
   */
  private findRequestInCollection(
    collection: any,
    requestId: string
  ): { request: any; folderScriptsChain: RequestScripts[] } | undefined {
    const items = collection?.items || [];
    return this.searchItemsForRequest(items, requestId, []);
  }

  /**
   * Recursively search for a request in collection items
   */
  private searchItemsForRequest(
    items: any[],
    requestId: string,
    currentScripts: RequestScripts[]
  ): { request: any; folderScriptsChain: RequestScripts[] } | undefined {
    for (const item of items) {
      if (item.type === 'folder' || item.items) {
        // It's a folder - add its scripts to the chain
        const newScripts = item.scripts
          ? [...currentScripts, item.scripts]
          : currentScripts;

        const found = this.searchItemsForRequest(item.items || [], requestId, newScripts);
        if (found) return found;
      } else if (item.id === requestId) {
        // Found the request
        return {
          request: item,
          folderScriptsChain: currentScripts
        };
      }
    }
    return undefined;
  }

  /**
   * Convert headers/query object to key-value array format
   */
  private convertToKeyValueArray(obj: Record<string, string> | undefined): Array<{ key: string; value: string; enabled: boolean }> {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true
    }));
  }

  private async handleResponseCookies(
    headers: Record<string, string | string[]>,
    domain: string,
    messenger: IWebviewMessenger
  ): Promise<void> {
    const responseCookies = this.cookieService.parseCookieHeaders(headers, domain);
    if (responseCookies.length > 0) {
      await this.cookieService.setFromResponse(responseCookies);
      messenger.postMessage({
        command: 'cookiesLoaded',
        cookies: this.cookieService.getAll()
      });
    }
  }

  private async saveToHistory(
    request: ExecutionRequest,
    response: any,
    environment: string,
    sentRequest: PreparedRequest,
    // originalBody: RequestBody | null,
    context: RequestContext | undefined,
    saveResponse: boolean
  ): Promise<HistoryUIEntry[]> {
    const historyPath = this.contextProvider.getHistoryStoragePath();
    if (!historyPath || !context) {
      return [];
    }

    const ticket = context.group?.ticket || null;
    const branch = context.group?.branch || 'unknown';

    const historyEntry = this.historyService.addEntry(
      historyPath.environment,
      historyPath.requestPath,
      historyPath.requestId,
      sentRequest.method,
      {
        ticket,
        branch,
        environment,
        // Actual HTTP request sent (what http/https module received)
        sentRequest,
        // Original UI configuration (for reference) - uses combined body format
        originalConfig: {
          path: request.url || context?.request?.url || '',
          params: request.params || {},
          query: request.query || {},
          headers: request.headers || {},
          body: request.body || null
        },
        settings: request.settings,
        scripts: request.scripts,
        response: {
          status: response.status,
          statusText: response.statusText,
          time: response.time
        }
      }
    );

    if (saveResponse) {
      this.historyService.saveFullResponse(
        historyPath.environment,
        historyPath.requestPath,
        historyPath.requestId,
        historyEntry.id,
        {
          timestamp: Date.now(),
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          cookies: response.cookies,
          body: response.body,
          time: response.time
        }
      );
    }

    return this.environmentHandler.getHistoryForUI(
      historyPath.environment,
      historyPath.requestPath,
      historyPath.requestId
    );
  }

  private handleCancelRequest(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = undefined;
    }
  }

  private handleRequestError(error: any, messenger: IWebviewMessenger): void {
    if (error.name === 'AbortError' || error.message === 'Request cancelled') {
      messenger.postMessage({ command: 'requestCancelled' });
    } else {
      messenger.postMessage({
        command: 'requestError',
        error: error.message || 'Request failed'
      });
    }
  }

  private async handleSendHttpRequest(
    requestId: string,
    options: { url: string; method?: string; headers?: Record<string, string>; body?: any },
    messenger: IWebviewMessenger
  ): Promise<void> {
    try {
      const response = await this.httpService.execute({
        method: (options.method || 'GET') as any,
        url: options.url,
        headers: options.headers || {},
        body: options.body
      });

      messenger.postMessage({
        command: 'sendRequestResponse',
        requestId,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body,
          time: response.time
        }
      });
    } catch (error) {
      messenger.postMessage({
        command: 'sendRequestResponse',
        requestId,
        error: error instanceof Error ? error.message : 'Request failed'
      });
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
}
