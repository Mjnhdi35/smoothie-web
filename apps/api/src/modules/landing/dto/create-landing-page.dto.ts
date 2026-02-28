import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLandingPageDto {
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  status!: string;
}
