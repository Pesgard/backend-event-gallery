/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  fileUrl: string;
  fileKey: string;
  expiresIn: number;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 400;
const THUMBNAIL_QUALITY = 80;

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET', '');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });
  }

  private getFileUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private validateMimeType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: JPEG, PNG, GIF, WEBP',
      );
    }
  }

  private validateFileSize(
    size: number,
    type: 'image' | 'cover' | 'avatar',
  ): void {
    const maxSize =
      type === 'avatar'
        ? MAX_AVATAR_SIZE
        : type === 'cover'
          ? MAX_COVER_SIZE
          : MAX_IMAGE_SIZE;
    if (size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${maxSize / 1024 / 1024}MB)`,
      );
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return extensions[mimeType] || 'jpg';
  }

  async uploadEventImage(
    file: Express.Multer.File,
    eventId: string,
  ): Promise<{
    image: UploadResult;
    thumbnail: UploadResult;
    metadata: ImageMetadata;
  }> {
    this.validateMimeType(file.mimetype);
    this.validateFileSize(file.size, 'image');

    const imageId = uuidv4();
    const ext = this.getExtensionFromMimeType(file.mimetype);

    // Get image metadata
    const metadata = await sharp(file.buffer).metadata();
    const imageMetadata: ImageMetadata = {
      width: metadata.width || 0,
      height: metadata.height || 0,
      fileSize: file.size,
      mimeType: file.mimetype,
    };

    // Upload original image
    const imageKey = `events/${eventId}/images/${imageId}.${ext}`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: imageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    // Generate and upload thumbnail
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    const thumbnailKey = `events/${eventId}/thumbnails/${imageId}.jpg`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      }),
    );

    return {
      image: {
        url: this.getFileUrl(imageKey),
        key: imageKey,
        bucket: this.bucket,
      },
      thumbnail: {
        url: this.getFileUrl(thumbnailKey),
        key: thumbnailKey,
        bucket: this.bucket,
      },
      metadata: imageMetadata,
    };
  }

  async uploadEventCover(
    file: Express.Multer.File,
    eventId: string,
  ): Promise<UploadResult> {
    this.validateMimeType(file.mimetype);
    this.validateFileSize(file.size, 'cover');

    const ext = this.getExtensionFromMimeType(file.mimetype);
    const key = `events/${eventId}/cover.${ext}`;

    // Optimize cover image
    const optimizedBuffer = await sharp(file.buffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: optimizedBuffer,
        ContentType: 'image/jpeg',
      }),
    );

    return {
      url: this.getFileUrl(key),
      key,
      bucket: this.bucket,
    };
  }

  async uploadUserAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadResult> {
    this.validateMimeType(file.mimetype);
    this.validateFileSize(file.size, 'avatar');

    const key = `users/${userId}/avatar.jpg`;

    // Optimize avatar
    const optimizedBuffer = await sharp(file.buffer)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: optimizedBuffer,
        ContentType: 'image/jpeg',
      }),
    );

    return {
      url: this.getFileUrl(key),
      key,
      bucket: this.bucket,
    };
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch {
      // Ignore errors when deleting (file might not exist)
    }
  }

  async deleteFiles(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.deleteFile(key)));
  }

  async getPresignedUploadUrl(
    fileName: string,
    fileType: string,
    fileSize: number,
    uploadType: 'event-cover' | 'image' | 'avatar',
    eventId?: string,
  ): Promise<PresignedUrlResult> {
    this.validateMimeType(fileType);
    this.validateFileSize(
      fileSize,
      uploadType === 'avatar'
        ? 'avatar'
        : uploadType === 'event-cover'
          ? 'cover'
          : 'image',
    );

    const ext = this.getExtensionFromMimeType(fileType);
    const id = uuidv4();
    let key: string;

    switch (uploadType) {
      case 'event-cover':
        if (!eventId) {
          throw new BadRequestException('eventId required for event-cover');
        }
        key = `events/${eventId}/cover.${ext}`;
        break;
      case 'image':
        if (!eventId) {
          throw new BadRequestException('eventId required for image');
        }
        key = `events/${eventId}/images/${id}.${ext}`;
        break;
      case 'avatar':
        key = `users/${id}/avatar.${ext}`;
        break;
    }

    const expiresIn = 300; // 5 minutes

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      uploadUrl,
      fileUrl: this.getFileUrl(key),
      fileKey: key,
      expiresIn,
    };
  }

  async checkS3Connection(): Promise<boolean> {
    try {
      // Try to get bucket info with a simple head request
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: 'health-check-test',
        }),
      );
      return true;
    } catch (error: any) {
      // NotFound is acceptable - it means we can connect to S3
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return true;
      }
      return false;
    }
  }
}
