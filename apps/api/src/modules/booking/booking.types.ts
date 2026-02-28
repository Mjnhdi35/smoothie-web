export interface BookingRow {
  id: string;
  user_id: string;
  room_id: string;
  stay_date: string;
  status: string;
  created_at: Date;
}

export interface BookingListQuery {
  hotelId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit: number;
  cursor?: string;
}

export interface BookingListPage {
  items: BookingRow[];
  nextCursor?: string;
}
