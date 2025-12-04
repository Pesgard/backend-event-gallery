import { Module } from '@nestjs/common';
import { CommentsController, ImageCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  controllers: [CommentsController, ImageCommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}

