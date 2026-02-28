import { IsUUID } from 'class-validator';

export class LoginDto {
  @IsUUID('4')
  userId!: string;
}
