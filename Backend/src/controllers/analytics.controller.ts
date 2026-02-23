import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsQueryService } from '../services/analytics-query.service';
import type { AnalyticsEvent } from '../modules/analytics/analytics.interface';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

/**
 * Analytics Controller
 * Provides endpoints for tracking events and querying analytics
 */
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private analyticsQueryService: AnalyticsQueryService,
  ) {}

  /**
   * Track a single analytics event
   * POST /analytics/track
   */
  @Post('track')
  async trackEvent(@Body() event: AnalyticsEvent, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress;
    event.metadata = { ...event.metadata, ip };

    await this.analyticsService.track(event);
    return { success: true };
  }

  /**
   * Track multiple events in batch
   * POST /analytics/track/batch
   */
  @Post('track/batch')
  async trackBatch(@Body() body: any, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress;

    // Support both { events: [...] } and [...]
    const events = (
      Array.isArray(body)
        ? body
        : (body as { events?: AnalyticsEvent[] })?.events || []
    ) as AnalyticsEvent[];

    const enrichedEvents = events.map((event: AnalyticsEvent) => ({
      ...event,
      metadata: { ...event.metadata, ip },
    }));

    await this.analyticsService.trackBatch(enrichedEvents);
    return { success: true };
  }

  /**
   * Get current user's profile analytics overview
   * GET /analytics/profile/overview
   */
  @Get('profile/overview')
  @UseGuards(AuthGuard('jwt'))
  async getProfileOverview(@Req() req: AuthenticatedRequest) {
    return await this.analyticsQueryService.getAuthorStats(req.user.id);
  }

  /**
   * Get user activity stats (likes count, comments count, etc)
   * GET /analytics/profile/activity
   */
  @Get('profile/activity')
  @UseGuards(AuthGuard('jwt'))
  async getProfileActivityStats(@Req() req: AuthenticatedRequest) {
    return await this.analyticsQueryService.getUserActivityStats(req.user.id);
  }

  /**
   * Get user liked articles
   * GET /analytics/profile/likes
   */
  @Get('profile/likes')
  @UseGuards(AuthGuard('jwt'))
  async getProfileLikedArticles(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.analyticsQueryService.getUserLikedArticles(
      req.user.id,
      Number(limit) || 20,
      Number(offset) || 0,
    );
  }

  /**
   * Get user commented articles
   * GET /analytics/profile/comments
   */
  @Get('profile/comments')
  @UseGuards(AuthGuard('jwt'))
  async getProfileCommentedArticles(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.analyticsQueryService.getUserCommentedArticles(
      req.user.id,
      Number(limit) || 20,
      Number(offset) || 0,
    );
  }

  /**
   * Get user reading history
   * GET /analytics/profile/history
   */
  @Get('profile/history')
  @UseGuards(AuthGuard('jwt'))
  async getProfileReadHistory(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.analyticsQueryService.getUserReadHistory(
      req.user.id,
      Number(limit) || 20,
      Number(offset) || 0,
    );
  }

  /**
   * Get user viewing history
   * GET /analytics/profile/views
   */
  @Get('profile/views')
  @UseGuards(AuthGuard('jwt'))
  async getProfileViewHistory(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.analyticsQueryService.getUserViewHistory(
      req.user.id,
      Number(limit) || 20,
      Number(offset) || 0,
    );
  }

  /**
   * Get detailed dashboard analytics for the current user
   * GET /analytics/dashboard
   */
  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  async getDashboardAnalytics(@Req() req: AuthenticatedRequest) {
    return await this.analyticsQueryService.getAuthorDashboardStats(
      req.user.id,
    );
  }

  /**
   * Get analytics for a specific post

  /**
   * Get analytics for a specific post
   * GET /analytics/post/:postId
   */
  @Get('post/:postId')
  async getPostAnalytics(@Param('postId') postId: string) {
    return await this.analyticsQueryService.getPostAnalytics(postId);
  }

  /**
   * Get geo distribution for a post
   * GET /analytics/post/:postId/geo
   */
  @Get('post/:postId/geo')
  async getPostGeoDistribution(@Param('postId') postId: string) {
    return await this.analyticsQueryService.getPostGeoDistribution(postId);
  }

  /**
   * Get trend for a specific post
   * GET /analytics/post/:postId/trend
   */
  @Get('post/:postId/trend')
  async getPostTrend(@Param('postId') postId: string) {
    return await this.analyticsQueryService.getPostTrend(postId);
  }

  /**
   * Get platform-wide analytics (Admin only)
   * GET /analytics/platform
   */
  @Get('platform')
  // @UseGuards(AdminGuard) // Add your auth guard here
  async getPlatformAnalytics() {
    return await this.analyticsQueryService.getPlatformAnalytics();
  }

  /**
   * Get trending posts
   * GET /analytics/trending?limit=20
   */
  @Get('trending')
  async getTrendingPosts(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return await this.analyticsQueryService.getTrendingPosts(limitNum);
  }

  /**
   * Get moderation analytics (Admin only)
   * GET /analytics/moderation?days=7
   */
  @Get('moderation')
  // @UseGuards(AdminGuard) // Add your auth guard here
  async getModerationAnalytics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return await this.analyticsQueryService.getModerationAnalytics(daysNum);
  }

  /**
   * Get moderator activity (Admin only)
   * GET /analytics/moderators?days=7
   */
  @Get('moderators')
  // @UseGuards(AdminGuard) // Add your auth guard here
  async getModeratorActivity(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return await this.analyticsQueryService.getModeratorActivity(daysNum);
  }

  /**
   * Get queue health metrics (Admin only)
   * GET /analytics/queue/health
   */
  @Get('queue/health')
  // @UseGuards(AdminGuard) // Add your auth guard here
  async getQueueHealth() {
    return await this.analyticsService.getQueueMetrics();
  }
}
