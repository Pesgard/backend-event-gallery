import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventFiltersDto } from './dto/event-filters.dto';
import { JoinByCodeDto } from './dto/join-event.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get()
  async findAll(
    @Query() filters: EventFiltersDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.eventsService.findAll(filters, user?.userId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('coverImage'))
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    return this.eventsService.create(dto, user.userId, coverImage);
  }

  @Public()
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.eventsService.findOne(id, user?.userId);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('coverImage'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    return this.eventsService.update(id, dto, user.userId, coverImage);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.eventsService.remove(id, user.userId);
    return { message: 'Event deleted successfully' };
  }

  @Post(':id/join')
  async join(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const event = await this.eventsService.join(id, user.userId);
    return { event, message: 'Successfully joined the event' };
  }

  @Post('join-by-code')
  async joinByCode(
    @Body() dto: JoinByCodeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const event = await this.eventsService.joinByCode(dto.inviteCode, user.userId);
    return { event, message: 'Successfully joined the event' };
  }

  @Delete(':id/leave')
  async leave(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.eventsService.leave(id, user.userId);
    return { message: 'Successfully left the event' };
  }

  @Public()
  @Get(':id/participants')
  async getParticipants(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.eventsService.getParticipants(id, user?.userId);
  }

  @Post('validate-invite')
  async validateInvite(@Body() dto: JoinByCodeDto) {
    return this.eventsService.validateInviteCode(dto.inviteCode);
  }

  @Public()
  @Get(':id/statistics')
  async getStatistics(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.eventsService.getStatistics(id, user?.userId);
  }
}
