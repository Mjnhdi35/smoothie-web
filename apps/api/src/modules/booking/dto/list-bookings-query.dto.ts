import { Type } from 'class-transformer';
import {
  IsBase64,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ListBookingsQueryDto {
  @IsOptional()
  @IsUUID('4')
  hotelId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsBase64({ urlSafe: true })
  cursor?: string;
}
