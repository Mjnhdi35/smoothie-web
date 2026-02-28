declare module 'ws' {
  import type { EventEmitter } from 'node:events';

  export class WebSocket extends EventEmitter {
    static readonly OPEN: number;
    readonly OPEN: number;
    readyState: number;
    send(data: string | Buffer): void;
    close(): void;
    on(event: 'message', listener: (data: Buffer) => void): this;
    on(event: 'close', listener: () => void): this;
  }

  export interface WebSocketServerOptions {
    port: number;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options: WebSocketServerOptions);
    on(event: 'connection', listener: (socket: WebSocket) => void): this;
    close(callback?: () => void): void;
  }
}
