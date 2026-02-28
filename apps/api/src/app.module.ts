import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './infrastructure/database/database.module';
import { EventsModule } from './infrastructure/events/events.module';
import { RolesGuard } from './infrastructure/http/guards/roles.guard';
import { PinoLoggerService } from './infrastructure/logging/pino-logger.service';
import { RedisInfrastructureModule } from './infrastructure/redis/redis-infrastructure.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlogModule } from './modules/blog/blog.module';
import { BookingModule } from './modules/booking/booking.module';
import { ChatModule } from './modules/chat/chat.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';
import { HealthModule } from './modules/health/health.module';
import { LandingModule } from './modules/landing/landing.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'global',
          ttl: configService.get<number>('RATE_LIMIT_WINDOW_MS') ?? 60_000,
          limit: configService.get<number>('RATE_LIMIT_MAX') ?? 100,
        },
      ],
    }),
    DatabaseModule,
    RedisInfrastructureModule,
    EventsModule,
    HealthModule,
    UsersModule,
    AuthModule,
    EcommerceModule,
    BookingModule,
    BlogModule,
    LandingModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PinoLoggerService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
