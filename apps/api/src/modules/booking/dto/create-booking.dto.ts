import { IsDateString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID('4')
  userId!: string;

  @IsUUID('4')
  roomId!: string;

  @IsDateString()
  stayDate!: string;
}
