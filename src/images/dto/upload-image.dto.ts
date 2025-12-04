import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class UploadImageDto {
  @IsUUID()
  eventId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

