import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
}

export async function down(): Promise<void> {
  // Keep extensions in place because they may be shared by other schemas/tables.
}
