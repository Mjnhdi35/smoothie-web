import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './infrastructure/database/database.module';
import { EventsModule } from './infrastructure/events/events.module';
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
  providers: [AppService],
})
export class AppModule {}
