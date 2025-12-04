import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.update(id, dto, user.userId, avatar);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.usersService.remove(id, user.userId);
    return { message: 'Account deleted successfully' };
  }

  @Public()
  @Get(':id/statistics')
  async getStatistics(@Param('id') id: string) {
    return this.usersService.getStatistics(id);
  }

  @Public()
  @Get(':id/events')
  async getUserEvents(
    @Param('id') id: string,
    @Query() filters: PaginationDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.usersService.getUserEvents(id, filters, user?.userId);
  }

  @Public()
  @Get(':id/images')
  async getUserImages(
    @Param('id') id: string,
    @Query() filters: PaginationDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.usersService.getUserImages(id, filters, user?.userId);
  }

  @Public()
  @Get(':id/liked-images')
  async getUserLikedImages(
    @Param('id') id: string,
    @Query() filters: PaginationDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.usersService.getUserLikedImages(id, filters, user?.userId);
  }
}
