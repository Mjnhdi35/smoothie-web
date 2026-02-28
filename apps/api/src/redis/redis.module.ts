import {
  Global,
  Inject,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(RedisLifecycle.name);

  constructor(@Inject(REDIS) private readonly redisClient: RedisClient) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.disposed || this.redisClient === null) {
      return;
    }

    this.disposed = true;

    try {
      await this.redisClient.quit();
    } catch {
      this.logger.warn('Redis quit failed, force disconnecting client');
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

        const redisClient = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableAutoPipelining: false,
          enableOfflineQueue: false,
          connectTimeout: 5000,
          tls: isTls ? {} : undefined,
        });

        redisClient.on('error', (error) => {
          const message =
            error instanceof Error ? error.message : 'Unknown Redis error';
          process.stderr.write(
            `${JSON.stringify({
              level: 'warn',
              message: 'redis_client_error',
              error: message,
              timestamp: new Date().toISOString(),
            })}\n`,
          );
        });

        return redisClient;
      },
    },
    RedisLifecycle,
  ],
  exports: [REDIS],
})
export class RedisModule {}
