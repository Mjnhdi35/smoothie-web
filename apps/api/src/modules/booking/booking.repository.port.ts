import type { BookingListPage, BookingListQuery } from './booking.types';

export interface BookingRepositoryPort {
  list(query: BookingListQuery): Promise<BookingListPage>;
  create(input: {
    userId: string;
    roomId: string;
    stayDate: string;
  }): Promise<{ bookingId: string }>;
}
