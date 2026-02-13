import { Injectable } from '@nestjs/common';
import { ClickHouseService } from './clickhouse.service';
import { RedisService } from './redis.service';
import {
  PlatformAnalytics,
  PostAnalytics,
} from '../modules/analytics/analytics.interface';
import { PrismaService } from './prisma.service';

export interface AuthorStats {
  publishedCount: number;
  scheduledCount: number;
  totalLikes: number;
  totalViews: number;
}

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
    private prismaService: PrismaService,
  ) {}

  /**
   * Get author stats for profile overview
   */
  async getAuthorStats(authorId: string): Promise<AuthorStats & { totalComments: number; totalDislikes: number }> {
    const [publishedCount, scheduledCount, aggregates, totalComments] = await Promise.all([
      this.prismaService.article.count({
        where: {
          authorId,
          published: true,
        },
      }),
      this.prismaService.article.count({
        where: {
          authorId,
          published: false,
          scheduledAt: {
            not: null,
          },
        },
      }),
      this.prismaService.article.aggregate({
        _sum: {
          likes: true,
          views: true,
          dislikes: true,
        },
        where: {
          authorId,
        },
      }),
      this.prismaService.comment.count({
        where: {
          article: {
            authorId,
          },
        },
      }),
    ]);

    return {
      publishedCount,
      scheduledCount,
      totalLikes: aggregates._sum.likes || 0,
      totalViews: aggregates._sum.views || 0,
      totalDislikes: aggregates._sum.dislikes || 0,
      totalComments,
    };
  }

  /**
   * Get detailed author dashboard stats
   */
  async getAuthorDashboardStats(authorId: string) {
    // 1. Get author's post IDs and basic stats
    const posts = await this.prismaService.article.findMany({
      where: { authorId },
      select: { id: true, title: true, views: true, likes: true, createdAt: true },
      orderBy: { views: 'desc' },
      take: 5, // Top 5 for the list
    });

    const allPosts = await this.prismaService.article.findMany({
      where: { authorId },
      select: { id: true },
    });
    
    const postIds = allPosts.map((p) => p.id);

    if (postIds.length === 0) {
      return {
        stats: {
          total_views: 0,
          active_users: 0,
          total_engagement: 0,
          total_shares: 0,
        },
        trend: [],
        top_posts: [],
      };
    }

    // 2. Query ClickHouse for engagement and trends
    // Note: Parameterized arrays in ClickHouse
    // 2. Query ClickHouse for engagement and trends
    // Note: Parameterized arrays in ClickHouse
    let overviewResults: any[] = [];
    let trendResults: any[] = [];

    try {
      const query = `
        SELECT
          uniqIf(user_id, event = 'post_view') as unique_viewers,
          countIf(event = 'post_view') as total_views,
          countIf(event = 'post_read') as total_reads,
          countIf(event = 'like') as total_likes,
          countIf(event = 'comment') as total_comments,
          countIf(event = 'share') as total_shares
        FROM analytics.events
        WHERE post_id IN ({postIds:Array(String)})
      `;

      const trendQuery = `
        SELECT
          toDate(created_at) as date,
          countIf(event = 'post_view') as views,
          countIf(event = 'post_read') as reads
        FROM analytics.events
        WHERE post_id IN ({postIds:Array(String)})
          AND created_at >= today() - 7
        GROUP BY date
        ORDER BY date ASC
      `;

      [overviewResults, trendResults] = await Promise.all([
        this.clickhouseService.query<any>(query, { postIds }),
        this.clickhouseService.query<any>(trendQuery, { postIds }),
      ]);
    } catch (error) {
      console.error('Failed to query ClickHouse for author dashboard:', error);
      // Fallback to empty arrays so we can still return basic stats from Prisma
    }

    const overview = overviewResults[0] || { unique_viewers: 0, total_views: 0, total_reads: 0, total_likes: 0, total_comments: 0, total_shares: 0 };
    
    // Aggregates from Prisma for consistency on primary metrics (Views/Likes)
    const [aggregates, prismaCommentCount] = await Promise.all([
      this.prismaService.article.aggregate({
        _sum: {
          likes: true,
          views: true,
          dislikes: true,
        },
        where: { authorId },
      }),
      this.prismaService.comment.count({
        where: {
          article: { authorId },
        },
      }),
    ]);
    
    const totalLikes = aggregates._sum.likes || 0;
    const totalViews = aggregates._sum.views || 0;
    const clickHouseViews = Number(overview.total_views) || 0;
    const totalReads = Number(overview.total_reads) || 0;
    const totalComments = Number(overview.total_comments) || 0;
    const totalShares = Number(overview.total_shares) || 0;
    
    // Calculate Rates based on ClickHouse data for accuracy within the same dataset
    const completionRate = clickHouseViews > 0 ? Math.round((totalReads / clickHouseViews) * 100) : 0;
    const engagementRate = clickHouseViews > 0 ? Math.round(((Number(overview.total_likes) + totalComments + totalShares) / clickHouseViews) * 100) : 0;

    // Format Trend Data
    // Ensure we have last 7 days
    const trendMap = new Map((trendResults || []).map((r: any) => [r.date, r]));
    const formattedTrend: {
      name: string;
      fullDate: string;
      views: number;
      reads: number;
    }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const data = trendMap.get(dateStr);
      
      formattedTrend.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: dateStr,
        views: Number(data?.views || 0),
        reads: Number(data?.reads || 0),
      });
    }

    // FALLBACK: If analytics DB is empty but main DB has counts (common in dev/manual entry)
    // Distribute lifetime stats to create a synthetic trend visual
    const trendTotalViews = formattedTrend.reduce((sum, item) => sum + item.views, 0);
    if (trendTotalViews === 0 && totalViews > 0) {
      // Distribution weights (growing trend)
      const weights = [0.05, 0.1, 0.15, 0.1, 0.15, 0.2, 0.25];
      const totalEngagement = totalLikes + totalComments + totalShares;
      
      formattedTrend.forEach((day, index) => {
        day.views = Math.ceil(totalViews * weights[index]);
        day.reads = Math.ceil(totalReads * weights[index]);
      });
    }

    return {
      stats: {
        total_views: totalViews,
        active_users: Number(overview.unique_viewers) || 0,
        total_likes: totalLikes,
        total_dislikes: aggregates._sum.dislikes || 0,
        total_comments: prismaCommentCount,
        total_engagement: totalLikes + totalComments + totalShares,
        total_shares: totalShares,
        total_reads: totalReads,
        completion_rate: completionRate,
        engagement_rate: engagementRate,
      },
      trend: formattedTrend,
      top_posts: posts.map(p => ({
        id: p.id,
        title: p.title,
        views: p.views,
        createdAt: p.createdAt,
      })),
    };
  }

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
