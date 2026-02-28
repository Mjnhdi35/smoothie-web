import { Module } from '@nestjs/common';
import { LandingController } from './landing.controller';
import { LANDING_REPOSITORY } from './landing.constants';
import { LandingRepository } from './landing.repository';
import { LandingService } from './landing.service';

@Module({
  controllers: [LandingController],
  providers: [
    LandingRepository,
    {
      provide: LANDING_REPOSITORY,
      useExisting: LandingRepository,
    },
    LandingService,
  ],
})
export class LandingModule {}
