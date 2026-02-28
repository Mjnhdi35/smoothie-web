import type { Knex } from 'knex';

const USERS_EMAIL_LOWER_UNIQUE_INDEX = 'users_email_lower_unique_idx';
const USERS_TABLE = 'users';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${USERS_EMAIL_LOWER_UNIQUE_INDEX}
      ON ${USERS_TABLE}
      USING btree (lower(email))`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS ${USERS_EMAIL_LOWER_UNIQUE_INDEX}`);
}
