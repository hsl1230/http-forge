import { describe, expect, jest, it } from '@jest/globals';
import { io } from 'socket.io-client';
import { SocketIoClientAdapter } from '@http-forge/core';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

type Listener = (...args: unknown[]) => void;

function flush(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

interface FakeManager {
  on: jest.Mock<any>;
  off: jest.Mock<any>;
}

interface FakeSocket {
  connected: boolean;
  id: string;
  io: FakeManager;
  on: jest.Mock<any>;
  once: jest.Mock<any>;
  off: jest.Mock<any>;
  onAny: jest.Mock<any>;
  offAny: jest.Mock<any>;
  emit: jest.Mock<any>;
  disconnect: jest.Mock<any>;
  emitEvent: (event: string, ...args: unknown[]) => void;
  emitManagerEvent: (event: string) => void;
}

function createFakeSocket(): FakeSocket {
  const listeners = new Map<string, Set<Listener>>();
  const onceListeners = new Map<string, Set<Listener>>();
  const managerListeners = new Map<string, Listener>();
  let anyListener: Listener | undefined;

  const manager: FakeManager = {
    on: jest.fn((event: string, listener: Listener) => {
      managerListeners.set(event, listener);
      return manager;
    }),
    off: jest.fn((event: string, listener: Listener) => {
      if (managerListeners.get(event) === listener) {
        managerListeners.delete(event);
      }
      return manager;
    }),
  };

  const socket: FakeSocket = {
    io: manager,
    connected: false,
    id: 'socket-1',
    on: jest.fn((event: string, listener: Listener) => {
      const bucket = listeners.get(event) || new Set<Listener>();
      bucket.add(listener);
      listeners.set(event, bucket);
      return socket;
    }),
    once: jest.fn((event: string, listener: Listener) => {
      const bucket = onceListeners.get(event) || new Set<Listener>();
      bucket.add(listener);
      onceListeners.set(event, bucket);
      return socket;
    }),
    off: jest.fn((event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
      onceListeners.get(event)?.delete(listener);
      return socket;
    }),
    onAny: jest.fn((listener: Listener) => {
      anyListener = listener;
      return socket;
    }),
    offAny: jest.fn((listener: Listener) => {
      if (anyListener === listener) {
        anyListener = undefined;
      }
      return socket;
    }),
    emit: jest.fn((_event: string, ...args: unknown[]) => {
      const maybeAck = args[args.length - 1];
      if (typeof maybeAck === 'function') {
        args.pop();
        (maybeAck as Listener)('ack-ok');
      }
      return socket;
    }),
    disconnect: jest.fn(),
    emitEvent: (event: string, ...args: unknown[]) => {
      for (const listener of [...(listeners.get(event) || [])]) {
        listener(...args);
      }
      const once = onceListeners.get(event);
      if (once) {
        for (const listener of [...once]) {
          listener(...args);
        }
        onceListeners.delete(event);
      }
      anyListener?.(event, ...args);
    },
    emitManagerEvent: (event: string) => {
      managerListeners.get(event)?.();
    },
  };

  return socket;
}

describe('SocketIoClientAdapter', () => {
  it('connects with the configured headers, path, timeout, and reconnection policy', async () => {
    const socket = createFakeSocket();
    const ioMock = io as unknown as jest.Mock;
    ioMock.mockReturnValue(socket);

    const adapter = new SocketIoClientAdapter();
    const pending = adapter.connect({
      url: 'wss://example.test/chat',
      headers: { Authorization: 'Bearer token' },
      path: '/socket.io',
      timeout: 5000,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    await flush();
    socket.connected = true;
    socket.emitEvent('connect');

    const connection = await pending;
    expect(ioMock).toHaveBeenCalledWith('wss://example.test/chat', {
      transports: ['websocket'],
      extraHeaders: { Authorization: 'Bearer token' },
      path: '/socket.io',
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });
    expect(connection.connected).toBe(true);
    expect(connection.id).toBe('socket-1');
  });

  it('sends events and resolves acknowledgements', async () => {
    const socket = createFakeSocket();
    const ioMock = io as unknown as jest.Mock;
    ioMock.mockReturnValue(socket);

    const adapter = new SocketIoClientAdapter();
    const pending = adapter.connect({ url: 'wss://example.test/chat' });
    await flush();
    socket.connected = true;
    socket.emitEvent('connect');
    const connection = await pending;

    await connection.send('chat.message', ['hello']);
    expect(socket.emit).toHaveBeenCalledWith('chat.message', 'hello');

    await expect(connection.send('chat.message', ['hello'], true)).resolves.toEqual(['ack-ok']);
    expect(socket.emit).toHaveBeenCalledWith('chat.message', 'hello', expect.any(Function));
  });

  it('forwards non-reserved events and lifecycle callbacks', async () => {
    const socket = createFakeSocket();
    const ioMock = io as unknown as jest.Mock;
    ioMock.mockReturnValue(socket);

    const adapter = new SocketIoClientAdapter();
    const pending = adapter.connect({ url: 'wss://example.test/chat' });
    await flush();
    socket.connected = true;
    socket.emitEvent('connect');
    const connection = await pending;

    const event = jest.fn();
    const connected = jest.fn();
    const disconnected = jest.fn();
    const reconnectFailed = jest.fn();
    const failed = jest.fn();
    connection.onEvent(event);
    connection.onConnect(connected);
    connection.onDisconnect(disconnected);
    connection.onReconnectFailed(reconnectFailed);
    connection.onError(failed);

    socket.emitEvent('chat.message', 'hello', { id: 1 });
    socket.emitEvent('connect');
    socket.emitEvent('disconnect', 'transport close');
    socket.emitManagerEvent('reconnect_failed');
    socket.emitEvent('connect_error', new Error('offline'));
    socket.emitEvent('connect_error');

    expect(event).toHaveBeenCalledTimes(1);
    expect(event).toHaveBeenCalledWith({ event: 'chat.message', args: ['hello', { id: 1 }] });
    expect(connected).toHaveBeenCalledTimes(1);
    expect(disconnected).toHaveBeenCalledWith('transport close');
    expect(reconnectFailed).toHaveBeenCalledTimes(1);
    expect(failed).toHaveBeenCalledTimes(2);
  });

  it('rejects the first connection error and disconnects the socket', async () => {
    const socket = createFakeSocket();
    const ioMock = io as unknown as jest.Mock;
    ioMock.mockReturnValue(socket);

    const adapter = new SocketIoClientAdapter();
    const pending = adapter.connect({ url: 'wss://example.test/chat' });
    await flush();
    socket.emitEvent('connect_error', new Error('unreachable'));

    await expect(pending).rejects.toThrow('unreachable');
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('disposes listeners and disconnects the socket', async () => {
    const socket = createFakeSocket();
    const ioMock = io as unknown as jest.Mock;
    ioMock.mockReturnValue(socket);

    const adapter = new SocketIoClientAdapter();
    const pending = adapter.connect({ url: 'wss://example.test/chat' });
    await flush();
    socket.connected = true;
    socket.emitEvent('connect');
    const connection = await pending;

    connection.dispose();

    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.offAny).toHaveBeenCalled();
    expect(socket.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(socket.io.off).toHaveBeenCalledWith('reconnect_failed', expect.any(Function));
  });
});
