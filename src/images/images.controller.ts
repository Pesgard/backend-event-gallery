import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagesService } from './images.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { ImageFiltersDto } from './dto/image-filters.dto';
import { BulkDeleteImagesDto } from './dto/bulk-delete.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Public()
  @Get()
  async findAll(
    @Query() filters: ImageFiltersDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.imagesService.findAll(filters, user?.userId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async upload(
    @Body() dto: UploadImageDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.imagesService.upload(dto, file, user.userId);
  }

  @Public()
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.imagesService.findOne(id, user?.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateImageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.imagesService.update(id, dto, user.userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.imagesService.remove(id, user.userId);
    return { message: 'Image deleted successfully' };
  }

  @Post(':id/like')
  async like(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.imagesService.like(id, user.userId);
  }

  @Delete(':id/unlike')
  async unlike(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.imagesService.unlike(id, user.userId);
  }

  @Public()
  @Get(':id/likes')
  async getLikes(@Param('id') id: string) {
    return this.imagesService.getLikes(id);
  }

  @Post('bulk-delete')
  async bulkDelete(
    @Body() dto: BulkDeleteImagesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.imagesService.bulkDelete(dto.imageIds, user.userId);
  }
}
