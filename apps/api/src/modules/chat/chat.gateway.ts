import {
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
  private server: WebSocketServer | null = null;
  private readonly clients = new Set<WebSocket>();
  private readonly rateLimits = new Map<WebSocket, ClientState>();

  constructor(
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async onModuleInit(): Promise<void> {
    const port = this.configService.get<number>('CHAT_WS_PORT') ?? 3101;
    this.server = new WebSocketServer({ port });

    this.server.on('connection', (socket) => {
      this.clients.add(socket);
      this.rateLimits.set(socket, { count: 0, windowStartedAt: Date.now() });

      socket.on('message', (message) => {
        void this.handleIncoming(socket, message.toString());
      });

      socket.on('close', () => {
        this.clients.delete(socket);
        this.rateLimits.delete(socket);
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
    if (!this.allowRequest(socket)) {
      socket.send(
        JSON.stringify({ type: 'error', message: 'rate_limit_exceeded' }),
      );
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'invalid_json' }));
      return;
    }

    const dto = plainToInstance(SendChatMessageDto, parsed);
    const errors = await validate(dto);

    if (errors.length > 0) {
      socket.send(
        JSON.stringify({ type: 'error', message: 'invalid_payload' }),
      );
      return;
    }

    const created = await this.chatService.sendMessage(dto);
    socket.send(
      JSON.stringify({
        type: 'ack',
        ackId: dto.ackId,
        messageId: created.messageId,
      }),
    );
  }

  private broadcast(event: DomainEvent): Promise<void> {
    const payload = JSON.stringify({
      type: event.type,
      payload: event.payload,
    });

    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
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
}
