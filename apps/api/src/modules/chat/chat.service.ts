import { Inject, Injectable } from '@nestjs/common';
import { EVENT_BUS, type EventBus } from '../../common/events/event-bus';
import { createDomainEvent } from '../../common/events/domain-event';
import { CHAT_REPOSITORY } from './chat.constants';
import type { SendChatMessageDto } from './dto/send-chat-message.dto';
import type { ChatRepositoryPort } from './chat.repository.port';

@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: ChatRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async sendMessage(dto: SendChatMessageDto): Promise<{ messageId: string }> {
    const persisted = await this.chatRepository.createMessage({
      roomId: dto.roomId,
      senderId: dto.senderId,
      message: dto.message,
    });

    await this.eventBus.publish(
      createDomainEvent({
        aggregate: 'chat_message',
        type: 'chat.message.created',
        payload: {
          messageId: persisted.id,
          roomId: persisted.room_id,
          senderId: persisted.sender_id,
          message: persisted.message,
          createdAt: persisted.created_at.toISOString(),
          ackId: dto.ackId,
        },
      }),
    );

    return { messageId: persisted.id };
  }
}
