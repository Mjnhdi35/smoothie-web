import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import type { BookingListPage } from './booking.types';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  list(@Query() query: ListBookingsQueryDto): Promise<BookingListPage> {
    return this.bookingService.list(query);
  }

  @Post()
  create(@Body() dto: CreateBookingDto): Promise<{ bookingId: string }> {
    return this.bookingService.create(dto);
  }
}
