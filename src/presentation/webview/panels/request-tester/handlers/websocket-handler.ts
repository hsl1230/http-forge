import type {
  ExecutionRequest,
  ICollectionService,
  IDisposable,
  IEnvironmentConfigService,
  IRequestPreparer,
  IWebSocketClient,
  IWebSocketConnection,
} from '@http-forge/core';
import type { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { resolveInheritedAuth } from '../../../shared/auth-resolution';
import type { IPanelContextProvider, UIRequest } from '../interfaces';
import { confirmProductionRequest } from './production-guard';
import { findRequestInCollection, resolveParamsToStrings } from './request-context-utils';

interface WebSocketSendMessage {
  type?: 'text' | 'binary';
  data?: string;
}

/**
 * Owns the WebSocket connection for a single Request Tester panel.
 *
 * The webview never opens a socket itself: the extension host prepares the
 * request through the same environment/header/auth pipeline as HTTP, then
 * streams frames back to the webview.
 */
export class WebSocketHandler implements IMessageHandler, IDisposable {
  private connection?: IWebSocketConnection;
  private messenger?: IWebviewMessenger;
  private listeners: IDisposable[] = [];
  private connectionAttempt = 0;

  constructor(
    private readonly envConfigService: IEnvironmentConfigService,
    private readonly requestPreparer: IRequestPreparer,
    private readonly webSocketClient: IWebSocketClient,
    private readonly contextProvider: IPanelContextProvider,
    private readonly collectionService: ICollectionService
  ) {}

  getSupportedCommands(): string[] {
    return ['wsConnect', 'wsDisconnect', 'wsSend'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    switch (command) {
      case 'wsConnect':
        await this.connect(message.request as UIRequest, messenger);
        return true;

      case 'wsDisconnect':
        await this.disconnect(messenger);
        return true;

      case 'wsSend':
        await this.send(message as WebSocketSendMessage, messenger);
        return true;

      default:
        return false;
    }
  }

  dispose(): void {
    this.connectionAttempt++;
    const connection = this.connection;
    this.connection = undefined;
    this.cleanupListeners();
    connection?.dispose();
  }

  private async connect(uiRequest: UIRequest, messenger: IWebviewMessenger): Promise<void> {
    const attempt = ++this.connectionAttempt;
    this.messenger = messenger;
    await this.closeExisting('Reconnecting');
    if (attempt !== this.connectionAttempt) {
      return;
    }

    const environment = this.envConfigService.getSelectedEnvironment();
    const resolvedEnv = this.envConfigService.getResolvedEnvironment(environment);
    if (!resolvedEnv) {
      this.postError('No environment configured');
      this.post({ command: 'wsState', state: 'closed' });
      return;
    }

    if (!(await confirmProductionRequest(environment, resolvedEnv))) {
      if (attempt === this.connectionAttempt) {
        this.post({ command: 'wsState', state: 'closed' });
      }
      return;
    }

    if (attempt !== this.connectionAttempt) {
      return;
    }

    const context = this.contextProvider.getCurrentContext();
    const collection = context?.collectionId
      ? this.collectionService.getCollection(context.collectionId)
      : undefined;
    const lookup = context?.requestId
      ? findRequestInCollection(collection, context.requestId)
      : undefined;

    const request: ExecutionRequest = {
      id: uiRequest.id || context?.requestId || 'standalone-ws',
      name: uiRequest.name || context?.request?.name || 'WebSocket Request',
      method: 'WS',
      url: uiRequest.path || uiRequest.url || context?.request?.url || '',
      headers: uiRequest.headers as Record<string, string> | undefined,
      query: uiRequest.query as Record<string, string> | undefined,
      params: resolveParamsToStrings(uiRequest.params) ?? resolveParamsToStrings(context?.request?.params),
      settings: uiRequest.settings || context?.request?.settings,
      auth: resolveInheritedAuth(
        uiRequest.auth || context?.request?.auth,
        lookup?.folderAuthChain || [],
        collection?.auth
      ),
      websocket: uiRequest.websocket || context?.request?.websocket,
    };

    try {
      const prepared = await this.requestPreparer.prepareRequest(request, environment, resolvedEnv);
      if (attempt !== this.connectionAttempt) {
        return;
      }
      this.post({ command: 'wsState', state: 'connecting', url: prepared.url });

      const connection = await this.webSocketClient.connect({
        url: prepared.url,
        headers: prepared.headers,
        protocols: request.websocket?.subprotocols,
        settings: request.settings,
      });

      if (attempt !== this.connectionAttempt) {
        connection.dispose();
        return;
      }

      this.connection = connection;
      this.bindConnection(connection);
      this.post({
        command: 'wsState',
        state: 'open',
        url: prepared.url,
        protocol: connection.negotiatedProtocol,
      });
    } catch (error) {
      if (attempt !== this.connectionAttempt) {
        return;
      }
      this.postError(this.messageOf(error));
      this.post({ command: 'wsState', state: 'closed' });
    }
  }

  private async disconnect(messenger: IWebviewMessenger): Promise<void> {
    this.connectionAttempt++;
    this.messenger = messenger;
    const connection = this.connection;
    if (!connection) {
      this.post({ command: 'wsState', state: 'closed' });
      return;
    }

    const wasConnecting = connection.state === 'connecting';
    await connection.close(1000, 'Client closed');

    // Closing a socket that has not completed its handshake resolves without a
    // close event, so report the terminal state explicitly.
    if (wasConnecting) {
      this.post({ command: 'wsClosed', code: 1000, reason: 'Client closed', wasClean: true });
      this.post({ command: 'wsState', state: 'closed' });
      this.connection = undefined;
      this.cleanupListeners();
    }
  }

  private async send(message: WebSocketSendMessage, messenger: IWebviewMessenger): Promise<void> {
    this.messenger = messenger;
    const connection = this.connection;
    if (!connection || connection.state !== 'open') {
      this.postError('WebSocket is not connected');
      return;
    }

    const type = message.type === 'binary' ? 'binary' : 'text';
    const data = message.data || '';
    const payload = type === 'binary' ? Buffer.from(data, 'base64') : data;

    try {
      await connection.send(payload);
      this.post({
        command: 'wsFrame',
        direction: 'out',
        type,
        data,
        size: type === 'binary' ? payload.length : Buffer.byteLength(data, 'utf8'),
        time: Date.now(),
      });
    } catch (error) {
      this.postError(this.messageOf(error));
    }
  }

  private bindConnection(connection: IWebSocketConnection): void {
    this.listeners.push(
      connection.onFrame((frame) => {
        const data = frame.isBinary
          ? Buffer.from(frame.data as Uint8Array).toString('base64')
          : String(frame.data);
        this.post({
          command: 'wsFrame',
          direction: 'in',
          type: frame.isBinary ? 'binary' : 'text',
          data,
          size: frame.isBinary ? (frame.data as Uint8Array).byteLength : Buffer.byteLength(data, 'utf8'),
          time: Date.now(),
        });
      }),
      connection.onClose((info) => {
        this.post({ command: 'wsClosed', code: info.code, reason: info.reason, wasClean: info.wasClean });
        this.post({ command: 'wsState', state: 'closed' });
        this.connection = undefined;
        this.cleanupListeners();
      }),
      connection.onError((error) => {
        this.postError(this.messageOf(error));
      })
    );
  }

  private async closeExisting(reason: string): Promise<void> {
    const connection = this.connection;
    this.connection = undefined;
    this.cleanupListeners();
    if (connection) {
      await connection.close(1000, reason);
      connection.dispose();
    }
  }

  private cleanupListeners(): void {
    for (const listener of this.listeners) {
      listener.dispose();
    }
    this.listeners = [];
  }

  private post(message: unknown): void {
    this.messenger?.postMessage(message);
  }

  private postError(error: string): void {
    this.post({ command: 'wsError', error });
  }

  private messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
