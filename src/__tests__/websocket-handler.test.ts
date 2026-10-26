import { beforeEach, describe, expect, jest, it } from '@jest/globals';
import type { IWebSocketConnection, WebSocketFrame } from '@http-forge/core';
import { WebSocketHandler } from '../presentation/webview/panels/request-tester/handlers/websocket-handler';

function createHarness() {
  let frameListener: ((frame: WebSocketFrame) => void) | undefined;
  let closeListener: ((info: { code: number; reason: string; wasClean: boolean }) => void) | undefined;
  let errorListener: ((error: Error) => void) | undefined;

  const connection = {
    state: 'open',
    negotiatedProtocol: 'chat',
    send: jest.fn(async () => undefined),
    close: jest.fn(async () => undefined),
    dispose: jest.fn(),
    onFrame: jest.fn((listener: (frame: WebSocketFrame) => void) => {
      frameListener = listener;
      return { dispose: jest.fn() };
    }),
    onClose: jest.fn((listener: (info: { code: number; reason: string; wasClean: boolean }) => void) => {
      closeListener = listener;
      return { dispose: jest.fn() };
    }),
    onError: jest.fn((listener: (error: Error) => void) => {
      errorListener = listener;
      return { dispose: jest.fn() };
    }),
  } as unknown as IWebSocketConnection;

  const envConfigService = {
    getSelectedEnvironment: jest.fn(() => 'dev'),
    getResolvedEnvironment: jest.fn(() => ({ variables: {} })),
  };
  const requestPreparer = {
    prepareRequest: jest.fn(async () => ({
      url: 'wss://resolved.example.test/socket',
      headers: { Authorization: 'Bearer resolved' },
    })),
  };
  const webSocketClient = {
    connect: jest.fn(async () => connection),
  };
  const collectionService = {
    getCollection: jest.fn(() => ({
      id: 'collection-1',
      name: 'Sockets',
      items: [
        {
          id: 'folder-1',
          type: 'folder',
          name: 'Authenticated',
          auth: { type: 'bearer', bearerToken: 'folder-token' },
          items: [
            {
              id: 'request-1',
              type: 'request',
              name: 'Chat',
              requestType: 'websocket',
              method: 'GET',
              url: '/socket',
              auth: { type: 'inherit' },
            },
          ],
        },
      ],
    })),
  };
  const contextProvider = {
    getCurrentContext: jest.fn(() => ({ collectionId: 'collection-1', requestId: 'request-1' })),
  };
  const messenger = { postMessage: jest.fn() };

  const handler = new WebSocketHandler(
    envConfigService as any,
    requestPreparer as any,
    webSocketClient as any,
    contextProvider as any,
    collectionService as any
  );

  return {
    handler,
    connection,
    requestPreparer,
    webSocketClient,
    messenger,
    getFrameListener: () => frameListener,
    getCloseListener: () => closeListener,
    getErrorListener: () => errorListener,
  };
}

function createSocketIoHarness() {
  let eventListener: ((event: { event: string; args: unknown[] }) => void) | undefined;
  let connectListener: (() => void) | undefined;
  let disconnectListener: ((reason: string) => void) | undefined;
  let reconnectFailedListener: (() => void) | undefined;
  let errorListener: ((error: Error) => void) | undefined;

  const socketIoConnection = {
    connected: true,
    id: 'socket-1',
    send: jest.fn(async (..._args: unknown[]) => ['ack-ok']),
    close: jest.fn(),
    dispose: jest.fn(),
    onEvent: jest.fn((listener: (event: { event: string; args: unknown[] }) => void) => {
      eventListener = listener;
      return { dispose: jest.fn() };
    }),
    onConnect: jest.fn((listener: () => void) => {
      connectListener = listener;
      return { dispose: jest.fn() };
    }),
    onDisconnect: jest.fn((listener: (reason: string) => void) => {
      disconnectListener = listener;
      return { dispose: jest.fn() };
    }),
    onReconnectFailed: jest.fn((listener: () => void) => {
      reconnectFailedListener = listener;
      return { dispose: jest.fn() };
    }),
    onError: jest.fn((listener: (error: Error) => void) => {
      errorListener = listener;
      return { dispose: jest.fn() };
    }),
  };

  const envConfigService = {
    getSelectedEnvironment: jest.fn(() => 'dev'),
    getResolvedEnvironment: jest.fn(() => ({ variables: {} })),
  };
  const requestPreparer = {
    prepareRequest: jest.fn(async () => ({
      url: 'wss://resolved.example.test/socket',
      headers: { Authorization: 'Bearer resolved' },
    })),
  };
  const socketIoClient = {
    connect: jest.fn(async () => socketIoConnection),
  };
  const collectionService = {
    getCollection: jest.fn(() => undefined),
  };
  const contextProvider = {
    getCurrentContext: jest.fn(() => undefined),
  };
  const messenger = { postMessage: jest.fn() };

  const handler = new WebSocketHandler(
    envConfigService as any,
    requestPreparer as any,
    { connect: jest.fn() } as any,
    contextProvider as any,
    collectionService as any,
    socketIoClient as any
  );

  return {
    handler,
    socketIoConnection,
    socketIoClient,
    requestPreparer,
    messenger,
    getEventListener: () => eventListener,
    getConnectListener: () => connectListener,
    getDisconnectListener: () => disconnectListener,
    getReconnectFailedListener: () => reconnectFailedListener,
    getErrorListener: () => errorListener,
  };
}

