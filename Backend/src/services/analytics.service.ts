import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from './redis.service';
import { AnalyticsEvent } from '../modules/analytics/analytics.interface';

/**
 * Analytics Service
 * Handles event tracking by pushing to Redis queue
 * IMPORTANT: Never write directly to ClickHouse from API
 */
@Injectable()
export class AnalyticsService {
  private analyticsQueue: Queue;

  constructor(private redisService: RedisService) {
    this.analyticsQueue = new Queue('analytics', {
      connection: this.redisService.getClient(),
    });
  }

  /**
   * Track an analytics event
   * Events are queued and processed asynchronously
   */
  async track(event: AnalyticsEvent): Promise<void> {
    try {
      // Add timestamp if not provided
      if (!event.created_at) {
        event.created_at = new Date();
      }

      // Push to queue for async processing
      await this.analyticsQueue.add('track', event, {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      // Update live counters in Redis (optional, for real-time dashboards)
      if (event.post_id) {
        await this.redisService.incrementCounter(
          `post:${event.post_id}:views`,
          86400, // 24 hours TTL
        );
      }

      // Track active user
      if (event.user_id) {
        await this.redisService.trackActiveUser(event.user_id);
      }
    } catch (error) {
      console.error('Failed to track analytics event:', error);
      // Don't throw - analytics should never break the main flow
    }
  }

  /**
   * Track multiple events in batch
   */
  async trackBatch(events: AnalyticsEvent[]): Promise<void> {
    try {
      const jobs = events.map((event) => ({
        name: 'track',
        data: {
          ...event,
          created_at: event.created_at || new Date(),
        },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
        },
      }));

      await this.analyticsQueue.addBulk(jobs);
    } catch (error) {
      console.error('Failed to track batch analytics events:', error);
    }
  }

  /**
   * Get queue metrics for monitoring
   */
  async getQueueMetrics() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.analyticsQueue.getWaitingCount(),
      this.analyticsQueue.getActiveCount(),
      this.analyticsQueue.getCompletedCount(),
      this.analyticsQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
