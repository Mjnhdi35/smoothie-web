import { Inject, Injectable } from '@nestjs/common';
import { EVENT_BUS, type EventBus } from '../../common/events/event-bus';
import { createDomainEvent } from '../../common/events/domain-event';
import type { SendChatMessageDto } from './dto/send-chat-message.dto';
import { ChatRepository } from './chat.repository';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
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
