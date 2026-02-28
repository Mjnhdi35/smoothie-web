import { Inject, Injectable } from '@nestjs/common';
import { KnexService } from '../../infrastructure/database/knex.service';
import { REDIS } from '../../infrastructure/redis/redis.module';
import type { RedisClient } from '../../infrastructure/redis/redis.module';

type ServiceStatus = 'up' | 'down' | 'disabled';

interface ServiceHealth {
  status: ServiceStatus;
  latencyMs?: number;
  message?: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    postgres: ServiceHealth;
    redis: ServiceHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly knexService: KnexService,
    @Inject(REDIS) private readonly redisClient: RedisClient,
  ) {}

  async check(): Promise<HealthStatus> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const status =
      postgres.status === 'up' &&
      (redis.status === 'up' || redis.status === 'disabled')
        ? 'ok'
        : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        postgres,
        redis,
      },
    };
  }

  async readiness(): Promise<{ status: 'ready' }> {
    await this.knexService.raw('SELECT 1');
    return { status: 'ready' };
  }

  private async checkPostgres(): Promise<ServiceHealth> {
    const start = Date.now();

    try {
      await this.knexService.raw('SELECT 1');

      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message:
          error instanceof Error ? error.message : 'Unknown Postgres error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    if (this.redisClient === null) {
      return {
        status: 'disabled',
        message: 'REDIS_URL is not configured',
      };
    }

    const start = Date.now();

    try {
      await this.redisClient.ping();

      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }
}
