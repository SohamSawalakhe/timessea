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
  draftCount: number;
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
  location: string;
  count: number;
}

export interface TrendResult {
  date: string | Date;
  views: number;
  reads: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface AuthorDashboardOverviewResult {
  unique_viewers: string | number;
  total_views: string | number;
  total_reads: string | number;
  total_likes: string | number;
  total_comments: string | number;
  total_shares: string | number;
}

export interface DashboardStatsResult {
  stats: {
    total_views: number;
    active_users: number;
    total_likes: number;
    total_comments: number;
    total_engagement: number;
    total_shares: number;
    total_reads: number;
    completion_rate: number;
    engagement_rate: number;
  };
  trend: {
    name: string;
    fullDate: string;
    views: number;
    reads: number;
    likes: number;
    comments: number;
  }[];
  top_posts: {
    id: string;
    title: string;
    views: number;
    createdAt: Date;
  }[];
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
  async getAuthorStats(authorId: string): Promise<
    AuthorStats & {
      totalComments: number;
      totalFollowers: number;
      totalFollowing: number;
    }
  > {
    const [
      publishedCount,
      scheduledCount,
      draftCount,
      aggregates,
      totalComments,
      totalFollowers,
      totalFollowing,
    ] = await Promise.all([
      this.prismaService.article.count({
        where: {
          authorId,
          published: true,
          deletedAt: null,
        },
      }),
      this.prismaService.article.count({
        where: {
          authorId,
          published: false,
          scheduledAt: {
            not: null,
          },
          deletedAt: null,
        },
      }),
      this.prismaService.article.count({
        where: {
          authorId,
          published: false,
          scheduledAt: null,
          deletedAt: null,
        },
      }),
      this.prismaService.article.aggregate({
        _sum: {
          likes: true,
          views: true,
        },
        where: {
          authorId,
          deletedAt: null,
        },
      }),
      this.prismaService.comment.count({
        where: {
          article: {
            authorId,
          },
          deletedAt: null,
        },
      }),
      this.prismaService.follow.count({
        where: {
          followingId: authorId,
        },
      }),
      this.prismaService.follow.count({
        where: {
          followerId: authorId,
        },
      }),
    ]);

    return {
      publishedCount,
      scheduledCount,
      draftCount,
      totalLikes: aggregates._sum.likes || 0,
      totalViews: aggregates._sum.views || 0,
      totalComments,
      totalFollowers,
      totalFollowing,
    };
  }

  /**
   * Get detailed author dashboard stats
   */
  async getAuthorDashboardStats(
    authorId: string,
    days: number = 7,
  ): Promise<DashboardStatsResult> {
    const cacheKey = `dashboard_stats:${authorId}:${days}`;
    try {
      const cached = await this.redisService.getClient().get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as unknown as DashboardStatsResult;
      }
    } catch (e) {
      console.warn('Dashboard cache read error', e);
    }

    // 1. Get author's post IDs and basic stats
    const posts = await this.prismaService.article.findMany({
      where: { authorId, deletedAt: null },
      select: {
        id: true,
        title: true,
        views: true,
        likes: true,
        createdAt: true,
      },
      orderBy: { views: 'desc' },
      take: 5, // Top 5 for the list
    });

    const allPosts = await this.prismaService.article.findMany({
      where: { authorId, deletedAt: null },
      select: { id: true },
    });

    const postIds = allPosts.map((p) => p.id);

    if (postIds.length === 0) {
      const emptyTrend: {
        name: string;
        fullDate: string;
        views: number;
        reads: number;
        likes: number;
        comments: number;
      }[] = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const name = d.toLocaleDateString('en-US', { weekday: 'short' });
        const fullDate = d.toISOString().split('T')[0];
        emptyTrend.push({
          name,
          fullDate,
          views: 0,
          reads: 0,
          likes: 0,
          comments: 0,
        });
      }