const socketIoRequest = {
  id: 'request-1',
  name: 'Chat',
  requestType: 'websocket' as const,
  method: 'GET',
  path: '/socket',
  settings: { strictSSL: false },
  websocket: {
    protocol: 'socketio' as const,
    settings: {
      handshakeTimeout: 9000,
      reconnectionAttempts: 3,
      reconnectionInterval: 700,
    },
    socketio: {
      clientVersion: '4',
      handshakePath: '/custom-socket',
      listeners: [
        { id: 'l1', name: 'chat.message', enabled: true },
        { id: 'l2', name: 'ignored.event', enabled: false },
      ],
    },
  },
};

const uiRequest = {
  id: 'request-1',
  name: 'Chat',
  requestType: 'websocket' as const,
  method: 'GET',
  path: '/socket',
  headers: { 'X-Trace': 'abc' },
  auth: { type: 'inherit' as const },
  settings: { strictSSL: false },
  websocket: {
    subprotocols: ['chat'],
    settings: { reconnectionAttempts: 0 },
    messages: [{ id: 'm1', type: 'text' as const, data: 'hello' }],
  },
};

describe('WebSocketHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prepares the request through the shared pipeline and opens the socket', async () => {
    const harness = createHarness();
    const { handler, messenger, requestPreparer, webSocketClient } = harness;

    await handler.handle('wsConnect', { request: uiRequest }, messenger as any);

    expect(requestPreparer.prepareRequest as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestType: 'websocket',
        method: 'GET',
        url: '/socket',
        auth: { type: 'bearer', bearerToken: 'folder-token' },
        websocket: uiRequest.websocket,
      }),
      'dev',
      expect.objectContaining({ variables: {} })
    );
    expect(webSocketClient.connect as jest.Mock).toHaveBeenCalledWith({
      url: 'wss://resolved.example.test/socket',
      headers: { Authorization: 'Bearer resolved' },
      protocols: ['chat'],
      settings: { strictSSL: false },
    });
    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsState', state: 'open', protocol: 'chat' })
    );
  });

  it('forwards text and binary frames as base64-compatible payloads', async () => {
    const harness = createHarness();
    const { handler, messenger, getFrameListener } = harness;

    await handler.handle('wsConnect', { request: uiRequest }, messenger as any);
    getFrameListener()?.({ data: new Uint8Array([1, 2, 3]), isBinary: true });
    getFrameListener()?.({ data: 'hello', isBinary: false });

    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsFrame', direction: 'in', type: 'binary', data: 'AQID', size: 3 })
    );
    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsFrame', direction: 'in', type: 'text', data: 'hello', size: 5 })
    );
  });

  it('sends text and decodes base64 binary payloads', async () => {
    const harness = createHarness();
    const { handler, messenger, connection } = harness;

    await handler.handle('wsConnect', { request: uiRequest }, messenger as any);
    await handler.handle('wsSend', { type: 'text', data: 'café' }, messenger as any);
    await handler.handle('wsSend', { type: 'binary', data: 'AQID' }, messenger as any);

    expect(connection.send).toHaveBeenNthCalledWith(1, 'café');
    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsFrame', direction: 'out', type: 'text', data: 'café', size: 5 })
    );
    const binary = (connection.send as jest.Mock).mock.calls[1][0] as Buffer;
    expect(Array.from(binary)).toEqual([1, 2, 3]);
    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsFrame', direction: 'out', type: 'binary', data: 'AQID', size: 3 })
    );
  });

  it('applies WebSocket handshake timeout and max message size to the transport', async () => {
    const harness = createHarness();
    const { handler, messenger, webSocketClient } = harness;
    const request = {
      ...uiRequest,
      websocket: {
        ...uiRequest.websocket,
        settings: {
          reconnectionAttempts: 0,
          handshakeTimeout: 12000,
          maxMessageSizeMb: 2,
        },
      },
    };

    await handler.handle('wsConnect', { request }, messenger as any);

    expect(webSocketClient.connect as jest.Mock).toHaveBeenCalledWith({
      url: 'wss://resolved.example.test/socket',
      headers: { Authorization: 'Bearer resolved' },
      protocols: ['chat'],
      settings: { strictSSL: false, timeout: 12000 },
      maxPayloadBytes: 2 * 1024 * 1024,
    });
  });

  it('decodes hexadecimal binary payloads', async () => {
    const harness = createHarness();
    const { handler, messenger, connection } = harness;

    await handler.handle('wsConnect', { request: uiRequest }, messenger as any);
    await handler.handle(
      'wsSend',
      { type: 'binary', format: 'binary', encoding: 'hex', data: '0102ff' },
      messenger as any
    );

    const binary = (connection.send as jest.Mock).mock.calls[0][0] as Buffer;
    expect(Array.from(binary)).toEqual([1, 2, 255]);
    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsFrame', direction: 'out', type: 'binary', encoding: 'hex', data: '0102ff' })
    );
  });

  it('reports close events on both the dedicated and state channels', async () => {
    const harness = createHarness();
    const { handler, messenger, getCloseListener } = harness;

    await handler.handle('wsConnect', { request: uiRequest }, messenger as any);
    getCloseListener()?.({ code: 1000, reason: 'done', wasClean: true });

    expect(messenger.postMessage).toHaveBeenCalledWith({
      command: 'wsClosed',
      code: 1000,
      reason: 'done',
      wasClean: true,
    });
    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsState', state: 'closed' })
    );
  });

  it('automatically reconnects after an unexpected close', async () => {
    const harness = createHarness();
    const { handler, messenger, webSocketClient, getCloseListener } = harness;
    const request = {
      ...uiRequest,
      websocket: {
        ...uiRequest.websocket,
        settings: { reconnectionAttempts: 1, reconnectionInterval: 10 },
      },
    };

    jest.useFakeTimers();
    try {
      await handler.handle('wsConnect', { request }, messenger as any);
      getCloseListener()?.({ code: 1006, reason: 'network', wasClean: false });

      expect(messenger.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'wsInfo',
          message: expect.stringContaining('attempt 1/1'),
          reconnecting: true,
          attempt: 1,
          maxAttempts: 1,
        })
      );

      await jest.advanceTimersByTimeAsync(10);
      expect(webSocketClient.connect as jest.Mock).toHaveBeenCalledTimes(2);
      expect(messenger.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'wsState', state: 'open' })
      );
    } finally {
      handler.dispose();
      jest.useRealTimers();
    }
  });

  it('reports connection failures and closes the connection on dispose', async () => {
    const harness = createHarness();
    const { handler, messenger, webSocketClient, connection } = harness;
    webSocketClient.connect.mockRejectedValueOnce(new Error('handshake rejected'));

    await handler.handle('wsConnect', { request: uiRequest }, messenger as any);
    expect(messenger.postMessage).toHaveBeenCalledWith({
      command: 'wsError',
      error: 'handshake rejected',
    });

    await handler.handle('wsConnect', { request: uiRequest }, messenger as any);
    handler.dispose();
    expect(connection.dispose).toHaveBeenCalled();
  });

  it('does not open a socket when disconnect supersedes a pending connect', async () => {
    const harness = createHarness();
    let resolvePrepare: ((value: unknown) => void) | undefined;
    (harness.requestPreparer.prepareRequest as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => {
      resolvePrepare = resolve;
    }));

    const connecting = harness.handler.handle('wsConnect', { request: uiRequest }, harness.messenger as any);
    while ((harness.requestPreparer.prepareRequest as jest.Mock).mock.calls.length === 0) {
      await Promise.resolve();
    }

    await harness.handler.handle('wsDisconnect', {}, harness.messenger as any);
    resolvePrepare?.({ url: 'wss://resolved.example.test/socket', headers: {} });
    await connecting;

    expect(harness.webSocketClient.connect).not.toHaveBeenCalled();
    expect(harness.messenger.postMessage).toHaveBeenCalledWith({ command: 'wsState', state: 'closed' });
  });

  it('connects Socket.IO with listeners, path, and reconnection settings', async () => {
    const harness = createSocketIoHarness();

    await harness.handler.handle('wsConnect', { request: socketIoRequest }, harness.messenger as any);

    expect(harness.socketIoClient.connect as jest.Mock).toHaveBeenCalledWith({
      url: 'wss://resolved.example.test/socket',
      headers: { Authorization: 'Bearer resolved' },
      path: '/custom-socket',
      timeout: 9000,
      reconnectionAttempts: 3,
      reconnectionDelay: 700,
      listeners: ['chat.message'],
    });
    expect(harness.messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsState', state: 'open', transport: 'socketio', protocol: 'socket.io socket-1' })
    );
  });

  it('sends Socket.IO events with arguments and reports acknowledgements', async () => {
    const harness = createSocketIoHarness();

    await harness.handler.handle('wsConnect', { request: socketIoRequest }, harness.messenger as any);
    await harness.handler.handle(
      'wsSend',
      { type: 'text', format: 'text', event: 'chat.send', data: 'hello', args: ['one'], ack: true },
      harness.messenger as any
    );

    expect(harness.socketIoConnection.send).toHaveBeenCalledWith('chat.send', ['hello', 'one'], true);
    expect(harness.messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'wsFrame',
        direction: 'out',
        event: 'chat.send',
        data: 'hello',
        args: ['one'],
        ack: true,
      })
    );
    expect(harness.messenger.postMessage).toHaveBeenCalledWith({
      command: 'wsInfo',
      message: 'Acknowledgement: ack-ok',
    });
  });

  it('shows the outbound Socket.IO frame before a late acknowledgement arrives', async () => {
    const harness = createSocketIoHarness();
    let resolveAck: ((value: unknown[]) => void) | undefined;
    (harness.socketIoConnection.send as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => { resolveAck = resolve; })
    );

    await harness.handler.handle('wsConnect', { request: socketIoRequest }, harness.messenger as any);
    const send = harness.handler.handle(
      'wsSend',
      { type: 'text', event: 'chat.send', data: 'hello', ack: true },
      harness.messenger as any
    );

    expect(harness.messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsFrame', direction: 'out', event: 'chat.send', data: 'hello', ack: true })
    );
    expect(harness.messenger.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsInfo' })
    );

    resolveAck?.(['later']);
    await send;
    expect(harness.messenger.postMessage).toHaveBeenCalledWith({
      command: 'wsInfo',
      message: 'Acknowledgement: later',
    });
  });

  it('streams listened Socket.IO events as frames', async () => {
    const harness = createSocketIoHarness();

    await harness.handler.handle('wsConnect', { request: socketIoRequest }, harness.messenger as any);
    harness.getEventListener()?.({ event: 'chat.message', args: ['hello', { count: 2 }] });

    expect(harness.messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'wsFrame',
        direction: 'in',
        event: 'chat.message',
        data: 'hello',
        args: ['{"count":2}'],
      })
    );
  });

  it('keeps Socket.IO listeners attached across transient disconnects', async () => {
    const harness = createSocketIoHarness();

    await harness.handler.handle('wsConnect', { request: socketIoRequest }, harness.messenger as any);
    harness.getDisconnectListener()?.('transport close');
    harness.getConnectListener()?.();

    expect(harness.messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsClosed', code: 1006, reason: 'transport close' })
    );
    expect(harness.messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsState', state: 'open', transport: 'socketio' })
    );

    await harness.handler.handle(
      'wsSend',
      { type: 'text', event: 'chat.message', data: 'still here' },
      harness.messenger as any
    );
    expect(harness.socketIoConnection.send).toHaveBeenCalledWith('chat.message', ['still here'], false);

    harness.handler.dispose();
  });

  it('reports Socket.IO reconnection progress and failure', async () => {
    const harness = createSocketIoHarness();

    await harness.handler.handle('wsConnect', { request: socketIoRequest }, harness.messenger as any);
    harness.getDisconnectListener()?.('transport close');

    expect(harness.messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'wsInfo', reconnecting: true })
    );

    harness.getReconnectFailedListener()?.();
    expect(harness.messenger.postMessage).toHaveBeenCalledWith({
      command: 'wsInfo',
      message: 'Socket.IO reconnection failed',
      reconnecting: false,
    });
    harness.handler.dispose();
  });

  it('ignores unsupported commands', async () => {
    const harness = createHarness();
    await expect(harness.handler.handle('wsUnknown', {}, harness.messenger as any)).resolves.toBe(false);
  });
});
