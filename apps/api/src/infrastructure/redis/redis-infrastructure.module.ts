import { Global, Module } from '@nestjs/common';
import { RedisModule } from './redis.module';
import { IdempotencyService } from './idempotency.service';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [RedisCacheService, IdempotencyService],
  exports: [RedisModule, RedisCacheService, IdempotencyService],
})
export class RedisInfrastructureModule {}
