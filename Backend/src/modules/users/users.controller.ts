import {
  Controller,
  Post,
  Get,
  Patch,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    userId?: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== SUPERADMIN-ONLY USER MANAGEMENT ====================

  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERADMIN')
  async getAllUsers() {
    return this.usersService.getAllUsersForAdmin();
  }

  @Patch(':id/role')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERADMIN')
  async changeUserRole(
    @Param('id') targetUserId: string,
    @Body() body: { role: string },
    @Req() req: RequestWithUser,
  ) {
    const requesterId = req.user?.id || req.user?.userId;
    if (!requesterId) {
      throw new BadRequestException('User ID not found in token');
    }
    if (!body.role) {
      throw new BadRequestException('Role is required');
    }
    return this.usersService.changeUserRole(
      requesterId,
      targetUserId,
      body.role,
    );
  }

  @Patch(':id/ban')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERADMIN')
  async toggleBan(
    @Param('id') targetUserId: string,
    @Req() req: RequestWithUser,
  ) {
    const requesterId = req.user?.id || req.user?.userId;
    if (!requesterId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.usersService.toggleBan(requesterId, targetUserId);
  }

  @Patch(':id/warn')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERADMIN')
  async warnUser(
    @Param('id') targetUserId: string,
    @Req() req: RequestWithUser,
  ) {
    const requesterId = req.user?.id || req.user?.userId;
    if (!requesterId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.usersService.warnUser(requesterId, targetUserId);
  }

  // ==================== PUBLIC/USER ENDPOINTS ====================

  @Get('search')
  async searchUsers(@Query('q') query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.usersService.searchUsers(query.trim());
  }

  @Post('topics/follow')
  @UseGuards(AuthGuard('jwt'))
  async toggleTopicFollow(
    @Body('category') category: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    if (!category) {
      throw new BadRequestException('Category is required');
    }
    return this.usersService.toggleTopicFollow(userId, category);
  }

  @Get('topics/followed')
  @UseGuards(AuthGuard('jwt'))
  async getFollowedTopics(@Req() req: RequestWithUser) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.usersService.getFollowedTopics(userId);
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
}
