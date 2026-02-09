import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsService } from '../../services/analytics.service';
import { AnalyticsQueryService } from '../../services/analytics-query.service';
import { AnalyticsController } from '../../controllers/analytics.controller';
import { AnalyticsProcessor } from './analytics.processor';
import { ClickHouseService } from '../../services/clickhouse.service';
import { RedisService } from '../../services/redis.service';

/**
 * Analytics Module
 * Provides complete analytics infrastructure:
 * - Event tracking (async via BullMQ)
 * - ClickHouse storage
 * - Redis counters
 * - Query APIs
 */
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'analytics',
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    RedisService,
    ClickHouseService,
    AnalyticsService,
    AnalyticsQueryService,
    AnalyticsProcessor,
  ],
  exports: [AnalyticsService, AnalyticsQueryService, RedisService],
})
export class AnalyticsModule {}
