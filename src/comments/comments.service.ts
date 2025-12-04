import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentFiltersDto } from './dto/comment-filters.dto';
import { createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';

export interface UserPublic {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface CommentWithUser {
  id: string;
  imageId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: UserPublic;
}

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  private toUserPublic(user: any): UserPublic {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
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
    filters: CommentFiltersDto,
  ): Promise<PaginatedResponse<CommentWithUser>> {
    const { page = 1, limit = 20, sortOrder = 'desc' } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.imageId) {
      where.imageId = filters.imageId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: { user: true },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return createPaginatedResponse(
      comments.map((c) => this.toCommentWithUser(c)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string): Promise<CommentWithUser> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.toCommentWithUser(comment);
  }

  async create(
    dto: CreateCommentDto,
    userId: string,
  ): Promise<{ comment: CommentWithUser; message: string }> {
    // Verify image exists and user has access
    const image = await this.prisma.image.findUnique({
      where: { id: dto.imageId },
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

    // Check access for private events
    if (image.event.isPrivate) {
      const hasAccess =
        image.event.createdById === userId ||
        image.event.participants.length > 0;
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to comment on this image');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        imageId: dto.imageId,
        userId,
        content: dto.content,
      },
      include: { user: true },
    });

    return {
      comment: this.toCommentWithUser(comment),
      message: 'Comment added successfully',
    };
  }

  async update(
    id: string,
    dto: UpdateCommentDto,
    userId: string,
  ): Promise<CommentWithUser> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Only the comment author can update this comment');
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { content: dto.content },
      include: { user: true },
    });

    return this.toCommentWithUser(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        image: {
          include: { event: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Allow deletion by comment author, image owner, or event creator
    const canDelete =
      comment.userId === userId ||
      comment.image.userId === userId ||
      comment.image.event.createdById === userId;

    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    await this.prisma.comment.delete({ where: { id } });
  }

  async getImageComments(
    imageId: string,
    page: number = 1,
    limit: number = 20,
    userId?: string,
  ): Promise<PaginatedResponse<CommentWithUser>> {
    // Verify image exists and user has access
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      include: {
        event: {
          include: {
            participants: userId ? { where: { userId }, take: 1 } : false,
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Check access for private events
    if (image.event.isPrivate && userId) {
      const hasAccess =
        image.event.createdById === userId ||
        (image.event.participants && image.event.participants.length > 0);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this image');
      }
    } else if (image.event.isPrivate && !userId) {
      throw new ForbiddenException('You do not have access to this image');
    }

    return this.findAll({ imageId, page, limit });
  }
}