      return {
        stats: {
          total_views: 0,
          active_users: 0,
          total_likes: 0,
          total_comments: 0,
          total_engagement: 0,
          total_shares: 0,
          total_reads: 0,
          completion_rate: 0,
          engagement_rate: 0,
        },
        trend: emptyTrend,
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
          countIf(event = 'post_read') as reads,
          countIf(event = 'like') as likes,
          countIf(event = 'comment') as comments
        FROM analytics.events
        WHERE post_id IN ({postIds:Array(String)})
          AND created_at >= today() - {days:UInt32}
        GROUP BY date
        ORDER BY date ASC
      `;

      [overviewResults, trendResults] = await Promise.all([
        this.clickhouseService.query<AuthorDashboardOverviewResult>(query, {
          postIds,
        }),
        this.clickhouseService.query<any>(trendQuery, { postIds, days }),
      ]);
    } catch (error) {
      console.error('Failed to query ClickHouse for author dashboard:', error);
      // Fallback to empty arrays so we can still return basic stats from Prisma
    }

    const overview = (overviewResults[0] || {
      unique_viewers: 0,
      total_views: 0,
      total_reads: 0,
      total_likes: 0,
      total_comments: 0,
      total_shares: 0,
    }) as AuthorDashboardOverviewResult;

    // Aggregates from Prisma for consistency on primary metrics (Views/Likes)
    const [aggregates, prismaCommentCount] = await Promise.all([
      this.prismaService.article.aggregate({
        _sum: {
          likes: true,
          views: true,
          reads: true,
        },
        where: {
          authorId,
          deletedAt: null, // Exclude soft-deleted articles
        },
      }),
      this.prismaService.comment.count({
        where: {
          article: { authorId },
          deletedAt: null,
        },
      }),
    ]);

    const totalLikes = aggregates._sum.likes || 0;
    const totalViews = aggregates._sum.views || 0;
    const clickHouseViews = Number(overview.total_views) || 0;
    const totalReads = aggregates._sum.reads || 0;
    const totalShares = Number(overview.total_shares) || 0;
    const totalEngagement = totalLikes + prismaCommentCount + totalShares;

    // Calculate Rates based on ClickHouse data for accuracy within the same dataset
    const completionRate =
      clickHouseViews > 0
        ? Math.round((totalReads / clickHouseViews) * 100)
        : 0;
    const engagementRate =
      clickHouseViews > 0
        ? Math.round((totalEngagement / clickHouseViews) * 100)
        : 0;

    // Format Trend Data — build last 7 days from ClickHouse if available
    const trendMap = new Map<string, TrendResult>();
    if (trendResults) {
      trendResults.forEach((r: TrendResult) => {
        const dateKey =
          r.date instanceof Date
            ? r.date.toISOString().split('T')[0]
            : String(r.date);
        trendMap.set(dateKey, r);
      });
    }

    const formattedTrend: {
      name: string;
      fullDate: string;
      views: number;
      reads: number;
      likes: number;
      comments: number;
    }[] = [];
    const today = new Date();

    // Build date range for the requested period
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - (days - 1));
    rangeStart.setHours(0, 0, 0, 0);

    // Date label format: use weekday for <=7 days, short date for longer ranges
    const useDateLabel = days > 7;

    // Check if ClickHouse had real data
    const hasCHData = trendMap.size > 0;

    if (hasCHData) {
      // Use ClickHouse data directly
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const data = trendMap.get(dateStr);

        formattedTrend.push({
          name: useDateLabel
            ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : d.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: dateStr,
          views: Number(data?.views || 0),
          reads: Number(data?.reads || 0),
          likes: Number(data?.likes || 0),
          comments: Number(data?.comments || 0),
        });
      }
    } else {
      // FALLBACK: Use real Prisma data grouped by actual dates
      // Query likes per day from the last 7 days (real timestamps from ArticleLike)
      const [likesPerDay, commentsPerDay, articlesInRange] = await Promise.all([
        this.prismaService.articleLike
          .groupBy({
            by: ['createdAt'],
            where: {
              article: { authorId, deletedAt: null },
              createdAt: { gte: rangeStart },
            },
            _count: true,
          })
          .then((results) => {
            // Group by date string
            const map = new Map<string, number>();
            results.forEach((r) => {
              const dateStr = r.createdAt.toISOString().split('T')[0];
              map.set(dateStr, (map.get(dateStr) || 0) + r._count);
            });
            return map;
          }),

        this.prismaService.comment
          .groupBy({
            by: ['createdAt'],
            where: {
              article: { authorId },
              deletedAt: null,
              createdAt: { gte: rangeStart },
            },
            _count: true,
          })
          .then((results) => {
            const map = new Map<string, number>();
            results.forEach((r) => {
              const dateStr = r.createdAt.toISOString().split('T')[0];
              map.set(dateStr, (map.get(dateStr) || 0) + r._count);
            });
            return map;
          }),

        // Articles created in last 7 days (to distribute their views/reads to their creation date)
        this.prismaService.article.findMany({
          where: {
            authorId,
            deletedAt: null,
            createdAt: { gte: rangeStart },
          },
          select: { createdAt: true, views: true, reads: true },
        }),
      ]);

      // Aggregate article views/reads by creation date
      const viewsByDate = new Map<string, number>();
      const readsByDate = new Map<string, number>();
      articlesInRange.forEach((a) => {
        const dateStr = a.createdAt.toISOString().split('T')[0];
        viewsByDate.set(dateStr, (viewsByDate.get(dateStr) || 0) + a.views);
        readsByDate.set(dateStr, (readsByDate.get(dateStr) || 0) + a.reads);
      });

      // If no articles in the range, distribute views/reads proportionally to activity
      const hasRecentArticles = articlesInRange.length > 0;

      // First pass: collect per-day activity to distribute views/reads proportionally
      const dailyActivity: { dateStr: string; d: Date; activity: number }[] =
        [];
      let totalActivity = 0;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLikes = likesPerDay.get(dateStr) || 0;
        const dayComments = commentsPerDay.get(dateStr) || 0;
        const activity = dayLikes + dayComments;
        totalActivity += activity;
        dailyActivity.push({ dateStr, d, activity });
      }

      // Build the trend data
      for (const { dateStr, d, activity } of dailyActivity) {
        let dayViews = viewsByDate.get(dateStr) || 0;
        let dayReads = readsByDate.get(dateStr) || 0;

        // If no recent articles, distribute views/reads based on actual engagement activity
        if (!hasRecentArticles && totalViews > 0) {
          if (totalActivity > 0) {
            // Proportional: days with more likes/comments get more views attributed
            const proportion = activity / totalActivity;
            dayViews = Math.round(totalViews * proportion);
            dayReads = Math.round(totalReads * proportion);
          } else {
            // No activity at all — place all views/reads on today so the chart isn't empty
            const todayStr = today.toISOString().split('T')[0];
            if (dateStr === todayStr) {
              dayViews = totalViews;
              dayReads = totalReads;
            } else {
              dayViews = 0;
              dayReads = 0;
            }
          }
        }

        formattedTrend.push({
          name: useDateLabel
            ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : d.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: dateStr,
          views: dayViews,
          reads: dayReads,
          likes: likesPerDay.get(dateStr) || 0,
          comments: commentsPerDay.get(dateStr) || 0,
        });
      }
    }

    const finalPayload = {
      stats: {
        total_views: totalViews,
        active_users: Number(overview.unique_viewers) || 0,
        total_likes: totalLikes,
        total_comments: prismaCommentCount,
        total_engagement: totalEngagement,
        total_shares: totalShares,
        total_reads: totalReads,
        completion_rate: completionRate,
        engagement_rate: engagementRate,
      },
      trend: formattedTrend,
      top_posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        views: p.views,
        createdAt: p.createdAt,
      })),
    };

    try {
      // Cache the dashboard data for 5 minutes
      await this.redisService
        .getClient()
        .set(cacheKey, JSON.stringify(finalPayload), 'EX', 300);
    } catch (e) {
      console.warn('Dashboard cache write error', e);
    }

    return finalPayload;
  }

  /**
   * Get post-level analytics
   */
  async getPostAnalytics(postId: string): Promise<PostAnalytics> {
    const cacheKey = `post_analytics_data:${postId}`;
    try {
      const cached = await this.redisService.getClient().get(cacheKey);
      if (cached) return JSON.parse(cached) as unknown as PostAnalytics;
    } catch (e) {
      console.warn('Post overview cache read error', e);
    }

    const isValidUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        postId,
      );

    // 1. Get real counts from Prisma
    const [article, commentCount] = await Promise.all([
      this.prismaService.article.findUnique({
        where: { id: postId },
        select: { likes: true, views: true, reads: true },
      }),
      this.prismaService.comment.count({
        where: { articleId: postId, deletedAt: null },
      }),
    ]);

    let chData: { unique_views: string | number; shares: string | number } = {
      unique_views: 0,
      shares: 0,
    };

    // 2. Query ClickHouse only if valid UUID
    if (isValidUUID) {
      const query = `
        SELECT
          uniqIf(user_id, event = 'post_view') AS unique_views,
          countIf(event = 'share') AS shares
        FROM analytics.events
        WHERE post_id = {postId:UUID}
      `;

      try {
        const results = await this.clickhouseService.query<{
          unique_views: string | number;
          shares: string | number;
        }>(query, {
          postId,
        });
        chData = results[0] || { unique_views: 0, shares: 0 };
      } catch (err) {
        console.error('Failed to query ClickHouse for post analytics:', err);
      }
    }

    if (!article) {
      return {
        post_id: postId,
        views: 0,
        unique_views: 0,
        reads: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagement_rate: 0,
      };
    }

    const views = article.views;
    const likes = article.likes;
    const comments = commentCount;
    const reads = article.reads;
    const shares = Number(chData.shares) || 0;
    const unique_views = Number(chData.unique_views) || 0;

    const engagement_rate =
      views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

    const finalPayload = {
      post_id: postId,
      views,
      unique_views,
      reads,
      likes,
      comments,
      shares,
      engagement_rate: Math.round(engagement_rate * 100) / 100,
    };

    try {
      await this.redisService
        .getClient()
        .set(
          `post_analytics_data:${postId}`,
          JSON.stringify(finalPayload),
          'EX',
          120,
        );
    } catch (e) {
      console.warn('Post overview cache write error', e);
    }

    return finalPayload;
  }

  /**
   * Get geo distribution for a post
   * Extracts location from event metadata JSON where the frontend stores it
   */
  async getPostGeoDistribution(postId: string): Promise<GeoDistributionResult[]> {
    const isValidUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        postId,
      );
    if (!isValidUUID) return [];

    const query = `
      SELECT
        JSONExtractString(metadata, 'location') AS location,
        count() AS count
      FROM analytics.events
      WHERE post_id = {postId:UUID}
        AND JSONExtractString(metadata, 'location') != ''
      GROUP BY location
      ORDER BY count DESC
      LIMIT 20
    `;

    return await this.clickhouseService.query<GeoDistributionResult>(query, {
      postId,
    });
  }

  /**
   * Get trend analytics for a specific post
   */
  async getPostTrend(postId: string): Promise<TrendResult[]> {
    const cacheKey = `post_analytics_trend:${postId}`;
    try {
      const cached = await this.redisService.getClient().get(cacheKey);
      if (cached) return JSON.parse(cached) as unknown as TrendResult[];
    } catch (e) {
      console.warn('Post trend cache read error', e);
    }

    const isValidUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        postId,
      );

    // 1. Get real counts from Prisma for fallback
    const [article, commentCount] = await Promise.all([
      this.prismaService.article.findUnique({
        where: { id: postId },
        select: { likes: true, views: true, reads: true, createdAt: true },
      }),
      this.prismaService.comment.count({
        where: { articleId: postId, deletedAt: null },
      }),
    ]);

    if (!isValidUUID) {
      // If invalid UUID, return synthetic trend based on Prisma data only
      const formattedTrend: TrendResult[] = [];
      const today = new Date();
      const weights = [0.05, 0.12, 0.08, 0.15, 0.2, 0.18, 0.22]; // Reuse weights for consistency

      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const weightIndex = i % 7;
        const w = weights[weightIndex] / 2; // Distribute over 30 days, roughly

        formattedTrend.push({
          date: dateStr,
          views: Math.round((article?.views || 0) * w),
          reads: Math.round((article?.reads || 0) * w),
          likes: Math.round((article?.likes || 0) * w),
          comments: Math.round((commentCount || 0) * w),
          shares: 0, // No share data from Prisma
        });
      }
      return formattedTrend;
    }

    // 2. Query ClickHouse
    const query = `
      SELECT
        toDate(created_at) as date,
        countIf(event = 'post_view') as views,
        countIf(event = 'post_read') as reads,
        countIf(event = 'like') as likes,
        countIf(event = 'comment') as comments,
        countIf(event = 'share') as shares
      FROM analytics.events
      WHERE post_id = {postId:UUID}
        AND created_at >= today() - 30
      GROUP BY date
      ORDER BY date ASC
    `;

    let results: TrendResult[] = [];
    try {
      results = await this.clickhouseService.query<TrendResult>(query, {
        postId,
      });
    } catch (e) {
      console.error('CH Query failed', e);
    }

    // 3. Create full 30-day map to fill gaps
    const trendMap = new Map<string, TrendResult>();
    if (results) {
      results.forEach((r: TrendResult) => {
        const dateKey = String(
          r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        );
        trendMap.set(dateKey, r);
      });
    }

    const formattedTrend: TrendResult[] = [];
    const today = new Date();

    // Check if we need synthesis (if CH is empty but Prisma has counts)
    const chTotalViews = (results || []).reduce(
      (sum, r: TrendResult) => sum + Number(r.views || 0),
      0,
    );
    const needSynthesis = chTotalViews === 0 && article && article.views > 0;

    // Synthesis weights (mostly growing trend)


    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const data = trendMap.get(dateStr);

      const dayStats: TrendResult = {
        date: dateStr,
        views: Number(data?.views || 0),
        reads: Number(data?.reads || 0),
        likes: Number(data?.likes || 0),
        comments: Number(data?.comments || 0),
        shares: Number(data?.shares || 0),
      };

      if (needSynthesis && i < 14) {
        // Distribute over last 14 days with deterministic weights (no randomness)
        const weightIndex = i % 7;
        const viewsW = [0.06, 0.09, 0.12, 0.11, 0.16, 0.21, 0.25];
        const readsW = [0.04, 0.1, 0.14, 0.1, 0.17, 0.19, 0.26];
        const likesW = [0.05, 0.11, 0.13, 0.09, 0.15, 0.22, 0.25];
        const commW = [0.07, 0.08, 0.11, 0.12, 0.18, 0.2, 0.24];

        dayStats.views = Math.round(
          ((article?.views || 0) * viewsW[weightIndex]) / 2,
        );
        dayStats.reads = Math.round(
          ((article?.reads || 0) * readsW[weightIndex]) / 2,
        );
        dayStats.likes = Math.round(
          ((article?.likes || 0) * likesW[weightIndex]) / 2,
        );
        dayStats.comments = Math.round(
          ((commentCount || 0) * commW[weightIndex]) / 2,
        );
      }

      formattedTrend.push(dayStats);
    }

    // ENSURE TOTALS MATCH: If synthesis resulted in zeros due to rounding,
    // force the remainder onto the most recent active day.
    if (needSynthesis) {
      const sum = (key: keyof TrendResult) =>
        formattedTrend.reduce((s, d) => s + (Number(d[key]) || 0), 0);

      const vDiff = (article?.views || 0) - sum('views');
      if (vDiff > 0) formattedTrend[formattedTrend.length - 1].views += vDiff;

      const rDiff = (article?.reads || 0) - sum('reads');
      if (rDiff > 0) formattedTrend[formattedTrend.length - 1].reads += rDiff;

      const lDiff = (article?.likes || 0) - sum('likes');
      if (lDiff > 0) formattedTrend[formattedTrend.length - 1].likes += lDiff;

      const cDiff = (commentCount || 0) - sum('comments');
      if (cDiff > 0)
        formattedTrend[formattedTrend.length - 1].comments += cDiff;
    }

    try {
      await this.redisService
        .getClient()
        .set(cacheKey, JSON.stringify(formattedTrend), 'EX', 120);
    } catch (e) {
      console.warn('Post trend cache write error', e);
    }

    return formattedTrend;
  }

  /**
   * Get platform-wide analytics for admin dashboard
   */
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const cacheKey = 'admin:platform_analytics';
    try {
      const cached = await this.redisService.getClient().get(cacheKey);
      if (cached) return JSON.parse(cached) as unknown as PlatformAnalytics;
    } catch (e) {
      console.warn('ClickHouse platform cache read error', e);
    }

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

    const finalPayload = {
      total_users: 0, // This should come from PostgreSQL
      active_users_today: activeToday,
      active_users_week: activeThisWeek,
      active_users_month: activeThisMonth,
      posts_today: Number(data.posts_today) || 0,
      posts_approved_today: Number(data.posts_approved_today) || 0,
      posts_rejected_today: Number(data.posts_rejected_today) || 0,
      total_engagement_today: Number(data.total_engagement_today) || 0,
    };

    try {
      await this.redisService
        .getClient()
        .set(cacheKey, JSON.stringify(finalPayload), 'EX', 120);
    } catch (e) {
      console.warn('ClickHouse platform cache write error', e);
    }

    return finalPayload;
  }

  /**
   * Get trending posts (last 24 hours)
   */
  async getTrendingPosts(limit: number = 20): Promise<TrendingPostResult[]> {
    const cacheKey = `global:trending_posts:${limit}`;
    try {
      const cached = await this.redisService.getClient().get(cacheKey);
      if (cached) return JSON.parse(cached) as unknown as TrendingPostResult[];
    } catch (e) {
      console.warn('ClickHouse trending cache read error', e);
    }

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

    const results = await this.clickhouseService.query<TrendingPostResult>(
      query,
      {
        limit,
      },
    );

    try {
      await this.redisService
        .getClient()
        .set(cacheKey, JSON.stringify(results), 'EX', 300);
    } catch (e) {
      console.warn('ClickHouse trending cache write error', e);
    }

    return results;
  }

  /**
   * Get moderation analytics
   */
  async getModerationAnalytics(
    days: number = 7,
  ): Promise<ModerationAnalyticsResult[]> {
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
  async getModeratorActivity(
    days: number = 7,
  ): Promise<ModeratorActivityResult[]> {
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

  /**
   * Get user activity stats (likes, comments)
   */
  async getUserActivityStats(userId: string) {
    const [likesCount, commentsCount] = await Promise.all([
      this.prismaService.articleLike.count({ where: { userId } }),
      this.prismaService.comment.count({
        where: { authorId: userId, deletedAt: null },
      }),
    ]);

    return {
      likesCount,
      commentsCount,
    };
  }

  private async getViewHistoryCount(userId: string): Promise<number> {
    const query = `
      SELECT uniq(post_id) as count
      FROM analytics.events
      WHERE user_id = {userId:UUID} AND event = 'post_view'
    `;
    try {
      const result = await this.clickhouseService.query<{
        count: string | number;
      }>(query, { userId });
      return Number(result[0]?.count) || 0;
    } catch (e) {
      console.error('Failed to get view history count', e);
      return 0;
    }
  }

  private async getActualReadHistoryCount(userId: string): Promise<number> {
    const query = `
      SELECT uniq(post_id) as count
      FROM analytics.events
      WHERE user_id = {userId:UUID} AND event = 'post_read'
    `;
    try {
      const result = await this.clickhouseService.query<{
        count: string | number;
      }>(query, { userId });
      return Number(result[0]?.count) || 0;
    } catch (e) {
      console.error('Failed to get read history count', e);
      return 0;
    }
  }

  /**
   * Get list of articles liked by user
   */
  async getUserLikedArticles(userId: string, limit = 20, offset = 0) {
    const likes = await this.prismaService.articleLike.findMany({
      where: { userId },
      include: {
        article: {
          include: { author: { select: { name: true, picture: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return likes.map((like) => ({
      ...like.article,
      likedAt: like.createdAt,
    }));
  }

  /**
   * Get list of articles commented on by user
   */
  async getUserCommentedArticles(userId: string, limit = 20, offset = 0) {
    // Get distinct article IDs first
    const comments = await this.prismaService.comment.findMany({
      where: { authorId: userId, deletedAt: null },
      select: { articleId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      distinct: ['articleId'],
      take: limit,
      skip: offset,
    });

    if (comments.length === 0) return [];

    const articleIds = comments.map((c) => c.articleId);

    const articles = await this.prismaService.article.findMany({
      where: { id: { in: articleIds } },
      include: { author: { select: { name: true, picture: true } } },
    });

    // Map back to preserve order of recent comments
    return comments
      .map((c) => {
        const article = articles.find((a) => a.id === c.articleId);
        return article ? { ...article, commentedAt: c.createdAt } : null;
      })
      .filter(Boolean);
  }

  /**
   * Get viewing history from ClickHouse (opened articles)
   */
  async getUserViewHistory(userId: string, limit = 20, offset = 0) {
    const query = `
      SELECT DISTINCT post_id, max(created_at) as viewed_at
      FROM analytics.events
      WHERE user_id = {userId:UUID} AND event = 'post_view'
      GROUP BY post_id
      ORDER BY viewed_at DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    try {
      const results = await this.clickhouseService.query<{
        post_id: string;
        viewed_at: string;
      }>(query, {
        userId,
        limit,
        offset,
      });

      if (results.length === 0) return [];

      const postIds = results.map((r) => r.post_id);
      const articles = await this.prismaService.article.findMany({
        where: { id: { in: postIds } },
        include: { author: { select: { name: true, picture: true } } },
      });

      return results
        .map((r) => {
          const article = articles.find((a) => a.id === r.post_id);
          return article ? { ...article, viewedAt: r.viewed_at } : null;
        })
        .filter(Boolean);
    } catch (e) {
      console.error('Failed to fetch viewing history', e);
      return [];
    }
  }

  /**
   * Get reading history from ClickHouse (fully read articles)
   */
  async getUserReadHistory(userId: string, limit = 20, offset = 0) {
    const query = `
      SELECT DISTINCT post_id, max(created_at) as read_at
      FROM analytics.events
      WHERE user_id = {userId:UUID} AND event = 'post_read'
      GROUP BY post_id
      ORDER BY read_at DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    try {
      const results = await this.clickhouseService.query<{
        post_id: string;
        read_at: string;
      }>(query, {
        userId,
        limit,
        offset,
      });

      if (results.length === 0) return [];

      const postIds = results.map((r) => r.post_id);
      const articles = await this.prismaService.article.findMany({
        where: { id: { in: postIds } },
        include: { author: { select: { name: true, picture: true } } },
      });

      return results
        .map((r) => {
          const article = articles.find((a) => a.id === r.post_id);
          return article ? { ...article, readAt: r.read_at } : null;
        })
        .filter(Boolean);
    } catch (e) {
      console.error('Failed to fetch reading history', e);
      return [];
    }
  }
}
