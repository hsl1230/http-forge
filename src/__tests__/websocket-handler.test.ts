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
    expect(messenger.postMessage).toHaveBeenCalledWith({ command: 'wsState', state: 'closed' });
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

  it('ignores unsupported commands', async () => {
    const harness = createHarness();
    await expect(harness.handler.handle('wsUnknown', {}, harness.messenger as any)).resolves.toBe(false);
  });
});
