import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { CHAT_REPOSITORY } from './chat.constants';
import { ChatGateway } from './chat.gateway';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController],
  providers: [
    ChatRepository,
    {
      provide: CHAT_REPOSITORY,
      useExisting: ChatRepository,
    },
    ChatService,
    ChatGateway,
  ],
})
export class ChatModule {}
