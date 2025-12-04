import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB for cover images
      },
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

