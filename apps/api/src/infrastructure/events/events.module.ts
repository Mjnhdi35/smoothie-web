import { Global, Module } from '@nestjs/common';
import { EVENT_BUS } from '../../common/events/event-bus';
import { RedisModule } from '../redis/redis.module';
import { RedisEventBus } from './redis.event-bus';
import { RedisPublisher } from './redis.publisher';
import { RedisSubscriber } from './redis.subscriber';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    RedisPublisher,
    RedisSubscriber,
    RedisEventBus,
    {
      provide: EVENT_BUS,
      useExisting: RedisEventBus,
    },
  ],
  exports: [EVENT_BUS, RedisEventBus],
})
export class EventsModule {}
