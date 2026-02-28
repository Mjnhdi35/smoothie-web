import type { Knex } from 'knex';

const USERS_TABLE = 'users';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(USERS_TABLE, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 320).notNullable();
    table.string('name', 120).notNullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(USERS_TABLE);
}
