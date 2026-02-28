import type { Knex } from 'knex';

const USERS_TABLE = 'users';
const USERS_NAME_INDEX = 'users_name_idx';
const USERS_CREATED_AT_INDEX = 'users_created_at_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.index(['name'], USERS_NAME_INDEX);
    table.index(['created_at'], USERS_CREATED_AT_INDEX);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.dropIndex(['name'], USERS_NAME_INDEX);
    table.dropIndex(['created_at'], USERS_CREATED_AT_INDEX);
  });
}
