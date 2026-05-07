import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { User, Prisma, Role } from '../generated/prisma/client';
import { RedisService } from './redis.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async findOne(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    if (data.handle === '') {
      data.handle = null;
    }
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('You cannot follow yourself');
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await this.prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      return { following: false };
    }

    // Follow
    await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // Create a notification for the person being followed
    const followerUser = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: { name: true, picture: true },
    });

    if (followerUser) {
      await this.prisma.notification.create({
        data: {
          userId: followingId,
          type: 'follow',
          title: 'New Follower',
          message: 'started following you',
          actorId: followerId,
          actorName: followerUser.name,
          actorPicture: followerUser.picture,
        },
      });
    }

    return { following: true };
  }

  async toggleTopicFollow(userId: string, category: string) {
    const existing = await this.prisma.topicFollow.findUnique({
      where: {
        userId_category: {
          userId,
          category,
        },
      },
    });

    if (existing) {
      await this.prisma.topicFollow.delete({
        where: { id: existing.id },
      });
      // Invalidate the for-you recommendation cache for this user
      try {
        await this.redisService.getClient().del(`user_foryou_prefs:${userId}`);
      } catch (err) {
        console.warn('Failed to invalidate for-you cache:', err);
      }
      return { following: false };
    }

    await this.prisma.topicFollow.create({
      data: {
        userId,
        category,
      },
    });

    // Invalidate the for-you recommendation cache for this user
    // so their feed updates instantly with the new followed topic
    try {
      await this.redisService.getClient().del(`user_foryou_prefs:${userId}`);
    } catch (err) {
      console.warn('Failed to invalidate for-you cache:', err);
    }

    return { following: true };
  }

  async getFollowedTopics(userId: string) {
    const follows = await this.prisma.topicFollow.findMany({
      where: { userId },
      select: { category: true },
    });
    return follows.map((f) => f.category);
  }

  async checkFollowStatus(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
    return { following: !!follow };
  }

  async getUserProfileWithStats(targetUserId: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        role: true,
        picture: true,
        coverImage: true,
        bio: true,
        handle: true,
        location: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            articles: true,
            reviews: {
              where: { status: 'Approved' },
            },
          },
        },
        warnings: true,
      },
    });

    if (!user) return null;

    let isFollowing = false;
    if (currentUserId) {
      const followStatus = await this.checkFollowStatus(
        currentUserId,
        targetUserId,
      );
      isFollowing = followStatus.following;
    }

    return {
      ...user,
      isFollowing,
    };
  }

  async searchUsers(query: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { handle: { contains: query, mode: 'insensitive' } },
        ],
        AND: [
          { banned: false }
        ]
      },
      select: {
        id: true,
        name: true,
        handle: true,
        picture: true,
        bio: true,
        role: true,
      },
      take: 20,
    });
  }

  async getFollowers(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: {
        follower: {
          select: {
            id: true,
            name: true,
            picture: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return follows.map((f) => ({
      ...f.follower,
      followedAt: f.createdAt,
    }));
  }

  async getFollowing(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: {
        following: {
          select: {
            id: true,
            name: true,
            picture: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return follows.map((f) => ({
      ...f.following,
      followedAt: f.createdAt,
    }));
  }

  // ==================== SUPERADMIN-ONLY USER MANAGEMENT ====================

  async getAllUsersForAdmin() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        role: true,
        banned: true,
        createdAt: true,
        _count: {
          select: {
            articles: true,
            followers: true,
            following: true,
            reviews: {
              where: { status: 'Approved' },
            },
          },
        },
        warnings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async changeUserRole(
    requesterId: string,
    targetUserId: string,
    newRole: string,
  ) {
    // Prevent self-demotion
    if (requesterId === targetUserId) {
      throw new ForbiddenException('You cannot change your own role.');
    }

    // Only allow assigning USER or ADMIN — never SUPERADMIN via API
    const allowedRoles: string[] = ['USER', 'ADMIN'];
    if (!allowedRoles.includes(newRole)) {
      throw new BadRequestException(
        `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`,
      );
    }

    // Make sure target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    // Don't allow changing another SUPERADMIN's role
    if (targetUser.role === 'SUPERADMIN') {
      throw new ForbiddenException(
        'Cannot modify the role of another Super Admin.',
      );
    }

    // Apply the role change
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole as Role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return updatedUser;
  }

  async toggleBan(requesterId: string, targetUserId: string) {
    // Prevent self-ban
    if (requesterId === targetUserId) {
      throw new ForbiddenException('You cannot ban yourself.');
    }

    // Make sure target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    // Don't allow banning another SUPERADMIN
    if (targetUser.role === 'SUPERADMIN') {
      throw new ForbiddenException('Cannot ban a Super Admin.');
    }

    const newBannedStatus = !targetUser.banned;
    
    // If banning, revoke all active sessions immediately
    if (newBannedStatus) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: targetUserId }
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { 
        banned: newBannedStatus,
        warnings: newBannedStatus ? undefined : 0 // Reset warnings to 0 when unbanned
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        warnings: true,
      },
    });

    // Notify the user about their status change
    await this.prisma.notification.create({
      data: {
        userId: targetUserId,
        type: newBannedStatus ? 'ban' : 'unban',
        title: newBannedStatus ? 'Account Suspended' : 'Account Restored',
        message: newBannedStatus 
          ? 'Your account has been suspended for violating community guidelines.' 
          : 'Your account has been restored. You can now access all features again.',
      },
    }).catch(() => {}); // Ignore notification errors for banned users if needed

    return updatedUser;
  }

  async warnUser(requesterId: string, targetUserId: string) {
    // Prevent self-warning
    if (requesterId === targetUserId) {
      throw new ForbiddenException('You cannot warn yourself.');
    }

    // Make sure target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    // Don't allow warning a SUPERADMIN
    if (targetUser.role === 'SUPERADMIN') {
      throw new ForbiddenException('Cannot warn a Super Admin.');
    }

    // If already banned, don't allow further warnings
    if (targetUser.banned) {
      throw new BadRequestException('User is already banned.');
    }

    const newWarnings = Math.min(targetUser.warnings + 1, 3);
    const shouldBan = newWarnings >= 3;

    // Apply updates
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        warnings: newWarnings,
        banned: shouldBan,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        warnings: true,
      },
    });

    // If this warning triggered a ban, revoke all sessions
    if (shouldBan) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: targetUserId }
      });
    }

    // Notify the user about the warning
    await this.prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'warning',
        title: shouldBan ? 'Account Permanently Suspended' : 'New Account Warning',
        message: shouldBan 
          ? `You have reached the maximum warning limit (3/3). Your account has been permanently suspended.`
          : `You have received an official warning. Total: ${newWarnings}/3. Reaching 3 warnings will result in a permanent account ban.`,
      },
    });

    return updatedUser;
  }
}
