import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  version: string;
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
    private readonly configService: ConfigService,
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
      version: this.configService.get<string>('APP_VERSION') ?? '0.0.1',
      timestamp: new Date().toISOString(),
      services: {
        postgres,
        redis,
      },
    };
  }

  async readiness(): Promise<{ status: 'ready'; version: string }> {
    await this.knexService.raw('SELECT 1');

    if (this.redisClient !== null) {
      await this.redisClient.ping();
    }

    return {
      status: 'ready',
      version: this.configService.get<string>('APP_VERSION') ?? '0.0.1',
    };
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
