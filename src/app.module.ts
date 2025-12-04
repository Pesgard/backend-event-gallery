import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { EventsModule } from './events/events.module';
import { ImagesModule } from './images/images.module';
import { CommentsModule } from './comments/comments.module';
import { UsersModule } from './users/users.module';
import { GalleryModule } from './gallery/gallery.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/jwt/jwt.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UploadModule,
    EventsModule,
    ImagesModule,
    CommentsModule,
    UsersModule,
    GalleryModule,
    SearchModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    // Make JWT guard global but allow @Public() decorator to bypass
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
