import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  MinLength,
  MaxLength,
  Min,
  Matches,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import type { EventCategory } from './create-event.dto';

const EVENT_CATEGORIES = [
  'wedding',
  'birthday',
  'conference',
  'music',
  'sports',
  'art',
  'corporate',
  'other',
] as const;

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'time must be in HH:MM format',
  })
  time?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsIn(EVENT_CATEGORIES)
  category?: EventCategory;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxParticipants?: number;
}
