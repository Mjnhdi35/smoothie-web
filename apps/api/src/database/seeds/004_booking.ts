import type { Knex } from 'knex';
import { NOW, USER_IDS, offsetDate } from '../seed-data.constants';

const ADDRESS_IDS = {
  hanoi: '40000000-0000-4000-8000-000000000001',
  danang: '40000000-0000-4000-8000-000000000002',
} as const;

const HOTEL_IDS = {
  skyline: '41000000-0000-4000-8000-000000000001',
  coastal: '41000000-0000-4000-8000-000000000002',
} as const;

const ROOM_IDS = Array.from({ length: 10 }, (_, index) => {
  const sequence = (index + 1).toString().padStart(12, '0');
  return `42000000-0000-4000-8000-${sequence}`;
});

export async function seed(knex: Knex): Promise<void> {
  const [hasHotels, hasRooms, hasBookings] = await Promise.all([
    knex.schema.hasTable('hotels'),
    knex.schema.hasTable('rooms'),
    knex.schema.hasTable('bookings'),
  ]);

  if (!hasHotels || !hasRooms || !hasBookings) {
    return;
  }

  const hasAddresses = await knex.schema.hasTable('addresses');
  const hasHotelAddressId = await knex.schema.hasColumn('hotels', 'address_id');
  const hasRoomType = await knex.schema.hasColumn('rooms', 'type');
  const hasRoomBasePrice = await knex.schema.hasColumn('rooms', 'base_price');
  const hasCheckIn = await knex.schema.hasColumn('bookings', 'check_in');
  const hasCheckOut = await knex.schema.hasColumn('bookings', 'check_out');

  if (hasAddresses) {
    await knex('addresses')
      .insert([
        {
          id: ADDRESS_IDS.hanoi,
          country: 'Vietnam',
          city: 'Hanoi',
          street: '12 Lake View',
          zip_code: '100000',
          created_at: NOW,
        },
        {
          id: ADDRESS_IDS.danang,
          country: 'Vietnam',
          city: 'Da Nang',
          street: '88 Beach Front',
          zip_code: '550000',
          created_at: NOW,
        },
      ])
      .onConflict('id')
      .merge(['country', 'city', 'street', 'zip_code']);
  }

  const hotels: Array<Record<string, unknown>> = [
    {
      id: HOTEL_IDS.skyline,
      name: 'Skyline Business Hotel',
      created_at: NOW,
      ...(hasAddresses && hasHotelAddressId
        ? { address_id: ADDRESS_IDS.hanoi }
        : {}),
    },
    {
      id: HOTEL_IDS.coastal,
      name: 'Coastal Resort & Spa',
      created_at: NOW,
      ...(hasAddresses && hasHotelAddressId
        ? { address_id: ADDRESS_IDS.danang }
        : {}),
    },
  ];

  await knex('hotels').insert(hotels).onConflict('id').merge(['name']);

  const roomRows = Array.from({ length: 10 }, (_, index) => {
    const hotelId = index < 5 ? HOTEL_IDS.skyline : HOTEL_IDS.coastal;
    const roomNumber = `${index < 5 ? 'S' : 'C'}${(index % 5) + 1}0${index % 3}`;

    const row: Record<string, unknown> = {
      id: ROOM_IDS[index],
      hotel_id: hotelId,
      room_number: roomNumber,
      created_at: NOW,
    };

    if (hasRoomType) {
      row.type = index % 3 === 0 ? 'suite' : 'standard';
    }

    if (hasRoomBasePrice) {
      row.base_price = index % 3 === 0 ? '120.00' : '80.00';
    }

    return row;
  });

  await knex('rooms')
    .insert(roomRows)
    .onConflict(['hotel_id', 'room_number'])
    .merge(['hotel_id']);

  const bookingRows: Array<Record<string, unknown>> = [
    {
      id: '43000000-0000-4000-8000-000000000001',
      user_id: USER_IDS.user01,
      room_id: ROOM_IDS[0],
      stay_date: '2026-03-05',
      status: 'confirmed',
      created_at: offsetDate(NOW, -2),
      updated_at: offsetDate(NOW, -2),
    },
    {
      id: '43000000-0000-4000-8000-000000000002',
      user_id: USER_IDS.user02,
      room_id: ROOM_IDS[1],
      stay_date: '2026-03-06',
      status: 'confirmed',
      created_at: offsetDate(NOW, -1),
      updated_at: offsetDate(NOW, -1),
    },
    {
      id: '43000000-0000-4000-8000-000000000003',
      user_id: USER_IDS.user03,
      room_id: ROOM_IDS[5],
      stay_date: '2026-03-06',
      status: 'cancelled',
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: '43000000-0000-4000-8000-000000000004',
      user_id: USER_IDS.user04,
      room_id: ROOM_IDS[6],
      stay_date: '2026-03-07',
      status: 'confirmed',
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: '43000000-0000-4000-8000-000000000005',
      user_id: USER_IDS.user05,
      room_id: ROOM_IDS[8],
      stay_date: '2026-03-08',
      status: 'confirmed',
      created_at: NOW,
      updated_at: NOW,
    },
  ];

  if (hasCheckIn && hasCheckOut) {
    for (const row of bookingRows) {
      row.check_in = row.stay_date;
      row.check_out = row.stay_date;
    }
  }

  await knex('bookings')
    .insert(bookingRows)
    .onConflict('id')
    .merge(['status', 'updated_at']);
}
