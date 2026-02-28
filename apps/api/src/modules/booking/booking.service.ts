import { Inject, Injectable } from '@nestjs/common';
import { EVENT_BUS, type EventBus } from '../../common/events/event-bus';
import { createDomainEvent } from '../../common/events/domain-event';
import { DEFAULT_CURSOR_PAGINATION } from '../../common/query/query.constants';
import {
  normalizeDateInput,
  normalizePagination,
} from '../../common/query/query-normalizer';
import { BOOKING_REPOSITORY } from './booking.constants';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import type { BookingRepositoryPort } from './booking.repository.port';
import type { BookingListPage, BookingListQuery } from './booking.types';

@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async list(query: ListBookingsQueryDto): Promise<BookingListPage> {
    const normalized = this.normalizeListQuery(query);
    return this.bookingRepository.list(normalized);
  }

  async create(dto: CreateBookingDto): Promise<{ bookingId: string }> {
    const created = await this.bookingRepository.create({
      userId: dto.userId,
      roomId: dto.roomId,
      stayDate: dto.stayDate,
    });

    await this.eventBus.publish(
      createDomainEvent({
        aggregate: 'booking',
        type: 'booking.confirmed',
        payload: { bookingId: created.bookingId, roomId: dto.roomId },
      }),
    );

    return created;
  }

  private normalizeListQuery(query: ListBookingsQueryDto): BookingListQuery {
    const limit = normalizePagination(query, DEFAULT_CURSOR_PAGINATION);

    return {
      hotelId: query.hotelId,
      dateFrom: normalizeDateInput(query.dateFrom),
      dateTo: normalizeDateInput(query.dateTo),
      limit,
      cursor: query.cursor,
    };
  }
}
