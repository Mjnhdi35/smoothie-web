import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

export type RedisClient = Redis | null;

@Injectable()
class RedisLifecycle implements OnApplicationShutdown {
  private disposed = false;

  constructor(@Inject(REDIS) private readonly redisClient: RedisClient) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.disposed || this.redisClient === null) {
      return;
    }

    this.disposed = true;

    try {
      await this.redisClient.quit();
    } catch {
      this.redisClient.disconnect();
    }
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): RedisClient => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (redisUrl === undefined || redisUrl.trim() === '') {
          return null;
        }

        const isTls = redisUrl.startsWith('rediss://');

        return new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableAutoPipelining: false,
          enableOfflineQueue: false,
          connectTimeout: 5000,
          tls: isTls ? {} : undefined,
        });
      },
    },
    RedisLifecycle,
  ],
  exports: [REDIS],
})
export class RedisModule {}
