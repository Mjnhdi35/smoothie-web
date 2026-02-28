import { Module } from '@nestjs/common';
import { LandingController } from './landing.controller';
import { LandingRepository } from './landing.repository';
import { LandingService } from './landing.service';

@Module({
  controllers: [LandingController],
  providers: [LandingRepository, LandingService],
})
export class LandingModule {}
