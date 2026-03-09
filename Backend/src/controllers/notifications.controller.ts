import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { NotificationsService } from '../services/notifications.service';

@Controller('api/notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Req() req: Request & { user: { id: string } }) {
    return this.notificationsService.findAllForUser(req.user.id);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: Request & { user: { id: string } }) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: Request & { user: { id: string } }) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.notificationsService.delete(id, req.user.id);
  }
}
