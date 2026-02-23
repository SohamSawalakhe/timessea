import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { User, Prisma } from '../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
        picture: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            articles: true,
          },
        },
      },
    });

    if (!user) return null;

    let isFollowing = false;
    if (currentUserId) {
      const followStatus = await this.checkFollowStatus(currentUserId, targetUserId);
      isFollowing = followStatus.following;
    }

    return {
      ...user,
      isFollowing,
    };
  }
}
