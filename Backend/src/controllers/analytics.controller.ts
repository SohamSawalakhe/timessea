import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsQueryService } from '../services/analytics-query.service';
import { AnalyticsEvent } from '../modules/analytics/analytics.interface';

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
  async trackEvent(@Body() event: AnalyticsEvent) {
    await this.analyticsService.track(event);
    return { success: true };
  }

  /**
   * Track multiple events in batch
   * POST /analytics/track/batch
   */
  @Post('track/batch')
  async trackBatch(@Body() events: AnalyticsEvent[]) {
    await this.analyticsService.trackBatch(events);
    return { success: true };
  }

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
