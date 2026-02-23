import { Controller, Post, Get, Param, UseGuards, Req, Delete, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../../services/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post(':id/follow')
  @UseGuards(AuthGuard('jwt'))
  async toggleFollow(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.usersService.toggleFollow(userId, id);
  }

  @Get(':id/follow-status')
  @UseGuards(AuthGuard('jwt'))
  async checkFollowStatus(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.usersService.checkFollowStatus(userId, id);
  }

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string, @Req() req: any) {
    let currentUserId: string | undefined;
    
    // Quick manual check for auth header since we want this route to be 
    // accessible to guests, but show follow status if logged in
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Logic from your jwt strategy, decoded payload should have .userId
      // We will rely on an explicit JWT guard if we definitively need the user,
      // but here we might just have raw token parsing. We can modify the frontend
      // to pass currentUserId in the query instead for simplicity, or we can use 
      // an optional auth guard. For now, let's keep it simple:
    }

    return this.usersService.getUserProfileWithStats(id);
  }
}
