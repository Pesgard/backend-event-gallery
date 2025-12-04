import { IsOptional, IsUUID, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CommentFiltersDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  imageId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

