import type { Knex } from 'knex';

const ADDRESSES = 'addresses';
const HOTELS = 'hotels';
const ROOMS = 'rooms';

export async function up(knex: Knex): Promise<void> {
  const hasAddresses = await knex.schema.hasTable(ADDRESSES);
  if (!hasAddresses) {
    await knex.schema.createTable(ADDRESSES, (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('country', 120).notNullable();
      table.string('city', 120).notNullable();
      table.string('street', 255).notNullable();
      table.string('zip_code', 40).nullable();
      table
        .timestamp('created_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
    });
  }

  const hasHotels = await knex.schema.hasTable(HOTELS);
  if (hasHotels) {
    const hasAddressId = await knex.schema.hasColumn(HOTELS, 'address_id');
    if (!hasAddressId) {
      await knex.schema.alterTable(HOTELS, (table) => {
        table.uuid('address_id').nullable();
      });
    }

    const hotelsWithoutAddress = await knex(HOTELS)
      .whereNull('address_id')
      .select<{ id: string }[]>('id');
    for (const hotel of hotelsWithoutAddress) {
      const [created] = await knex(ADDRESSES)
        .insert({ country: 'unknown', city: 'unknown', street: 'unknown' })
        .returning<{ id: string }[]>('id');

      if (created !== undefined) {
        await knex(HOTELS)
          .where({ id: hotel.id })
          .update({ address_id: created.id });
      }
    }

    await knex.schema.alterTable(HOTELS, (table) => {
      table
        .foreign('address_id')
        .references('addresses.id')
        .onDelete('RESTRICT')
        .onUpdate('RESTRICT');
      table.index(['address_id'], 'hotels_address_id_idx');
    });
  }

  const hasRooms = await knex.schema.hasTable(ROOMS);
  if (hasRooms) {
    const hasType = await knex.schema.hasColumn(ROOMS, 'type');
    const hasBasePrice = await knex.schema.hasColumn(ROOMS, 'base_price');

    if (!hasType || !hasBasePrice) {
      await knex.schema.alterTable(ROOMS, (table) => {
        if (!hasType) {
          table.string('type', 80).nullable();
        }

        if (!hasBasePrice) {
          table.decimal('base_price', 12, 2).nullable();
        }
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasHotels = await knex.schema.hasTable(HOTELS);
  if (hasHotels) {
    await knex.schema.alterTable(HOTELS, (table) => {
      table.dropIndex(['address_id'], 'hotels_address_id_idx');
      table.dropForeign(['address_id']);
    });
  }
}
