import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { GetPresignedUrlDto } from './dto/presigned-url.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  async getPresignedUrl(@Body() dto: GetPresignedUrlDto) {
    const result = await this.uploadService.getPresignedUploadUrl(
      dto.fileName,
      dto.fileType,
      dto.fileSize,
      dto.uploadType,
      dto.eventId,
    );

    return result;
  }
}

