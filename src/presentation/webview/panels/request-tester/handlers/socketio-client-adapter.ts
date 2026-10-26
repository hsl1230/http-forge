import type { IDisposable } from '@http-forge/core';
import type { Socket } from 'socket.io-client';

export interface SocketIoConnectOptions {
  url: string;
  headers?: Record<string, string>;
  path?: string;
  timeout?: number;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  listeners?: string[];
}

export interface SocketIoEvent {
  event: string;
  args: unknown[];
}

export interface ISocketIoConnection extends IDisposable {
  readonly connected: boolean;
  readonly id?: string;

  send(event: string, args: unknown[], expectAck?: boolean): Promise<unknown[] | undefined>;
  close(): void;

  onEvent(listener: (event: SocketIoEvent) => void): IDisposable;
  onConnect(listener: () => void): IDisposable;
  onDisconnect(listener: (reason: string) => void): IDisposable;
  onReconnectFailed(listener: () => void): IDisposable;
  onError(listener: (error: Error) => void): IDisposable;
}

export interface ISocketIoClient {
  connect(options: SocketIoConnectOptions): Promise<ISocketIoConnection>;
}

const RESERVED_SOCKET_IO_EVENTS = new Set([
  'connect',
  'connect_error',
  'disconnect',
  'disconnecting',
  'newListener',
  'removeListener',
]);

interface SocketIoModule {
  io: typeof import('socket.io-client').io;
}

/**
 * Socket.IO transport adapter.
 *
 * The extension host owns the socket; the webview only renders event frames.
 * The dependency is loaded lazily so HTTP-only extension startup does not pay
 * for the Socket.IO client.
 */
export class SocketIoClientAdapter implements ISocketIoClient {
  async connect(options: SocketIoConnectOptions): Promise<ISocketIoConnection> {
    const module = await loadSocketIoModule();
    return new Promise<ISocketIoConnection>((resolve, reject) => {
      const socket = module.io(options.url, {
        transports: ['websocket'],
        extraHeaders: options.headers,
        path: options.path,
        timeout: options.timeout,
        reconnection: (options.reconnectionAttempts ?? 0) > 0,
        reconnectionAttempts: options.reconnectionAttempts,
        reconnectionDelay: options.reconnectionDelay,
      });

      let settled = false;
      const fail = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        socket.disconnect();
        reject(error);
      };

      socket.once('connect', () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(new SocketIoConnection(socket, options.listeners));
      });

      socket.once('connect_error', (error: Error) => {
        fail(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }
}

class SocketIoConnection implements ISocketIoConnection {
  private readonly eventListeners = new Set<(event: SocketIoEvent) => void>();
  private readonly connectListeners = new Set<() => void>();
  private readonly disconnectListeners = new Set<(reason: string) => void>();
  private readonly reconnectFailedListeners = new Set<() => void>();
  private readonly errorListeners = new Set<(error: Error) => void>();
  private readonly disposal: IDisposable[] = [];
  private disposed = false;

  constructor(
    private readonly socket: Socket,
    _listeners?: string[]
  ) {
    const onAny = (event: string, ...args: unknown[]) => {
      if (RESERVED_SOCKET_IO_EVENTS.has(event)) {
        return;
      }
      for (const listener of [...this.eventListeners]) {
        listener({ event, args });
      }
    };
    const onConnect = () => {
      for (const listener of [...this.connectListeners]) {
        listener();
      }
    };
    const onDisconnect = (reason: string) => {
      for (const listener of [...this.disconnectListeners]) {
        listener(reason);
      }
    };
    const onReconnectFailed = () => {
      for (const listener of [...this.reconnectFailedListeners]) {
        listener();
      }
    };
    const onError = (error: Error) => {
      for (const listener of [...this.errorListeners]) {
        listener(error);
      }
    };

    this.socket.on('connect', onConnect);
    this.socket.on('disconnect', onDisconnect);
    this.socket.on('connect_error', onError);
    this.socket.io.on('reconnect_failed', onReconnectFailed);
    // `onAny` is used so saved listeners can be configured after the socket
    // opens without re-registering one handler per event name.
    this.socket.onAny(onAny);

    this.disposal.push({
      dispose: () => {
        this.socket.off('connect', onConnect);
        this.socket.off('disconnect', onDisconnect);
        this.socket.off('connect_error', onError);
        this.socket.io.off('reconnect_failed', onReconnectFailed);
        this.socket.offAny(onAny);
      },
    });
  }

  get connected(): boolean {
    return this.socket.connected;
  }

  get id(): string | undefined {
    return this.socket.id;
  }

  send(event: string, args: unknown[], expectAck = false): Promise<unknown[] | undefined> {
    const name = event?.trim() || 'message';
    if (!expectAck) {
      this.socket.emit(name, ...args);
      return Promise.resolve(undefined);
    }

    return new Promise((resolve) => {
      this.socket.emit(name, ...args, (...ackArgs: unknown[]) => {
        resolve(ackArgs);
      });
    });
  }

  close(): void {
    this.socket.disconnect();
  }

  onEvent(listener: (event: SocketIoEvent) => void): IDisposable {
    this.eventListeners.add(listener);
    return { dispose: () => this.eventListeners.delete(listener) };
  }

  onConnect(listener: () => void): IDisposable {
    this.connectListeners.add(listener);
    return { dispose: () => this.connectListeners.delete(listener) };
  }

  onDisconnect(listener: (reason: string) => void): IDisposable {
    this.disconnectListeners.add(listener);
    return { dispose: () => this.disconnectListeners.delete(listener) };
  }

  onReconnectFailed(listener: () => void): IDisposable {
    this.reconnectFailedListeners.add(listener);
    return { dispose: () => this.reconnectFailedListeners.delete(listener) };
  }

  onError(listener: (error: Error) => void): IDisposable {
    this.errorListeners.add(listener);
    return { dispose: () => this.errorListeners.delete(listener) };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.socket.disconnect();
    for (const disposable of this.disposal) {
      disposable.dispose();
    }
    this.disposal.length = 0;
    this.eventListeners.clear();
    this.connectListeners.clear();
    this.disconnectListeners.clear();
    this.reconnectFailedListeners.clear();
    this.errorListeners.clear();
  }
}

async function loadSocketIoModule(): Promise<SocketIoModule> {
  return import('socket.io-client');
}
