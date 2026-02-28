import type { Knex } from 'knex';

const BOOKINGS = 'bookings';

export async function up(knex: Knex): Promise<void> {
  const hasBookings = await knex.schema.hasTable(BOOKINGS);
  if (!hasBookings) {
    return;
  }

  const hasCheckIn = await knex.schema.hasColumn(BOOKINGS, 'check_in');
  const hasCheckOut = await knex.schema.hasColumn(BOOKINGS, 'check_out');

  if (!hasCheckIn || !hasCheckOut) {
    await knex.schema.alterTable(BOOKINGS, (table) => {
      if (!hasCheckIn) {
        table.date('check_in').nullable();
      }

      if (!hasCheckOut) {
        table.date('check_out').nullable();
      }
    });

    const legacyBookings = await knex(BOOKINGS).select<
      { id: string; stay_date: string | null }[]
    >('id', 'stay_date');
    for (const booking of legacyBookings) {
      if (booking.stay_date !== null) {
        await knex(BOOKINGS).where({ id: booking.id }).update({
          check_in: booking.stay_date,
          check_out: booking.stay_date,
        });
      }
    }
  }

  await knex.schema.alterTable(BOOKINGS, (table) => {
    table.index(['room_id', 'check_in'], 'bookings_room_check_in_idx');
    table.index(['user_id'], 'bookings_user_id_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasBookings = await knex.schema.hasTable(BOOKINGS);
  if (!hasBookings) {
    return;
  }

  await knex.schema.alterTable(BOOKINGS, (table) => {
    table.dropIndex(['room_id', 'check_in'], 'bookings_room_check_in_idx');
    table.dropIndex(['user_id'], 'bookings_user_id_idx');
  });
}
