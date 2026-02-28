import { Body, Controller, Post } from '@nestjs/common';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  send(@Body() dto: SendChatMessageDto): Promise<{ messageId: string }> {
    return this.chatService.sendMessage(dto);
  }
}
