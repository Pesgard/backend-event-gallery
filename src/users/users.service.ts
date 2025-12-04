import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

export interface UserPublic {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface User extends UserPublic {
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStatistics {
  userId: string;
  username: string;
  email: string;
  eventsCreated: number;
  eventsJoined: number;
  imagesUploaded: number;
  imagesLiked: number;
}

export interface EventWithStats {
  id: string;
  name: string;
  description: string | null;
  date: string;
  time: string | null;
  location: string;
  category: string;
  isPrivate: boolean;
  maxParticipants: number | null;
  coverImageUrl: string | null;
  coverImageKey: string | null;
  inviteCode: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  imageCount: number;
  totalLikes: number;
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

@Injectable()
export class UsersService {
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

  private toUser(user: any): User {
    return {
      ...this.toUserPublic(user),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private toEventWithStats(event: any): EventWithStats {
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      date: event.date.toISOString(),
      time: event.time,
      location: event.location,
      category: event.category,
      isPrivate: event.isPrivate,
      maxParticipants: event.maxParticipants,
      coverImageUrl: event.coverImageUrl,
      coverImageKey: event.coverImageKey,
      inviteCode: event.inviteCode,
      createdById: event.createdById,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      participantCount: event._count?.participants || 0,
      imageCount: event._count?.images || 0,
      totalLikes: event.totalLikes || 0,
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
      likeCount: image._count?.likes || 0,
      commentCount: image._count?.comments || 0,
    };
  }

  async findOne(id: string): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserPublic(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUserId: string,
    avatarFile?: Express.Multer.File,
  ): Promise<User> {
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let avatarUrl = user.avatarUrl;
    let avatarKey = user.avatarKey;

    // Upload new avatar if provided
    if (avatarFile) {
      // Delete old avatar
      if (user.avatarKey) {
        await this.uploadService.deleteFile(user.avatarKey);
      }

      const uploadResult = await this.uploadService.uploadUserAvatar(
        avatarFile,
        user.id,
      );
      avatarUrl = uploadResult.url;
      avatarKey = uploadResult.key;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        avatarUrl,
        avatarKey,
      },
    });

    return this.toUser(updated);
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only delete your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        images: true,
        eventsCreated: {
          include: { images: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Collect all S3 keys to delete
    const keysToDelete: string[] = [];
    if (user.avatarKey) keysToDelete.push(user.avatarKey);

    user.images.forEach((img) => {
      keysToDelete.push(img.imageKey);
      if (img.thumbnailKey) keysToDelete.push(img.thumbnailKey);
    });

    user.eventsCreated.forEach((event) => {
      if (event.coverImageKey) keysToDelete.push(event.coverImageKey);
      event.images.forEach((img) => {
        keysToDelete.push(img.imageKey);
        if (img.thumbnailKey) keysToDelete.push(img.thumbnailKey);
      });
    });

    await this.uploadService.deleteFiles(keysToDelete);

    // Delete user (cascades to everything)
    await this.prisma.user.delete({ where: { id } });
  }

  async getStatistics(id: string): Promise<UserStatistics> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [eventsCreated, eventsJoined, imagesUploaded, imagesLiked] =
      await Promise.all([
        this.prisma.event.count({ where: { createdById: id } }),
        this.prisma.eventParticipant.count({ where: { userId: id } }),
        this.prisma.image.count({ where: { userId: id } }),
        this.prisma.imageLike.count({ where: { userId: id } }),
      ]);

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      eventsCreated,
      eventsJoined,
      imagesUploaded,
      imagesLiked,
    };
  }

  async getUserEvents(
    id: string,
    filters: PaginationDto,
    currentUserId?: string,
  ): Promise<PaginatedResponse<EventWithStats>> {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get events created by user + events user joined
    const where: any = {
      OR: [
        { createdById: id },
        { participants: { some: { userId: id } } },
      ],
    };

    // If not the same user, only show public events
    if (id !== currentUserId) {
      where.isPrivate = false;
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          _count: {
            select: { participants: true, images: true },
          },
          images: {
            select: {
              _count: { select: { likes: true } },
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const eventsWithStats = events.map((event) => {
      const totalLikes = event.images.reduce(
        (acc, img) => acc + img._count.likes,
        0,
      );
      return this.toEventWithStats({ ...event, totalLikes });
    });

    return createPaginatedResponse(eventsWithStats, total, page, limit);
  }

  async getUserImages(
    id: string,
    filters: PaginationDto,
    currentUserId?: string,
  ): Promise<PaginatedResponse<ImageWithStats>> {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: any = { userId: id };

    // If not the same user, only show images from public events
    if (id !== currentUserId) {
      where.event = { isPrivate: false };
    }

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

  async getUserLikedImages(
    id: string,
    filters: PaginationDto,
    currentUserId?: string,
  ): Promise<PaginatedResponse<ImageWithStats>> {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only show liked images if same user or from public events
    const where: any = {
      likes: { some: { userId: id } },
    };

    if (id !== currentUserId) {
      where.event = { isPrivate: false };
    }

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
}
