import { Injectable } from '@nestjs/common';
import { ClickHouseService } from './clickhouse.service';
import { RedisService } from './redis.service';
import {
  PlatformAnalytics,
  PostAnalytics,
} from '../modules/analytics/analytics.interface';

export interface PostAnalyticsResult {
  views: number;
  unique_views: number;
  reads: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface PlatformAnalyticsResult {
  posts_today: number;
  posts_approved_today: number;
  posts_rejected_today: number;
  total_engagement_today: number;
}

export interface TrendingPostResult {
  post_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_score: number;
}

export interface ModerationAnalyticsResult {
  date: string;
  approved: number;
  rejected: number;
}

export interface ModeratorActivityResult {
  user_id: string;
  approved_count: number;
  rejected_count: number;
  total_actions: number;
}

export interface ActiveUserResult {
  count: number;
}

export interface GeoDistributionResult {
  location_id: number;
  count: number;
}

/**
 * Analytics Query Service
 * Provides methods to query analytics data from ClickHouse and Redis
 */
@Injectable()
export class AnalyticsQueryService {
  constructor(
    private clickhouseService: ClickHouseService,
    private redisService: RedisService,
  ) {}

  /**
   * Get post-level analytics
   */
  async getPostAnalytics(postId: string): Promise<PostAnalytics> {
    const query = `
      SELECT
        countIf(event = 'post_view') AS views,
        uniqIf(user_id, event = 'post_view') AS unique_views,
        countIf(event = 'post_read') AS reads,
        countIf(event = 'like') AS likes,
        countIf(event = 'comment') AS comments,
        countIf(event = 'share') AS shares
      FROM analytics.events
      WHERE post_id = {postId:UUID}
    `;

    const results = await this.clickhouseService.query<PostAnalyticsResult>(
      query,
      {
        postId,
      },
    );

    const data = results[0] || {
      views: 0,
      unique_views: 0,
      reads: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    const engagement_rate =
      data.views > 0
        ? ((data.likes + data.comments + data.shares) / data.views) * 100
        : 0;

    return {
      post_id: postId,
      views: Number(data.views) || 0,
      unique_views: Number(data.unique_views) || 0,
      reads: Number(data.reads) || 0,
      likes: Number(data.likes) || 0,
      comments: Number(data.comments) || 0,
      shares: Number(data.shares) || 0,
      engagement_rate: Math.round(engagement_rate * 100) / 100,
    };
  }

  /**
   * Get geo distribution for a post
   */
  async getPostGeoDistribution(postId: string) {
    const query = `
      SELECT
        location_id,
        count() AS count
      FROM analytics.events
      WHERE post_id = {postId:UUID}
        AND location_id IS NOT NULL
      GROUP BY location_id
      ORDER BY count DESC
      LIMIT 20
    `;

    return await this.clickhouseService.query<GeoDistributionResult>(query, {
      postId,
    });
  }

  /**
   * Get platform-wide analytics for admin dashboard
   */
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    // Get active users from Redis (fast)
    const [activeToday, activeThisWeek, activeThisMonth] = await Promise.all([
      this.redisService.getActiveUsersCount(),
      this.getActiveUsersCount(7),
      this.getActiveUsersCount(30),
    ]);

    // Get today's metrics from ClickHouse
    const query = `
      SELECT
        countIf(event = 'post_created') AS posts_today,
        countIf(event = 'post_approved') AS posts_approved_today,
        countIf(event = 'post_rejected') AS posts_rejected_today,
        countIf(event IN ('like', 'comment', 'share')) AS total_engagement_today
      FROM analytics.events
      WHERE created_at >= today()
    `;

    const results =
      await this.clickhouseService.query<PlatformAnalyticsResult>(query);
    const data = results[0] || {
      posts_today: 0,
      posts_approved_today: 0,
      posts_rejected_today: 0,
      total_engagement_today: 0,
    };

    return {
      total_users: 0, // This should come from PostgreSQL
      active_users_today: activeToday,
      active_users_week: activeThisWeek,
      active_users_month: activeThisMonth,
      posts_today: Number(data.posts_today) || 0,
      posts_approved_today: Number(data.posts_approved_today) || 0,
      posts_rejected_today: Number(data.posts_rejected_today) || 0,
      total_engagement_today: Number(data.total_engagement_today) || 0,
    };
  }

  /**
   * Get trending posts (last 24 hours)
   */
  async getTrendingPosts(limit: number = 20) {
    const query = `
      SELECT
        post_id,
        countIf(event = 'post_view') AS views,
        countIf(event = 'like') AS likes,
        countIf(event = 'comment') AS comments,
        countIf(event = 'share') AS shares,
        (likes * 3 + comments * 5 + shares * 10) AS engagement_score
      FROM analytics.events
      WHERE created_at >= now() - INTERVAL 24 HOUR
        AND post_id IS NOT NULL
        AND event IN ('post_view', 'like', 'comment', 'share')
      GROUP BY post_id
      ORDER BY engagement_score DESC
      LIMIT {limit:UInt32}
    `;

    return await this.clickhouseService.query<TrendingPostResult>(query, {
      limit,
    });
  }

  /**
   * Get moderation analytics
   */
  async getModerationAnalytics(days: number = 7) {
    const query = `
      SELECT
        toDate(created_at) AS date,
        countIf(event = 'post_approved') AS approved,
        countIf(event = 'post_rejected') AS rejected
      FROM analytics.events
      WHERE created_at >= today() - INTERVAL {days:UInt32} DAY
        AND event IN ('post_approved', 'post_rejected')
      GROUP BY date
      ORDER BY date DESC
    `;

    return await this.clickhouseService.query<ModerationAnalyticsResult>(
      query,
      {
        days,
      },
    );
  }

  /**
   * Get moderator activity
   */
  async getModeratorActivity(days: number = 7) {
    const query = `
      SELECT
        user_id,
        countIf(event = 'post_approved') AS approved_count,
        countIf(event = 'post_rejected') AS rejected_count,
        count() AS total_actions
      FROM analytics.events
      WHERE created_at >= today() - INTERVAL {days:UInt32} DAY
        AND event IN ('post_approved', 'post_rejected')
      GROUP BY user_id
      ORDER BY total_actions DESC
    `;

    return await this.clickhouseService.query<ModeratorActivityResult>(query, {
      days,
    });
  }

  /**
   * Helper: Get active users count for N days
   */
  private async getActiveUsersCount(days: number): Promise<number> {
    const query = `
      SELECT uniq(user_id) AS count
      FROM analytics.events
      WHERE created_at >= today() - INTERVAL {days:UInt32} DAY
    `;

    const results = await this.clickhouseService.query<ActiveUserResult>(
      query,
      {
        days,
      },
    );
    return Number(results[0]?.count) || 0;
  }
}
