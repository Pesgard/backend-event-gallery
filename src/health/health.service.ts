import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'connected' | 'disconnected';
  s3: 'connected' | 'disconnected';
  uptime: number;
}

export interface DatabaseHealth {
  status: 'ok' | 'error';
  latency: number;
}

@Injectable()
export class HealthService {
  private startTime: Date;

  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {
    this.startTime = new Date();
  }

  async check(): Promise<HealthStatus> {
    const [dbStatus, s3Status] = await Promise.all([
      this.checkDatabase(),
      this.checkS3(),
    ]);

    const uptimeSeconds = Math.floor(
      (Date.now() - this.startTime.getTime()) / 1000,
    );

    return {
      status: dbStatus.status === 'ok' && s3Status ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: dbStatus.status === 'ok' ? 'connected' : 'disconnected',
      s3: s3Status ? 'connected' : 'disconnected',
      uptime: uptimeSeconds,
    };
  }

  async checkDatabase(): Promise<DatabaseHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        latency: Date.now() - start,
      };
    } catch {
      return {
        status: 'error',
        latency: Date.now() - start,
      };
    }
  }

  async checkS3(): Promise<boolean> {
    try {
      return await this.uploadService.checkS3Connection();
    } catch {
      return false;
    }
  }
}
