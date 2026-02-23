import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return (this.prisma as any).notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            image: true,
          },
        },
      },
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const count = await (this.prisma as any).notification.count({
      where: { userId, read: false },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return (this.prisma as any).notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return (this.prisma as any).notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async delete(id: string, userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return (this.prisma as any).notification.deleteMany({
      where: { id, userId },
    });
  }
}
