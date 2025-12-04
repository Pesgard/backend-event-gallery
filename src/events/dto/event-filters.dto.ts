import { IsOptional, IsString, IsBoolean, IsIn, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

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

export class EventFiltersDto extends PaginationDto {
  @IsOptional()
  @IsIn(EVENT_CATEGORIES)
  category?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  createdById?: string;
}

