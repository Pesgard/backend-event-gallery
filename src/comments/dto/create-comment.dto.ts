import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  imageId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

