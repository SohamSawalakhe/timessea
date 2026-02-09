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

      // Insert into ClickHouse
      await this.clickhouseService.insert('analytics.events', [
        {
          event: event.event,
          user_id: event.user_id,
          post_id: event.post_id || null,
          post_status: event.post_status || null,
          location_id: event.location_id || null,
          device: event.device || 'unknown',
          metadata: JSON.stringify(event.metadata || {}),
          created_at: event.created_at || new Date(),
        },
      ]);

      console.log(`✅ Processed analytics event: ${event.event}`);
    } catch (error) {
      console.error('Failed to process analytics job:', error);
      throw error; // Will trigger retry
    }
  }
}
