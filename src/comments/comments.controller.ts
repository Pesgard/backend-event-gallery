import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentFiltersDto } from './dto/comment-filters.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get()
  async findAll(@Query() filters: CommentFiltersDto) {
    return this.commentsService.findAll(filters);
  }

  @Post()
  async create(
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commentsService.create(dto, user.userId);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commentsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.commentsService.remove(id, user.userId);
    return { message: 'Comment deleted successfully' };
  }
}

// Separate controller for image comments route
@Controller('images')
export class ImageCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get(':imageId/comments')
  async getImageComments(
    @Param('imageId') imageId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.commentsService.getImageComments(
      imageId,
      page || 1,
      limit || 20,
      user?.userId,
    );
  }
}
