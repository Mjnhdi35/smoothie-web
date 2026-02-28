import { Inject, Injectable } from '@nestjs/common';
import { REDIS } from './redis.module';
import type { RedisClient } from './redis.module';

@Injectable()
export class IdempotencyService {
  constructor(@Inject(REDIS) private readonly redisClient: RedisClient) {}

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    if (this.redisClient === null) {
      return true;
    }

    const result = await this.redisClient.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
}
