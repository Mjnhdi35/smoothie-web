import { Inject, Injectable } from '@nestjs/common';
import { REDIS } from '../redis/redis.module';
import type { RedisClient } from '../redis/redis.module';

@Injectable()
export class RedisPublisher {
  constructor(@Inject(REDIS) private readonly redisClient: RedisClient) {}

  async publish(channel: string, payload: string): Promise<void> {
    if (this.redisClient === null) {
      return;
    }

    await this.redisClient.publish(channel, payload);
  }
}
