import { Inject, Injectable } from '@nestjs/common';
import { REDIS } from './redis.module';
import type { RedisClient } from './redis.module';

@Injectable()
export class RedisCacheService {
  constructor(@Inject(REDIS) private readonly redisClient: RedisClient) {}

  async getJson<TValue extends object>(key: string): Promise<TValue | null> {
    if (this.redisClient === null) {
      return null;
    }

    const raw = await this.redisClient.get(key);

    if (raw === null) {
      return null;
    }

    return JSON.parse(raw) as TValue;
  }

  async setJson<TValue extends object>(
    key: string,
    value: TValue,
    ttlSeconds: number,
  ): Promise<void> {
    if (this.redisClient === null) {
      return;
    }

    await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.redisClient === null) {
      return;
    }

    await this.redisClient.del(key);
  }
}
