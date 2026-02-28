import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsBase64,
} from 'class-validator';
import {
  USER_FIELD_MAX_LENGTH,
  USER_LIST_PAGINATION,
} from '../users.constants';
export class ListUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(USER_LIST_PAGINATION.minLimit)
  @Max(USER_LIST_PAGINATION.maxLimit)
  limit?: number;

  @IsOptional()
  @IsBase64({ urlSafe: true })
  cursor?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(USER_FIELD_MAX_LENGTH.name)
  name?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(USER_FIELD_MAX_LENGTH.email)
  email?: string;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
