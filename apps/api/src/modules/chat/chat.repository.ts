import { Inject, Injectable } from '@nestjs/common';
import {
  KNEX,
  type DbKnex,
} from '../../infrastructure/database/database.constants';

export interface ChatMessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: Date;
}

@Injectable()
export class ChatRepository {
  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  async createMessage(input: {
    roomId: string;
    senderId: string;
    message: string;
  }): Promise<ChatMessageRow> {
    const [row] = (await this.knexClient<ChatMessageRow>('chat_messages')
      .insert({
        id: crypto.randomUUID(),
        room_id: input.roomId,
        sender_id: input.senderId,
        message: input.message,
        created_at: this.knexClient.fn.now(),
      })
      .returning([
        'id',
        'room_id',
        'sender_id',
        'message',
        'created_at',
      ])) as ChatMessageRow[];

    if (row === undefined) {
      throw new Error('Failed to persist chat message');
    }

    return row;
  }
}
