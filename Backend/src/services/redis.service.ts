import Redis from 'ioredis';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Redis Client Service
 * Manages Redis connection for queues and live counters
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.client.on('error', (error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Redis connection error:', errorMessage);
    });

    await Promise.resolve(); // Silence 'no await' warning
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Increment live counter (e.g., post views)
   */
  async incrementCounter(key: string, ttl?: number): Promise<number> {
    const value = await this.client.incr(key);
    if (ttl) {
      await this.client.expire(key, ttl);
    }
    return value;
  }

  /**
   * Add user to active users set for today
   */
  async trackActiveUser(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `active_users:${today}`;
    await this.client.sadd(key, userId);
    await this.client.expire(key, 86400 * 7); // Keep for 7 days
  }

  /**
   * Get active users count for a specific date
   */
  async getActiveUsersCount(date?: string): Promise<number> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const key = `active_users:${targetDate}`;
    return await this.client.scard(key);
  }

  /**
   * Track online admin/moderator
   */
  async trackOnlineAdmin(adminId: string, ttl: number = 300): Promise<void> {
    await this.client.sadd('admin:online', adminId);
    await this.client.expire('admin:online', ttl);
  }

  /**
   * Get online admins count
   */
  async getOnlineAdminsCount(): Promise<number> {
    return await this.client.scard('admin:online');
  }

  /**
   * Add to user view/read history (Instant tracking)
   */
  async addToUserHistory(userId: string, type: 'view' | 'read', postId: string) {
    const key = `user:${userId}:history:${type}s`;
    const score = Date.now();
    await this.client.zadd(key, score, postId);
    // Keep only the last 100 items to prevent unbounded growth
    await this.client.zremrangebyrank(key, 0, -101);
  }

  /**
   * Get total count of user history from Redis
   */
  async getUserHistoryCount(userId: string, type: 'view' | 'read'): Promise<number> {
    return await this.client.zcard(`user:${userId}:history:${type}s`);
  }

  /**
   * Get paginated user history from Redis
   */
  async getUserHistory(userId: string, type: 'view' | 'read', limit = 20, offset = 0) {
    const key = `user:${userId}:history:${type}s`;
    const results = await this.client.zrevrange(key, offset, offset + limit - 1, 'WITHSCORES');
    const history: Array<{ postId: string; timestamp: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      history.push({ postId: results[i], timestamp: parseInt(results[i + 1], 10) });
    }
    return history;
  }
}
