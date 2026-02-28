import { Module } from '@nestjs/common';
import { BOOKING_REPOSITORY } from './booking.constants';
import { BookingController } from './booking.controller';
import { BookingRepository } from './booking.repository';
import { BookingService } from './booking.service';

@Module({
  controllers: [BookingController],
  providers: [
    BookingRepository,
    {
      provide: BOOKING_REPOSITORY,
      useExisting: BookingRepository,
    },
    BookingService,
  ],
})
export class BookingModule {}
