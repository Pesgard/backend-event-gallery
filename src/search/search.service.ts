import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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

export interface SearchResults {
  events: EventWithStats[];
  images: ImageWithStats[];
  users: UserPublic[];
  total: number;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

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

  async search(
    query: string,
    type: 'all' | 'events' | 'images' | 'users' = 'all',
    page: number = 1,
    limit: number = 20,
    userId?: string,
  ): Promise<SearchResults> {
    const results: SearchResults = {
      events: [],
      images: [],
      users: [],
      total: 0,
    };

    const searchPromises: Promise<void>[] = [];

    // Search events
    if (type === 'all' || type === 'events') {
      searchPromises.push(
        (async () => {
          const eventWhere: any = {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { location: { contains: query, mode: 'insensitive' } },
            ],
          };

          // Only show accessible events
          if (userId) {
            eventWhere.AND = {
              OR: [
                { isPrivate: false },
                { createdById: userId },
                { participants: { some: { userId } } },
              ],
            };
          } else {
            eventWhere.isPrivate = false;
          }

          const events = await this.prisma.event.findMany({
            where: eventWhere,
            take: type === 'events' ? limit : 10,
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
          });

          results.events = events.map((event) => {
            const totalLikes = event.images.reduce(
              (acc, img) => acc + img._count.likes,
              0,
            );
            return this.toEventWithStats({ ...event, totalLikes });
          });
        })(),
      );
    }

    // Search images
    if (type === 'all' || type === 'images') {
      searchPromises.push(
        (async () => {
          const imageWhere: any = {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          };

          // Only show images from accessible events
          if (userId) {
            imageWhere.event = {
              OR: [
                { isPrivate: false },
                { createdById: userId },
                { participants: { some: { userId } } },
              ],
            };
          } else {
            imageWhere.event = { isPrivate: false };
          }

          const images = await this.prisma.image.findMany({
            where: imageWhere,
            take: type === 'images' ? limit : 10,
            orderBy: { uploadedAt: 'desc' },
            include: {
              _count: {
                select: { likes: true, comments: true },
              },
            },
          });

          results.images = images.map((img) => this.toImageWithStats(img));
        })(),
      );
    }

    // Search users
    if (type === 'all' || type === 'users') {
      searchPromises.push(
        (async () => {
          const users = await this.prisma.user.findMany({
            where: {
              OR: [
                { username: { contains: query, mode: 'insensitive' } },
                { fullName: { contains: query, mode: 'insensitive' } },
              ],
            },
            take: type === 'users' ? limit : 10,
          });

          results.users = users.map((user) => this.toUserPublic(user));
        })(),
      );
    }

    await Promise.all(searchPromises);

    results.total =
      results.events.length + results.images.length + results.users.length;

    return results;
  }
}
