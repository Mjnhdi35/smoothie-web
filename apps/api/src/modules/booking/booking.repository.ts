import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  applyCursorPagination,
  decodeCursor,
  encodeCursor,
  type CursorPayload,
} from '../../common/query/cursor-pagination';
import { FilterBuilder } from '../../common/query/filter-builder';
import { applyDateRange } from '../../common/query/query-builder.helpers';
import {
  KNEX,
  type DbKnex,
} from '../../infrastructure/database/database.constants';
import type {
  BookingListPage,
  BookingListQuery,
  BookingRow,
} from './booking.types';

@Injectable()
export class BookingRepository {
  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  async list(query: BookingListQuery): Promise<BookingListPage> {
    const qb = this.knexClient<BookingRow>('bookings as b')
      .select(
        'b.id',
        'b.user_id',
        'b.room_id',
        'b.stay_date',
        'b.status',
        'b.created_at',
      )
      .innerJoin('rooms as r', 'r.id', 'b.room_id');

    new FilterBuilder(qb)
      .when(query.hotelId, (builder, hotelId) => {
        builder.where('r.hotel_id', hotelId);
      })
      .done();

    applyDateRange(qb, 'b.stay_date', query.dateFrom, query.dateTo);
    applyCursorPagination(
      qb,
      this.parseCursor(query.cursor),
      'b.created_at',
      'b.id',
    );
    qb.orderBy('b.created_at', 'desc').orderBy('b.id', 'desc');

    const rows = (await qb.limit(query.limit + 1)) as BookingRow[];

    if (rows.length <= query.limit) {
      return { items: rows };
    }

    const items = rows.slice(0, query.limit);
    const last = items[items.length - 1];

    if (last === undefined) {
      return { items: [] };
    }

    return {
      items,
      nextCursor: encodeCursor({
        createdAt: last.created_at.toISOString(),
        id: last.id,
      }),
    };
  }

  async create(input: {
    userId: string;
    roomId: string;
    stayDate: string;
  }): Promise<{ bookingId: string }> {
    return this.knexClient.transaction(async (trx) => {
      const existing = (await trx('bookings')
        .select('id')
        .where({ room_id: input.roomId, stay_date: input.stayDate })
        .forUpdate()) as Array<{ id: string }>;

      if (existing.length > 0) {
        throw new ConflictException('Room already booked for selected date');
      }

      const bookingId = crypto.randomUUID();

      await trx('bookings').insert({
        id: bookingId,
        user_id: input.userId,
        room_id: input.roomId,
        stay_date: input.stayDate,
        status: 'confirmed',
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });

      return { bookingId };
    });
  }

  private parseCursor(cursor: string | undefined): CursorPayload | undefined {
    return cursor === undefined ? undefined : decodeCursor(cursor);
  }
}
