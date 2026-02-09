import { createClient, ClickHouseClient } from '@clickhouse/client';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ClickHouse Client Service
 * Manages ClickHouse connection and provides query methods
 */
@Injectable()
export class ClickHouseService implements OnModuleInit, OnModuleDestroy {
  private client!: ClickHouseClient;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = createClient({
      host: this.configService.get<string>(
        'CLICKHOUSE_HOST',
        'http://localhost:8123',
      ),
      database: this.configService.get<string>(
        'CLICKHOUSE_DATABASE',
        'analytics',
      ),
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 0,
      },
    });

    // Test connection
    try {
      const result = await this.client.ping();
      console.log('✅ ClickHouse connected successfully:', result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ ClickHouse connection failed:', errorMessage);
    }
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  /**
   * Insert single event into ClickHouse
   */
  async insert(table: string, values: any[]) {
    try {
      await this.client.insert({
        table,
        values,
        format: 'JSONEachRow',
      });
    } catch (error) {
      console.error('ClickHouse insert error:', error);
      throw error;
    }
  }

  /**
   * Execute query and return results
   */
  async query<T = any>(
    query: string,
    params?: Record<string, any>,
  ): Promise<T[]> {
    try {
      const resultSet = await this.client.query({
        query,
        format: 'JSONEachRow',
        query_params: params,
      });

      const rows = await resultSet.json<T>();
      return rows;
    } catch (error) {
      console.error('ClickHouse query error:', error);
      throw error;
    }
  }

  /**
   * Get raw client for advanced operations
   */
  getClient(): ClickHouseClient {
    return this.client;
  }
}
