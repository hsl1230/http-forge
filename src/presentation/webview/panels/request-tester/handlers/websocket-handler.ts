import type {
  ExecutionRequest,
  ICollectionService,
  RequestContext,
  IDisposable,
  IEnvironmentConfigService,
  IRequestPreparer,
  ISocketIoClient,
  ISocketIoConnection,
  SocketIoConnectOptions,
  SocketIoEvent,
  IWebSocketClient,
  IWebSocketConnection,
  WebSocketConnectOptions,
  WebSocketMessageFormat,
  WebSocketRunFrame,
  WebSocketRunTranscript,
} from '@http-forge/core';
import type { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { resolveInheritedAuth } from '../../../shared/auth-resolution';
import type { IPanelContextProvider, UIRequest } from '../interfaces';
import { confirmProductionRequest } from './production-guard';
import { findRequestInCollection, resolveParamsToStrings } from './request-context-utils';
import { getServiceContainer } from '../../../../../infrastructure/services/service-container';


interface WebSocketSendMessage {
  type?: 'text' | 'binary';
  format?: WebSocketMessageFormat;
  encoding?: 'base64' | 'hex';
  data?: string;
  event?: string;
  args?: string[];
  ack?: boolean;
}

/**
 * Owns the WebSocket connection for a single Request Tester panel.
 *
 * The webview never opens a socket itself: the extension host prepares the
 * request through the same environment/header/auth pipeline as HTTP, then
 * streams frames back to the webview. Raw WebSocket and Socket.IO share this
 * orchestration boundary; Socket.IO-specific behavior lives in
 * `SocketIoClientAdapter`.
 */
export class WebSocketHandler implements IMessageHandler, IDisposable {
  private connection?: IWebSocketConnection;
  private socketIoConnection?: ISocketIoConnection;
  private frames: WebSocketRunFrame[] = [];
  private lastRequest?: ExecutionRequest;
  private lastCollection?: any;
  private lastEnvironment?: string;
  private lastResolvedEnv?: any;
  private postResponseRan = false;
  private messenger?: IWebviewMessenger;
  private listeners: IDisposable[] = [];
  private connectionAttempt = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private manualDisconnect = false;
  private lastRawConnect?: WebSocketConnectOptions;

  constructor(
    private readonly envConfigService: IEnvironmentConfigService,
    private readonly requestPreparer: IRequestPreparer,
    private readonly webSocketClient: IWebSocketClient,
    private readonly contextProvider: IPanelContextProvider,
    private readonly collectionService: ICollectionService,
    private readonly socketIoClient?: ISocketIoClient
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
    this.manualDisconnect = true;
    this.connectionAttempt++;
    this.clearReconnectTimer();
    const connection = this.connection;
    const socketIo = this.socketIoConnection;
    this.connection = undefined;
    this.socketIoConnection = undefined;
    this.cleanupListeners();
    connection?.dispose();
    socketIo?.dispose();
  }

  private async connect(uiRequest: UIRequest, messenger: IWebviewMessenger): Promise<void> {
    const attempt = ++this.connectionAttempt;
    this.messenger = messenger;
    this.manualDisconnect = false;
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();
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

    let request: ExecutionRequest = {
      id: uiRequest.id || context?.requestId || 'standalone-ws',
      name: uiRequest.name || context?.request?.name || 'WebSocket Request',
      requestType: 'websocket',
      method: 'GET',
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

    const initialProtocol = request.websocket?.protocol === 'socketio' ? 'socketio' : 'websocket';

    try {
      request = await this.runPreRequestScripts(request, context, collection, environment, resolvedEnv);
    } catch (error) {
      if (attempt === this.connectionAttempt) {
        this.postError(this.messageOf(error));
        this.post({ command: 'wsState', state: 'closed', transport: initialProtocol });
      }
      return;
    }

    this.lastRequest = request;
    this.lastCollection = collection;
    this.lastEnvironment = environment;
    this.lastResolvedEnv = resolvedEnv;
    this.frames = [];
    this.postResponseRan = false;

    const protocol = request.websocket?.protocol === 'socketio' ? 'socketio' : 'websocket';

    try {
      const prepared = await this.requestPreparer.prepareRequest(request, environment, resolvedEnv);
      if (attempt !== this.connectionAttempt) {
        return;
      }
      this.post({ command: 'wsState', state: 'connecting', url: prepared.url, transport: protocol });

      if (protocol === 'socketio') {
        await this.openSocketIo(prepared, request, attempt);
      } else {
        await this.openRaw(prepared, request, attempt);
      }
    } catch (error) {
      if (attempt !== this.connectionAttempt) {
        return;
      }
      this.postError(this.messageOf(error));
      this.post({ command: 'wsState', state: 'closed', transport: protocol });
    }
  }

  private async runPreRequestScripts(
    request: ExecutionRequest,
    context: any,
    collection: any,
    environment: string,
    resolvedEnv: any
  ): Promise<ExecutionRequest> {
    const scripts = request.scripts?.preRequest;
    const hasScripts = Array.isArray(scripts) ? scripts.length > 0 : !!scripts;
    if (!hasScripts) {
      return request;
    }

    const scriptExecutor = getServiceContainer().scriptExecutor;
    const cookieJar = getServiceContainer().persistentCookieJar;
    const envVars = resolvedEnv?.variables || {};

    const requestContext: RequestContext = {
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      params: request.params,
      query: request.query,
      settings: request.settings,
      scripts: request.scripts,
      auth: request.auth,
    };

    const session = scriptExecutor.createRequestSession({
      request: requestContext,
      variables: {},
      collectionVariables: {},
      globals: {},
      environmentVariables: envVars,
      environmentName: environment,
      info: {
        eventName: 'prerequest',
        requestName: request.name,
        requestId: request.id,
        collectionName: collection?.name || 'standalone',
      },
      iteration: 1,
      iterationCount: 1,
      cookieJar,
      onEnvironmentChange: async (action: 'set' | 'unset' | 'clear', key?: string, value?: string) => {
        if (action === 'set' && key && value !== undefined) {
          this.envConfigService.setEnvironmentVariable(key, value, environment);
        } else if (action === 'unset' && key) {
          this.envConfigService.deleteEnvironmentVariable(key, environment);
        } else if (action === 'clear') {
          this.envConfigService.clearEnvironmentVariables(environment);
        }
      },
    });

    const result = await session.executePreRequest(Array.isArray(scripts) ? scripts : [scripts as string]);
    if (!result.success) {
      throw new Error(result.error || 'Pre-request script failed');
    }

    let updated = { ...request };
    if (result.modifiedRequest) {
      if (result.modifiedRequest.url) {
        updated.url = result.modifiedRequest.url;
      }
      if (result.modifiedRequest.headers) {
        updated.headers = { ...(updated.headers ?? {}), ...result.modifiedRequest.headers };
      }
      if (result.modifiedRequest.query) {
        updated.query = result.modifiedRequest.query;
      }
      if (result.modifiedRequest.params) {
        updated.params = result.modifiedRequest.params;
      }
      if (result.modifiedRequest.body !== undefined) {
        updated.body = result.modifiedRequest.body;
      }
    }
    if (result.modifiedVariables) {
      for (const [key, value] of Object.entries(result.modifiedVariables)) {
        this.envConfigService.setEnvironmentVariable(key, value, environment);
      }
    }

    return updated;
  }

  private async openRaw(
    prepared: { url: string; headers: Record<string, string> },
    request: ExecutionRequest,
    attempt: number
  ): Promise<void> {
    const websocketSettings = request.websocket?.settings;
    const maxMessageSizeMb = websocketSettings?.maxMessageSizeMb ?? 0;
    const maxPayloadBytes = maxMessageSizeMb > 0
      ? Math.round(maxMessageSizeMb * 1024 * 1024)
      : undefined;
    const settings = websocketSettings?.handshakeTimeout && websocketSettings.handshakeTimeout > 0
      ? { ...request.settings, timeout: websocketSettings.handshakeTimeout }
      : request.settings;

    const connectOptions: WebSocketConnectOptions = {
      url: prepared.url,
      headers: prepared.headers,
      protocols: request.websocket?.subprotocols,
      settings,
      ...(maxPayloadBytes ? { maxPayloadBytes } : {}),
    };
    this.lastRawConnect = connectOptions;

    const connection = await this.webSocketClient.connect(connectOptions);
    if (attempt !== this.connectionAttempt) {
      connection.dispose();
      return;
    }

    this.connection = connection;
    this.reconnectAttempts = 0;
    this.bindConnection(connection, attempt, request);
    this.post({
      command: 'wsState',
      state: 'open',
      url: prepared.url,
      protocol: connection.negotiatedProtocol,
      transport: 'websocket',
    });
  }

  private async openSocketIo(
    prepared: { url: string; headers: Record<string, string> },
    request: ExecutionRequest,
    attempt: number
  ): Promise<void> {
    if (!this.socketIoClient) {
      throw new Error('Socket.IO transport is not available');
    }

    const websocketSettings = request.websocket?.settings;
    const socketIoConfig = request.websocket?.socketio;
    const reconnectionAttempts = websocketSettings?.reconnectionAttempts ?? 0;
    const options: SocketIoConnectOptions = {
      url: prepared.url,
      headers: prepared.headers,
      path: socketIoConfig?.handshakePath || '/socket.io',
      namespace: socketIoConfig?.namespace,
      auth: socketIoConfig?.auth,
      transports: socketIoConfig?.transports,
      timeout: websocketSettings?.handshakeTimeout ?? request.settings?.timeout,
      reconnectionAttempts,
      reconnectionDelay: websocketSettings?.reconnectionInterval ?? 5000,
      listeners: (socketIoConfig?.listeners || [])
        .filter(listener => listener.enabled !== false && listener.name.trim())
        .map(listener => listener.name),
    };

    const connection = await this.socketIoClient.connect(options);
    if (attempt !== this.connectionAttempt) {
      connection.dispose();
      return;
    }

    this.socketIoConnection = connection;
    this.bindSocketIo(connection, attempt, reconnectionAttempts);
    this.post({
      command: 'wsState',
      state: 'open',
      url: prepared.url,
      protocol: connection.id ? `socket.io ${connection.id}` : 'socket.io',
      transport: 'socketio',
    });
  }

  private async runPostResponseScripts(): Promise<void> {
    if (this.postResponseRan) {
      return;
    }
    this.postResponseRan = true;

    const request = this.lastRequest;
    const scripts = request?.scripts?.postResponse;
    const hasScripts = Array.isArray(scripts) ? scripts.length > 0 : !!scripts;
    if (!request || !hasScripts) {
      return;
    }

    const environment = this.lastEnvironment || this.envConfigService.getSelectedEnvironment();
    const resolvedEnv = this.lastResolvedEnv || this.envConfigService.getResolvedEnvironment(environment);
    const collection = this.lastCollection;
    const scriptExecutor = getServiceContainer().scriptExecutor;
    const cookieJar = getServiceContainer().persistentCookieJar;

    const transcript: WebSocketRunTranscript = {
      protocol: request.websocket?.protocol === 'socketio' ? 'socketio' : 'websocket',
      frames: this.frames,
      close: {
        code: 1000,
        reason: 'Client closed',
        wasClean: true,
      },
    };

    const session = scriptExecutor.createRequestSession({
      request: {
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: request.body,
        params: request.params,
        query: request.query,
        settings: request.settings,
        scripts: request.scripts,
        auth: request.auth,
      },
      variables: {},
      collectionVariables: {},
      globals: {},
      environmentVariables: resolvedEnv?.variables || {},
      environmentName: environment,
      info: {
        eventName: 'test',
        requestName: request.name,
        requestId: request.id,
        collectionName: collection?.name || 'standalone',
      },
      iteration: 1,
      iterationCount: 1,
      cookieJar,
      onEnvironmentChange: async (action: 'set' | 'unset' | 'clear', key?: string, value?: string) => {
        if (action === 'set' && key && value !== undefined) {
          this.envConfigService.setEnvironmentVariable(key, value, environment);
        } else if (action === 'unset' && key) {
          this.envConfigService.deleteEnvironmentVariable(key, environment);
        } else if (action === 'clear') {
          this.envConfigService.clearEnvironmentVariables(environment);
        }
      },
    });

    const responseContext = {
      executedRequest: {
        url: request.url,
        method: request.method,
        headers: request.headers || {},
        body: { type: 'none', content: null },
        params: request.params || {},
        query: request.query || {},
      } as any,
      status: 101,
      statusText: 'Switching Protocols',
      headers: {},
      body: transcript,
      cookies: [],
      responseTime: 0,
      responseSize: Buffer.byteLength(JSON.stringify(transcript), 'utf8'),
    };

    try {
      const result = await session.executePostResponse(
        Array.isArray(scripts) ? scripts : [scripts as string],
        responseContext
      );
      this.post({
        command: 'wsScriptResults',
        consoleOutput: result.consoleOutput || [],
        testResults: result.testResults || [],
      });
    } catch (error) {
      this.postError(this.messageOf(error));
    }
  }

  private async disconnect(messenger: IWebviewMessenger): Promise<void> {
    this.manualDisconnect = true;
    this.connectionAttempt++;
    this.clearReconnectTimer();
    this.messenger = messenger;

    const connection = this.connection;
    const socketIo = this.socketIoConnection;
    this.connection = undefined;
    this.socketIoConnection = undefined;
    this.cleanupListeners();

    if (socketIo) {
      socketIo.close();
      socketIo.dispose();
      this.post({ command: 'wsClosed', code: 1000, reason: 'Client closed', wasClean: true });
      this.post({ command: 'wsState', state: 'closed', transport: 'socketio' });
      void this.runPostResponseScripts();
      return;
    }

    if (!connection) {
      this.post({ command: 'wsState', state: 'closed' });
      return;
    }

    await connection.close(1000, 'Client closed');
    connection.dispose();

    // Listeners were detached before closing to suppress the reconnect path,
    // so report the terminal state explicitly for both open and connecting
    // sockets.
    this.post({ command: 'wsClosed', code: 1000, reason: 'Client closed', wasClean: true });
    this.post({ command: 'wsState', state: 'closed', transport: 'websocket' });
    void this.runPostResponseScripts();
  }

  private async send(message: WebSocketSendMessage, messenger: IWebviewMessenger): Promise<void> {
    this.messenger = messenger;
    if (this.socketIoConnection) {
      await this.sendSocketIo(message);
      return;
    }

    const connection = this.connection;
    if (!connection || connection.state !== 'open') {
      this.postError('WebSocket is not connected');
      return;
    }

    const type = message.type === 'binary' ? 'binary' : 'text';
    const data = message.data || '';
    const payload = type === 'binary' ? decodeBinary(data, message.encoding) : data;

    try {
      await connection.send(payload);
      const rawOutboundFrame: WebSocketRunFrame = {
        direction: 'out',
        type,
        data,
        encoding: type === 'binary' ? (message.encoding || 'base64') : undefined,
        size: type === 'binary' ? payload.length : Buffer.byteLength(data, 'utf8'),
        time: Date.now(),
      };
      this.frames.push(rawOutboundFrame);
      this.post({
        command: 'wsFrame',
        direction: 'out',
        type,
        format: message.format || (type === 'binary' ? 'binary' : detectTextFormat(data)),
        data,
        encoding: type === 'binary' ? (message.encoding || 'base64') : undefined,
        size: type === 'binary' ? payload.length : Buffer.byteLength(data, 'utf8'),
        time: Date.now(),
      });
    } catch (error) {
      this.postError(this.messageOf(error));
    }
  }

  private async sendSocketIo(message: WebSocketSendMessage): Promise<void> {
    const connection = this.socketIoConnection;
    if (!connection || !connection.connected) {
      this.postError('Socket.IO is not connected');
      return;
    }

    const event = message.event?.trim() || 'message';
    const type = message.type === 'binary' ? 'binary' : 'text';
    const data = message.data || '';
    const firstArg = type === 'binary' ? decodeBinary(data, message.encoding) : data;
    const args = [firstArg, ...(message.args || [])];

    try {
      // Show the outbound frame immediately. An acknowledgement can arrive
      // later (or never), and the composer should not appear to have dropped
      // the message while it waits.
      const sendResult = connection.send(event, args, message.ack === true);
      const socketIoOutbound: WebSocketRunFrame = {
        direction: 'out',
        type,
        data,
        encoding: type === 'binary' ? (message.encoding || 'base64') : undefined,
        event,
        args: (message.args || []).map(value => String(value)),
        ack: message.ack === true,
        size: Buffer.byteLength(data, 'utf8') + (message.args || []).reduce((total, value) => total + Buffer.byteLength(String(value), 'utf8'), 0),
        time: Date.now(),
      };
      this.frames.push(socketIoOutbound);
      this.post({
        command: 'wsFrame',
        direction: 'out',
        type,
        format: message.format || (type === 'binary' ? 'binary' : detectTextFormat(data)),
        data,
        encoding: type === 'binary' ? (message.encoding || 'base64') : undefined,
        args: (message.args || []).map(value => String(value)),
        event,
        ack: message.ack === true,
        size: Buffer.byteLength(data, 'utf8') + (message.args || []).reduce((total, value) => total + Buffer.byteLength(String(value), 'utf8'), 0),
        time: Date.now(),
      });
      const ack = await sendResult;
      if (message.ack && ack && ack.length > 0) {
        this.post({ command: 'wsInfo', message: `Acknowledgement: ${formatArgs(ack)}` });
      }
    } catch (error) {
      this.postError(this.messageOf(error));
    }
  }

  private bindConnection(connection: IWebSocketConnection, attempt: number, request: ExecutionRequest): void {
    this.listeners.push(
      connection.onFrame((frame) => {
        const data = frame.isBinary
          ? Buffer.from(frame.data as Uint8Array).toString('base64')
          : String(frame.data);
        this.frames.push({
          direction: 'in',
          type: frame.isBinary ? 'binary' : 'text',
          data,
          encoding: frame.isBinary ? 'base64' : undefined,
          size: frame.isBinary ? (frame.data as Uint8Array).byteLength : Buffer.byteLength(data, 'utf8'),
          time: Date.now(),
        });
        this.post({
          command: 'wsFrame',
          direction: 'in',
          type: frame.isBinary ? 'binary' : 'text',
          format: frame.isBinary ? 'binary' : detectTextFormat(data),
          encoding: frame.isBinary ? 'base64' : undefined,
          data,
          size: frame.isBinary ? (frame.data as Uint8Array).byteLength : Buffer.byteLength(data, 'utf8'),
          time: Date.now(),
        });
      }),
      connection.onClose((info) => {
        if (attempt !== this.connectionAttempt) {
          return;
        }
        this.post({ command: 'wsClosed', code: info.code, reason: info.reason, wasClean: info.wasClean });
        this.post({ command: 'wsState', state: 'closed', transport: 'websocket' });
        this.connection = undefined;
        this.cleanupListeners();
        this.scheduleReconnect(request);
      }),
      connection.onError((error) => {
        this.postError(this.messageOf(error));
      })
    );
  }

  private bindSocketIo(
    connection: ISocketIoConnection,
    attempt: number,
    reconnectionAttempts: number
  ): void {
    this.listeners.push(
      connection.onEvent((event) => {
        if (attempt !== this.connectionAttempt) {
          return;
        }
        this.postSocketIoFrame(event);
      }),
      connection.onConnect(() => {
        if (attempt !== this.connectionAttempt) {
          return;
        }
        this.post({
          command: 'wsState',
          state: 'open',
          protocol: connection.id ? `socket.io ${connection.id}` : 'socket.io',
          transport: 'socketio',
        });
      }),
      connection.onDisconnect((reason) => {
        if (attempt !== this.connectionAttempt) {
          return;
        }
        // socket.io-client owns reconnection. Keep the adapter and listeners
        // attached so the subsequent onConnect/event stream still reaches the
        // webview instead of being orphaned after a transient disconnect.
        this.post({ command: 'wsClosed', code: 1006, reason, wasClean: false });
        this.post({ command: 'wsState', state: 'closed', transport: 'socketio' });
        if (reconnectionAttempts > 0 && reason !== 'io server disconnect' && reason !== 'io client disconnect') {
          this.post({
            command: 'wsInfo',
            message: 'Socket.IO connection lost; reconnecting…',
            reconnecting: true,
          });
        }
      }),
      connection.onReconnectFailed(() => {
        if (attempt !== this.connectionAttempt) {
          return;
        }
        this.post({
          command: 'wsInfo',
          message: 'Socket.IO reconnection failed',
          reconnecting: false,
        });
      }),
      connection.onError((error) => {
        if (attempt !== this.connectionAttempt) {
          return;
        }
        this.postError(this.messageOf(error));
      })
    );
  }

  private postSocketIoFrame(event: SocketIoEvent): void {
    const first = event.args[0];
    const binary = isBinaryPayload(first);
    const data = event.args.length === 0
      ? ''
      : binary
        ? Buffer.from(first as Uint8Array).toString('base64')
        : typeof first === 'string'
          ? first
          : formatArgs([first]);
    const extraArgs = event.args.slice(1).map(value => formatArg(value));
    const size = binary
      ? (first as Uint8Array).byteLength
      : Buffer.byteLength(data, 'utf8') + extraArgs.reduce((total, value) => total + Buffer.byteLength(value, 'utf8'), 0);

    this.frames.push({
      direction: 'in',
      type: binary ? 'binary' : 'text',
      data,
      encoding: binary ? 'base64' : undefined,
      args: extraArgs,
      event: event.event,
      ack: false,
      size,
      time: Date.now(),
    });
    this.post({
      command: 'wsFrame',
      direction: 'in',
      type: binary ? 'binary' : 'text',
      format: binary ? 'binary' : detectTextFormat(data),
      encoding: binary ? 'base64' : undefined,
      data,
      args: extraArgs,
      event: event.event,
      size,
      time: Date.now(),
    });
  }

  private scheduleReconnect(request: ExecutionRequest): void {
    const settings = request.websocket?.settings;
    const maxAttempts = clamp(settings?.reconnectionAttempts ?? 0, 0, 100);
    if (this.manualDisconnect || !this.lastRawConnect || maxAttempts <= 0) {
      return;
    }
    if (this.reconnectAttempts >= maxAttempts) {
      this.post({
        command: 'wsInfo',
        message: `Reconnection stopped after ${maxAttempts} attempt${maxAttempts === 1 ? '' : 's'}`,
        reconnecting: false,
      });
      return;
    }

    const delay = clamp(settings?.reconnectionInterval ?? 5000, 0, 600000);
    const nextAttempt = ++this.reconnectAttempts;
    this.post({
      command: 'wsInfo',
      message: `Reconnecting in ${delay} ms (attempt ${nextAttempt}/${maxAttempts})`,
      reconnecting: true,
      attempt: nextAttempt,
      maxAttempts,
      delay,
    });

    const token = this.connectionAttempt;
    this.reconnectTimer = setTimeout(async () => {
      if (this.manualDisconnect || token !== this.connectionAttempt || !this.lastRawConnect) {
        return;
      }

      const reconnectToken = ++this.connectionAttempt;
      this.post({ command: 'wsState', state: 'connecting', transport: 'websocket' });
      try {
        const connection = await this.webSocketClient.connect(this.lastRawConnect);
        if (reconnectToken !== this.connectionAttempt) {
          connection.dispose();
          return;
        }
        this.connection = connection;
        this.reconnectAttempts = 0;
        this.bindConnection(connection, reconnectToken, request);
        this.post({
          command: 'wsState',
          state: 'open',
          url: this.lastRawConnect.url,
          protocol: connection.negotiatedProtocol,
          transport: 'websocket',
        });
      } catch (error) {
        if (reconnectToken !== this.connectionAttempt) {
          return;
        }
        this.postError(this.messageOf(error));
        this.scheduleReconnect(request);
      }
    }, delay);
  }

  private async closeExisting(reason: string): Promise<void> {
    this.clearReconnectTimer();
    const connection = this.connection;
    const socketIo = this.socketIoConnection;
    this.connection = undefined;
    this.socketIoConnection = undefined;
    this.cleanupListeners();
    if (connection) {
      await connection.close(1000, reason);
      connection.dispose();
    }
    if (socketIo) {
      socketIo.close();
      socketIo.dispose();
    }
  }

  private cleanupListeners(): void {
    for (const listener of this.listeners) {
      listener.dispose();
    }
    this.listeners = [];
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
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

function decodeBinary(data: string, encoding: 'base64' | 'hex' = 'base64'): Buffer {
  return encoding === 'hex' ? Buffer.from(data, 'hex') : Buffer.from(data, 'base64');
}

function isBinaryPayload(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(value));
}

function formatArgs(args: unknown[]): string {
  return args.map(value => formatArg(value)).join(' ');
}

function formatArg(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (isBinaryPayload(value)) {
    return `[binary ${value.byteLength} B]`;
  }
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value);
  }
}

function detectTextFormat(data: string): 'text' | 'json' | 'xml' | 'html' {
  const trimmed = data.trim();
  if (/^[\[{]/.test(trimmed)) {
    return 'json';
  }
  if (/^<\?xml\b/i.test(trimmed)) {
    return 'xml';
  }
  if (/^<(!doctype|html|[a-z][\w-]*(\s|>|\/))/i.test(trimmed)) {
    return 'html';
  }
  return 'text';
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
