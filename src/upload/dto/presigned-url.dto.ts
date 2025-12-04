import { IsString, IsNumber, IsIn, IsOptional, Min, Max } from 'class-validator';

export class GetPresignedUrlDto {
  @IsString()
  fileName: string;

  @IsString()
  fileType: string;

  @IsNumber()
  @Min(1)
  @Max(10 * 1024 * 1024) // 10MB max
  fileSize: number;

  @IsIn(['event-cover', 'image', 'avatar'])
  uploadType: 'event-cover' | 'image' | 'avatar';

  @IsOptional()
  @IsString()
  eventId?: string;
}

