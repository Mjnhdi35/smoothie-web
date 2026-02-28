import type { ChatMessageRow } from './chat.repository';

export interface ChatRepositoryPort {
  createMessage(input: {
    roomId: string;
    senderId: string;
    message: string;
  }): Promise<ChatMessageRow>;
}
