import {
  Logger,
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DomainEvent } from '../../common/events/domain-event';
import { EVENT_BUS, type EventBus } from '../../common/events/event-bus';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { ChatService } from './chat.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { WebSocketServer, type WebSocket } from 'ws';
import { Inject } from '@nestjs/common';

interface ClientState {
  count: number;
  windowStartedAt: number;
}

@Injectable()
export class ChatGateway implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(ChatGateway.name);
  private server: WebSocketServer | null = null;
  private readonly clients = new Set<WebSocket>();
  private readonly rateLimits = new Map<WebSocket, ClientState>();
  private readonly inFlightBySocket = new Map<WebSocket, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async onModuleInit(): Promise<void> {
    const port = this.configService.get<number>('CHAT_WS_PORT') ?? 3101;
    this.server = new WebSocketServer({ port });

    this.server.on('connection', (socket) => {
      const maxConnections =
        this.configService.get<number>('CHAT_MAX_CONNECTIONS') ?? 2000;
      if (this.clients.size >= maxConnections) {
        this.safeSend(socket, {
          type: 'error',
          message: 'server_busy',
        });
        socket.close();
        return;
      }

      this.clients.add(socket);
      this.rateLimits.set(socket, { count: 0, windowStartedAt: Date.now() });
      this.inFlightBySocket.set(socket, 0);

      socket.on('message', (message) => {
        const raw = message.toString();
        void this.handleIncoming(socket, raw);
      });

      socket.on('close', () => {
        this.clients.delete(socket);
        this.rateLimits.delete(socket);
        this.inFlightBySocket.delete(socket);
      });
    });

    await this.eventBus.subscribe('chat.message.created', async (event) =>
      this.broadcast(event),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.server !== null) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve());
      });
    }
  }

  private async handleIncoming(socket: WebSocket, raw: string): Promise<void> {
    const maxPayloadBytes = this.configService.get<number>(
      'CHAT_SOCKET_MAX_BUFFER_BYTES',
    );
    if (
      maxPayloadBytes !== undefined &&
      Buffer.byteLength(raw, 'utf8') > maxPayloadBytes
    ) {
      this.safeSend(socket, { type: 'error', message: 'payload_too_large' });
      return;
    }

    if (!this.allowInFlight(socket)) {
      this.safeSend(socket, {
        type: 'error',
        message: 'too_many_inflight_messages',
      });
      return;
    }

    try {
      await this.handleIncomingInternal(socket, raw);
    } finally {
      this.decrementInFlight(socket);
    }
  }

  private async handleIncomingInternal(
    socket: WebSocket,
    raw: string,
  ): Promise<void> {
    if (!this.allowRequest(socket)) {
      this.safeSend(socket, { type: 'error', message: 'rate_limit_exceeded' });
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      this.safeSend(socket, { type: 'error', message: 'invalid_json' });
      return;
    }

    const dto = plainToInstance(SendChatMessageDto, parsed);
    const errors = await validate(dto);

    if (errors.length > 0) {
      this.safeSend(socket, { type: 'error', message: 'invalid_payload' });
      return;
    }

    const created = await this.chatService.sendMessage(dto);
    this.safeSend(socket, {
      type: 'ack',
      ackId: dto.ackId,
      messageId: created.messageId,
    });
  }

  private broadcast(event: DomainEvent): Promise<void> {
    const payload = {
      type: event.type,
      payload: event.payload,
    };

    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        this.safeSend(client, payload);
      }
    }

    return Promise.resolve();
  }

  private allowRequest(socket: WebSocket): boolean {
    const max =
      this.configService.get<number>('CHAT_SOCKET_RATE_LIMIT_MAX') ?? 20;
    const windowMs =
      this.configService.get<number>('CHAT_SOCKET_RATE_LIMIT_WINDOW_MS') ??
      60000;
    const now = Date.now();
    const current = this.rateLimits.get(socket);

    if (current === undefined || now - current.windowStartedAt > windowMs) {
      this.rateLimits.set(socket, { count: 1, windowStartedAt: now });
      return true;
    }

    current.count += 1;
    return current.count <= max;
  }

  private allowInFlight(socket: WebSocket): boolean {
    const maxInFlight =
      this.configService.get<number>('CHAT_MAX_INFLIGHT_MESSAGES_PER_SOCKET') ??
      8;
    const current = this.inFlightBySocket.get(socket) ?? 0;
    if (current >= maxInFlight) {
      return false;
    }

    this.inFlightBySocket.set(socket, current + 1);
    return true;
  }

  private decrementInFlight(socket: WebSocket): void {
    const current = this.inFlightBySocket.get(socket) ?? 0;
    this.inFlightBySocket.set(socket, Math.max(0, current - 1));
  }

  private safeSend(socket: WebSocket, payload: object): void {
    const maxBufferedBytes = this.configService.get<number>(
      'CHAT_SOCKET_MAX_BUFFER_BYTES',
    );
    if (
      maxBufferedBytes !== undefined &&
      socket.bufferedAmount > maxBufferedBytes
    ) {
      this.logger.warn('Dropping chat message due to socket backpressure');
      return;
    }

    try {
      socket.send(JSON.stringify(payload));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown socket send error';
      this.logger.warn(`Socket send failed: ${message}`);
    }
  }
}
