import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';

export interface ImageWithStats {
  id: string;
  eventId: string;
  userId: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  imageKey: string;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
  likeCount: number;
  commentCount: number;
}

export interface GalleryStats {
  totalEvents: number;
  totalImages: number;
  totalUsers: number;
  totalLikes: number;
  totalComments: number;
}

@Injectable()
export class GalleryService {
  constructor(private prisma: PrismaService) {}

  private toImageWithStats(image: any): ImageWithStats {
    return {
      id: image.id,
      eventId: image.eventId,
      userId: image.userId,
      title: image.title,
      description: image.description,
      imageUrl: image.imageUrl,
      imageKey: image.imageKey,
      thumbnailUrl: image.thumbnailUrl,
      thumbnailKey: image.thumbnailKey,
      width: image.width,
      height: image.height,
      fileSize: image.fileSize,
      mimeType: image.mimeType,
      uploadedAt: image.uploadedAt.toISOString(),
      likeCount: image._count?.likes || image.likeCount || 0,
      commentCount: image._count?.comments || image.commentCount || 0,
    };
  }

  async getFeaturedImages(limit: number = 10): Promise<ImageWithStats[]> {
    // Featured = most liked images from public events
    const images = await this.prisma.image.findMany({
      where: {
        event: { isPrivate: false },
      },
      orderBy: {
        likes: {
          _count: 'desc',
        },
      },
      take: limit,
      include: {
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    return images.map((img) => this.toImageWithStats(img));
  }

  async getRecentImages(
    filters: PaginationDto,
  ): Promise<PaginatedResponse<ImageWithStats>> {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where = {
      event: { isPrivate: false },
    };

    const [images, total] = await Promise.all([
      this.prisma.image.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.image.count({ where }),
    ]);

    return createPaginatedResponse(
      images.map((img) => this.toImageWithStats(img)),
      total,
      page,
      limit,
    );
  }

  async getPopularImages(
    filters: PaginationDto,
  ): Promise<PaginatedResponse<ImageWithStats>> {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where = {
      event: { isPrivate: false },
    };

    const [images, total] = await Promise.all([
      this.prisma.image.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          likes: {
            _count: 'desc',
          },
        },
        include: {
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.image.count({ where }),
    ]);

    return createPaginatedResponse(
      images.map((img) => this.toImageWithStats(img)),
      total,
      page,
      limit,
    );
  }

  async getStats(): Promise<GalleryStats> {
    const [totalEvents, totalImages, totalUsers, totalLikes, totalComments] =
      await Promise.all([
        this.prisma.event.count({ where: { isPrivate: false } }),
        this.prisma.image.count({
          where: { event: { isPrivate: false } },
        }),
        this.prisma.user.count(),
        this.prisma.imageLike.count(),
        this.prisma.comment.count(),
      ]);

    return {
      totalEvents,
      totalImages,
      totalUsers,
      totalLikes,
      totalComments,
    };
  }
}
