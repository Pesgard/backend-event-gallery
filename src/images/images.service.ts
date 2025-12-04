import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { ImageFiltersDto } from './dto/image-filters.dto';
import { createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';

export interface UserPublic {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

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

interface ImageWithUser extends ImageWithStats {
  user: UserPublic;
}

interface CommentWithUser {
  id: string;
  imageId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: UserPublic;
}

export interface ImageDetail extends ImageWithUser {
  isLikedByCurrentUser: boolean;
  comments: CommentWithUser[];
}

@Injectable()
export class ImagesService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  private toUserPublic(user: any): UserPublic {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    };
  }

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

  private toCommentWithUser(comment: any): CommentWithUser {
    return {
      id: comment.id,
      imageId: comment.imageId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: this.toUserPublic(comment.user),
    };
  }

  async findAll(
    filters: ImageFiltersDto,
    userId?: string,
  ): Promise<PaginatedResponse<ImageWithStats>> {
    const { page = 1, limit = 20, sortBy, sortOrder = 'desc' } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.eventId) {
      where.eventId = filters.eventId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.startDate) {
      where.uploadedAt = { ...where.uploadedAt, gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.uploadedAt = { ...where.uploadedAt, lte: new Date(filters.endDate) };
    }

    // Only show images from events user has access to
    if (userId) {
      where.event = {
        OR: [
          { isPrivate: false },
          { createdById: userId },
          { participants: { some: { userId } } },
        ],
      };
    } else {
      where.event = { isPrivate: false };
    }

    const orderBy: any = {};
    if (sortBy && ['uploadedAt', 'title'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.uploadedAt = sortOrder;
    }

    const [images, total] = await Promise.all([
      this.prisma.image.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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

  async findOne(id: string, userId?: string): Promise<ImageDetail> {
    const image = await this.prisma.image.findUnique({
      where: { id },
      include: {
        user: true,
        event: {
          include: {
            participants: { select: { userId: true } },
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        likes: userId ? { where: { userId }, take: 1 } : false,
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Check access for private events
    if (image.event.isPrivate) {
      const hasAccess =
        userId &&
        (image.event.createdById === userId ||
          image.event.participants.some((p) => p.userId === userId));
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this image');
      }
    }

    return {
      ...this.toImageWithStats(image),
      user: this.toUserPublic(image.user),
      isLikedByCurrentUser: image.likes && image.likes.length > 0,
      comments: image.comments.map((c) => this.toCommentWithUser(c)),
    };
  }

  async upload(
    dto: UploadImageDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ image: ImageWithStats; message: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    // Verify event exists and user has access
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: {
        participants: { where: { userId }, take: 1 },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user is participant
    const isParticipant =
      event.createdById === userId || event.participants.length > 0;
    if (!isParticipant) {
      throw new ForbiddenException('You must be a participant to upload images');
    }

    // Upload to S3
    const uploadResult = await this.uploadService.uploadEventImage(
      file,
      dto.eventId,
    );

    // Create image record
    const image = await this.prisma.image.create({
      data: {
        eventId: dto.eventId,
        userId,
        title: dto.title,
        description: dto.description,
        imageUrl: uploadResult.image.url,
        imageKey: uploadResult.image.key,
        thumbnailUrl: uploadResult.thumbnail.url,
        thumbnailKey: uploadResult.thumbnail.key,
        width: uploadResult.metadata.width,
        height: uploadResult.metadata.height,
        fileSize: uploadResult.metadata.fileSize,
        mimeType: uploadResult.metadata.mimeType,
      },
      include: {
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    return {
      image: this.toImageWithStats(image),
      message: 'Image uploaded successfully',
    };
  }

  async update(
    id: string,
    dto: UpdateImageDto,
    userId: string,
  ): Promise<ImageWithStats> {
    const image = await this.prisma.image.findUnique({ where: { id } });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.userId !== userId) {
      throw new ForbiddenException('Only the image owner can update this image');
    }

    const updated = await this.prisma.image.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    return this.toImageWithStats(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    const image = await this.prisma.image.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Allow deletion by image owner or event creator
    if (image.userId !== userId && image.event.createdById !== userId) {
      throw new ForbiddenException('You do not have permission to delete this image');
    }

    // Delete from S3
    const keysToDelete = [image.imageKey];
    if (image.thumbnailKey) keysToDelete.push(image.thumbnailKey);
    await this.uploadService.deleteFiles(keysToDelete);

    // Delete from database
    await this.prisma.image.delete({ where: { id } });
  }

  async like(id: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const image = await this.prisma.image.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            participants: { where: { userId }, take: 1 },
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Check access
    const hasAccess =
      !image.event.isPrivate ||
      image.event.createdById === userId ||
      image.event.participants.length > 0;
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this image');
    }

    // Check if already liked
    const existingLike = await this.prisma.imageLike.findUnique({
      where: {
        imageId_userId: { imageId: id, userId },
      },
    });

    if (existingLike) {
      throw new BadRequestException('You have already liked this image');
    }

    await this.prisma.imageLike.create({
      data: {
        imageId: id,
        userId,
      },
    });

    const likeCount = await this.prisma.imageLike.count({
      where: { imageId: id },
    });

    return { liked: true, likeCount };
  }

  async unlike(id: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const image = await this.prisma.image.findUnique({ where: { id } });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const existingLike = await this.prisma.imageLike.findUnique({
      where: {
        imageId_userId: { imageId: id, userId },
      },
    });

    if (!existingLike) {
      throw new BadRequestException('You have not liked this image');
    }

    await this.prisma.imageLike.delete({
      where: { id: existingLike.id },
    });

    const likeCount = await this.prisma.imageLike.count({
      where: { imageId: id },
    });

    return { liked: false, likeCount };
  }

  async getLikes(id: string): Promise<{ users: UserPublic[]; count: number }> {
    const image = await this.prisma.image.findUnique({ where: { id } });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const likes = await this.prisma.imageLike.findMany({
      where: { imageId: id },
      include: { user: true },
      orderBy: { likedAt: 'desc' },
    });

    return {
      users: likes.map((l) => this.toUserPublic(l.user)),
      count: likes.length,
    };
  }

  async bulkDelete(
    imageIds: string[],
    userId: string,
  ): Promise<{ deletedCount: number; failedIds: string[]; message: string }> {
    const failedIds: string[] = [];
    let deletedCount = 0;

    for (const id of imageIds) {
      try {
        await this.remove(id, userId);
        deletedCount++;
      } catch {
        failedIds.push(id);
      }
    }

    return {
      deletedCount,
      failedIds,
      message: `Deleted ${deletedCount} images, ${failedIds.length} failed`,
    };
  }

  async getEventImages(
    eventId: string,
    filters: ImageFiltersDto,
    userId?: string,
  ): Promise<PaginatedResponse<ImageWithStats>> {
    // Verify event access
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        participants: userId ? { where: { userId }, take: 1 } : false,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.isPrivate) {
      const hasAccess =
        userId &&
        (event.createdById === userId ||
          (event.participants && event.participants.length > 0));
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this event');
      }
    }

    return this.findAll({ ...filters, eventId }, userId);
  }
}
