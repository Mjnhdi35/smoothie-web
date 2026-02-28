import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingRepository } from './booking.repository';
import { BookingService } from './booking.service';

@Module({
  controllers: [BookingController],
  providers: [BookingRepository, BookingService],
})
export class BookingModule {}
