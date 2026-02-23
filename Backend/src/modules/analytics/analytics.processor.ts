import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { ClickHouseService } from '../../services/clickhouse.service';
import { AnalyticsEvent } from './analytics.interface';

/**
 * Analytics Worker
 * Processes queued analytics events and writes to ClickHouse
 * This runs asynchronously and doesn't block the main API
 */
@Processor('analytics')
@Injectable()
export class AnalyticsProcessor extends WorkerHost {
  constructor(private clickhouseService: ClickHouseService) {
    super();
  }

  /**
   * Process analytics event from queue
   */
  async process(job: Job<AnalyticsEvent>): Promise<void> {
    try {
      const event = job.data;

      // Validate UUIDs
      const isValidUUID = (id: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const userId =
        event.user_id && isValidUUID(event.user_id)
          ? event.user_id
          : '00000000-0000-0000-0000-000000000000';

      const postId =
        event.post_id && isValidUUID(event.post_id) ? event.post_id : null;

      if (event.post_id && !postId) {
        console.warn(
          `⚠️ Invalid UUID for post_id: ${event.post_id}. Event ${event.event} will be logged without post_id.`,
        );
      }

      // 1. Insert into main events table (General Log)
      await this.clickhouseService.insert('analytics.events', [
        {
          event: event.event,
          user_id: userId,
          post_id: postId,
          post_status: event.post_status || null,
          location_id: event.location_id || null,
          device: event.device || 'unknown',
          metadata: JSON.stringify(event.metadata || {}),
          created_at: event.created_at || new Date(),
        },
      ]);

      // 2. If it's a VIEW, insert into specialized raw_views table for strict counting
      if (
        event.event === 'post_view' &&
        event.post_id &&
        (event.client_id || event.user_id)
      ) {
        await this.clickhouseService.insert('analytics.raw_views', [
          {
            event_time: event.created_at || new Date(),
            post_id: event.post_id,
            user_id: event.user_id || null,
            client_id: event.client_id || event.user_id || 'unknown', // Priority to client_id
            device: event.device || 'unknown',
            duration: event.duration || 0,
            ip: event.metadata?.ip || 'unknown',
            referrer: event.metadata?.referrer || 'unknown',
            metadata: JSON.stringify(event.metadata || {}),
          },
        ]);
        console.log(`👁️ Recorded raw view for post ${event.post_id}`);
      }

      console.log(`✅ Processed analytics event: ${event.event}`);
    } catch (error) {
      console.error('Failed to process analytics job:', error);
      // throw error; // Retry is handled by BullMQ settings
    }
  }
}
