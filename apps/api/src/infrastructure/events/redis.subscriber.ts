import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import type { RedisClient } from '../redis/redis.module';

export type RedisMessageHandler = (message: string) => Promise<void>;

@Injectable()
export class RedisSubscriber implements OnApplicationShutdown {
  private readonly handlers = new Map<string, Set<RedisMessageHandler>>();
  private readonly logger = new Logger(RedisSubscriber.name);
  private subscriber: Redis | null = null;
  private connected = false;

  constructor(@Inject(REDIS) private readonly redisClient: RedisClient) {
    if (this.redisClient !== null) {
      this.subscriber = this.redisClient.duplicate();
      this.subscriber.on('error', (error) => {
        const message =
          error instanceof Error ? error.message : 'Unknown Redis error';
        this.logger.warn(`Redis subscriber error: ${message}`);
      });
      this.subscriber.on('message', (channel, message) => {
        void this.handleMessage(channel, message);
      });
    }
  }

  async subscribe(
    channel: string,
    handler: RedisMessageHandler,
  ): Promise<() => Promise<void>> {
    if (this.subscriber === null || !(await this.ensureConnected())) {
      return async () => Promise.resolve();
    }

    let channelHandlers = this.handlers.get(channel);
    if (channelHandlers === undefined) {
      channelHandlers = new Set<RedisMessageHandler>();
      this.handlers.set(channel, channelHandlers);
      await this.subscriber.subscribe(channel);
    }

    channelHandlers.add(handler);

    return async () => {
      const handlers = this.handlers.get(channel);
      if (handlers === undefined) {
        return;
      }

      handlers.delete(handler);

      if (handlers.size === 0) {
        this.handlers.delete(channel);
        await this.subscriber?.unsubscribe(channel);
      }
    };
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.subscriber !== null) {
      if (this.connected) {
        await this.subscriber.quit();
      } else {
        this.subscriber.disconnect();
      }
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.subscriber === null) {
      return false;
    }

    if (this.connected) {
      return true;
    }

    try {
      await this.subscriber.connect();
      this.connected = true;
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Redis error';
      this.logger.warn(`Redis subscriber connect failed: ${message}`);
      return false;
    }
  }

  private async handleMessage(channel: string, message: string): Promise<void> {
    const channelHandlers = this.handlers.get(channel);

    if (channelHandlers === undefined || channelHandlers.size === 0) {
      return;
    }

    const handlers = Array.from(channelHandlers);
    await Promise.all(handlers.map((handler) => handler(message)));
  }
}
