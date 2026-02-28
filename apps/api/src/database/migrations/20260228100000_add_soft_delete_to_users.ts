import type { Knex } from 'knex';

const USERS_TABLE = 'users';
const USERS_EMAIL_LOWER_UNIQUE_INDEX = 'users_email_lower_unique_idx';

export async function up(knex: Knex): Promise<void> {
  const hasDeletedAt = await knex.schema.hasColumn(USERS_TABLE, 'deleted_at');

  if (!hasDeletedAt) {
    await knex.schema.alterTable(USERS_TABLE, (table) => {
      table.timestamp('deleted_at', { useTz: true }).nullable();
    });
  }

  await knex.raw(`DROP INDEX IF EXISTS ${USERS_EMAIL_LOWER_UNIQUE_INDEX}`);
  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${USERS_EMAIL_LOWER_UNIQUE_INDEX}
      ON ${USERS_TABLE} (lower(email))
      WHERE deleted_at IS NULL`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS ${USERS_EMAIL_LOWER_UNIQUE_INDEX}`);
  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${USERS_EMAIL_LOWER_UNIQUE_INDEX}
      ON ${USERS_TABLE} USING btree (lower(email))`,
  );

  const hasDeletedAt = await knex.schema.hasColumn(USERS_TABLE, 'deleted_at');

  if (hasDeletedAt) {
    await knex.schema.alterTable(USERS_TABLE, (table) => {
      table.dropColumn('deleted_at');
    });
  }
}
