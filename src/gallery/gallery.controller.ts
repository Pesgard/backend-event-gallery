import { Controller, Get, Query } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('gallery')
@Public()
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get('featured')
  async getFeatured(@Query('limit') limit?: number) {
    return this.galleryService.getFeaturedImages(limit || 10);
  }

  @Get('recent')
  async getRecent(@Query() filters: PaginationDto) {
    return this.galleryService.getRecentImages(filters);
  }

  @Get('popular')
  async getPopular(@Query() filters: PaginationDto) {
    return this.galleryService.getPopularImages(filters);
  }

  @Get('stats')
  async getStats() {
    return this.galleryService.getStats();
  }
}

