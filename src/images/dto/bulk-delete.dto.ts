import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class BulkDeleteImagesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  imageIds: string[];
}

