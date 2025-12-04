import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateEventDto, EventCategory } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventFiltersDto } from './dto/event-filters.dto';
import { generateInviteCode } from '../common/utils/invite-code.util';
import { createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';

// Response types
export interface UserPublic {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
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

export interface EventDetail extends EventWithStats {
  creator: UserPublic;
  participants: UserPublic[];
  isParticipant: boolean;
}

@Injectable()
export class EventsService {
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
      participantCount: event._count?.participants || event.participantCount || 0,
      imageCount: event._count?.images || event.imageCount || 0,
      totalLikes: event.totalLikes || 0,
    };
  }

  private toEventDetail(event: any, userId?: string): EventDetail {
    const isParticipant = userId
      ? event.participants?.some((p: any) => p.userId === userId) || false
      : false;

    return {
      ...this.toEventWithStats(event),
      creator: this.toUserPublic(event.creator),
      participants: event.participants?.map((p: any) => this.toUserPublic(p.user)) || [],
      isParticipant,
    };
  }

  async findAll(
    filters: EventFiltersDto,
    userId?: string,
  ): Promise<PaginatedResponse<EventWithStats>> {
    const { page = 1, limit = 20, sortBy, sortOrder = 'desc' } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.isPrivate !== undefined) {
      where.isPrivate = filters.isPrivate;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.startDate) {
      where.date = { ...where.date, gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.date = { ...where.date, lte: new Date(filters.endDate) };
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    // Only show public events or events user is participant of
    if (userId) {
      where.OR = [
        { isPrivate: false },
        { createdById: userId },
        { participants: { some: { userId } } },
      ];
    } else {
      where.isPrivate = false;
    }

    const orderBy: any = {};
    if (sortBy && ['date', 'createdAt', 'name'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.date = sortOrder;
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              participants: true,
              images: true,
            },
          },
          images: {
            select: {
              _count: {
                select: { likes: true },
              },
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

  async findOne(id: string, userId?: string): Promise<EventDetail> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        creator: true,
        participants: {
          include: { user: true },
        },
        _count: {
          select: {
            participants: true,
            images: true,
          },
        },
        images: {
          select: {
            _count: {
              select: { likes: true },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check access for private events
    if (event.isPrivate && userId) {
      const isParticipant =
        event.createdById === userId ||
        event.participants.some((p) => p.userId === userId);
      if (!isParticipant) {
        throw new ForbiddenException('You do not have access to this event');
      }
    } else if (event.isPrivate && !userId) {
      throw new ForbiddenException('You do not have access to this event');
    }

    const totalLikes = event.images.reduce(
      (acc, img) => acc + img._count.likes,
      0,
    );

    return this.toEventDetail({ ...event, totalLikes }, userId);
  }

  async create(
    dto: CreateEventDto,
    userId: string,
    coverImage?: Express.Multer.File,
  ): Promise<EventDetail> {
    let coverImageUrl: string | null = null;
    let coverImageKey: string | null = null;

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let codeExists = await this.prisma.event.findUnique({
      where: { inviteCode },
    });
    while (codeExists) {
      inviteCode = generateInviteCode();
      codeExists = await this.prisma.event.findUnique({
        where: { inviteCode },
      });
    }

    // Create event first to get ID for cover image path
    const event = await this.prisma.event.create({
      data: {
        name: dto.name,
        description: dto.description,
        date: new Date(dto.date),
        time: dto.time,
        location: dto.location,
        category: dto.category || 'other',
        isPrivate: dto.isPrivate || false,
        maxParticipants: dto.maxParticipants,
        inviteCode,
        createdById: userId,
      },
      include: {
        creator: true,
        participants: {
          include: { user: true },
        },
        _count: {
          select: {
            participants: true,
            images: true,
          },
        },
      },
    });

    // Upload cover image if provided
    if (coverImage) {
      const uploadResult = await this.uploadService.uploadEventCover(
        coverImage,
        event.id,
      );
      coverImageUrl = uploadResult.url;
      coverImageKey = uploadResult.key;

      await this.prisma.event.update({
        where: { id: event.id },
        data: { coverImageUrl, coverImageKey },
      });
    }

    // Creator automatically becomes participant
    await this.prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId,
      },
    });

    return this.findOne(event.id, userId);
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    userId: string,
    coverImage?: Express.Multer.File,
  ): Promise<EventDetail> {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.createdById !== userId) {
      throw new ForbiddenException('Only the event creator can update this event');
    }

    let coverImageUrl = event.coverImageUrl;
    let coverImageKey = event.coverImageKey;

    // Upload new cover image if provided
    if (coverImage) {
      // Delete old cover image
      if (event.coverImageKey) {
        await this.uploadService.deleteFile(event.coverImageKey);
      }

      const uploadResult = await this.uploadService.uploadEventCover(
        coverImage,
        event.id,
      );
      coverImageUrl = uploadResult.url;
      coverImageKey = uploadResult.key;
    }

    await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.time !== undefined && { time: dto.time }),
        ...(dto.location && { location: dto.location }),
        ...(dto.category && { category: dto.category }),
        ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
        ...(dto.maxParticipants !== undefined && {
          maxParticipants: dto.maxParticipants,
        }),
        coverImageUrl,
        coverImageKey,
      },
    });

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        images: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.createdById !== userId) {
      throw new ForbiddenException('Only the event creator can delete this event');
    }

    // Delete all associated files from S3
    const keysToDelete: string[] = [];
    if (event.coverImageKey) keysToDelete.push(event.coverImageKey);
    event.images.forEach((img) => {
      keysToDelete.push(img.imageKey);
      if (img.thumbnailKey) keysToDelete.push(img.thumbnailKey);
    });

    await this.uploadService.deleteFiles(keysToDelete);

    // Delete event (cascades to participants, images, etc.)
    await this.prisma.event.delete({ where: { id } });
  }

  async join(id: string, userId: string): Promise<EventDetail> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        _count: { select: { participants: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if already participant
    const existingParticipant = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: { eventId: id, userId },
      },
    });

    if (existingParticipant) {
      throw new BadRequestException('You are already a participant of this event');
    }

    // Check max participants
    if (
      event.maxParticipants &&
      event._count.participants >= event.maxParticipants
    ) {
      throw new BadRequestException('Event has reached maximum participants');
    }

    await this.prisma.eventParticipant.create({
      data: {
        eventId: id,
        userId,
      },
    });

    return this.findOne(id, userId);
  }

  async joinByCode(inviteCode: string, userId: string): Promise<EventDetail> {
    const event = await this.prisma.event.findUnique({
      where: { inviteCode },
    });

    if (!event) {
      throw new NotFoundException('Invalid invite code');
    }

    return this.join(event.id, userId);
  }

  async leave(id: string, userId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.createdById === userId) {
      throw new BadRequestException('Event creator cannot leave the event');
    }

    const participant = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: { eventId: id, userId },
      },
    });

    if (!participant) {
      throw new BadRequestException('You are not a participant of this event');
    }

    await this.prisma.eventParticipant.delete({
      where: { id: participant.id },
    });
  }

  async getParticipants(id: string, userId?: string): Promise<any[]> {
    await this.findOne(id, userId);

    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId: id },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });

    return participants.map((p) => ({
      id: p.id,
      eventId: p.eventId,
      userId: p.userId,
      joinedAt: p.joinedAt.toISOString(),
      user: this.toUserPublic(p.user),
    }));
  }

  async validateInviteCode(inviteCode: string): Promise<any> {
    const event = await this.prisma.event.findUnique({
      where: { inviteCode },
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
    });

    if (!event) {
      return { valid: false, reason: 'Invalid invite code' };
    }

    const totalLikes = event.images.reduce(
      (acc, img) => acc + img._count.likes,
      0,
    );

    const isFull =
      event.maxParticipants &&
      event._count.participants >= event.maxParticipants;

    return {
      valid: true,
      event: this.toEventWithStats({ ...event, totalLikes }),
      canJoin: !isFull,
      reason: isFull ? 'Event is full' : undefined,
    };
  }

  async getStatistics(id: string, userId?: string): Promise<any> {
    await this.findOne(id, userId); // Verify access

    const stats = await this.prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { participants: true, images: true },
        },
        images: {
          include: {
            _count: {
              select: { likes: true, comments: true },
            },
          },
        },
      },
    });

    const totalLikes = stats!.images.reduce(
      (acc, img) => acc + img._count.likes,
      0,
    );
    const totalComments = stats!.images.reduce(
      (acc, img) => acc + img._count.comments,
      0,
    );

    return {
      participantCount: stats!._count.participants,
      imageCount: stats!._count.images,
      totalLikes,
      totalComments,
    };
  }
}
