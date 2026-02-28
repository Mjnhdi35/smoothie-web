import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendChatMessageDto {
  @IsUUID('4')
  roomId!: string;

  @IsUUID('4')
  senderId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;

  @IsString()
  @IsNotEmpty()
  ackId!: string;
}
