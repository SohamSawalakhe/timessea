import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  Query,
  Body,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../../services/users.service';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    userId?: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post(':id/follow')
  @UseGuards(AuthGuard('jwt'))
  async toggleFollow(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.usersService.toggleFollow(userId, id);
  }

  @Get(':id/follow-status')
  @UseGuards(AuthGuard('jwt'))
  async checkFollowStatus(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.usersService.checkFollowStatus(userId, id);
  }

  @Get(':id/profile')
  async getUserProfile(
    @Param('id') id: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.usersService.getUserProfileWithStats(id, currentUserId);
  }

  @Get(':id/followers')
  async getFollowers(@Param('id') id: string) {
    return this.usersService.getFollowers(id);
  }

  @Get(':id/following')
  async getFollowing(@Param('id') id: string) {
    return this.usersService.getFollowing(id);
  }

  @Post('profile/update')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body()
    body: {
      name?: string;
      bio?: string;
      handle?: string;
      picture?: string;
      coverImage?: string;
      location?: string;
    },
  ) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.usersService.update(userId, body);
  }
}
