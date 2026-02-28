import { Inject, Injectable } from '@nestjs/common';
import { REDIS } from './redis.module';
import type { RedisClient } from './redis.module';

@Injectable()
export class RedisCacheService {
  private static readonly SCAN_COUNT = 100;

  constructor(@Inject(REDIS) private readonly redisClient: RedisClient) {}

  async getJson<TValue extends object>(key: string): Promise<TValue | null> {
    if (this.redisClient === null) {
      return null;
    }

    const raw = await this.redisClient.get(key);

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as TValue;
    } catch {
      return null;
    }
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

  async getOrSetJson<TValue extends object>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<TValue>,
  ): Promise<TValue> {
    const cached = await this.getJson<TValue>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await loader();
    await this.setJson(key, value, ttlSeconds);
    return value;
  }

  async del(key: string): Promise<void> {
    if (this.redisClient === null) {
      return;
    }

    await this.redisClient.del(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    if (this.redisClient === null) {
      return;
    }

    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redisClient.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        RedisCacheService.SCAN_COUNT,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } while (cursor !== '0');
  }
}
