import type { Knex } from 'knex';

const TABLE = 'auth_sessions';
const EXPIRES_INDEX = 'auth_sessions_expires_at_idx';

export async function up(knex: Knex): Promise<void> {
  const hasExpiresAt = await knex.schema.hasColumn(TABLE, 'expires_at');
  const hasRevokedAt = await knex.schema.hasColumn(TABLE, 'revoked_at');

  if (!hasExpiresAt || !hasRevokedAt) {
    await knex.schema.alterTable(TABLE, (table) => {
      if (!hasExpiresAt) {
        table.timestamp('expires_at', { useTz: true }).nullable();
      }

      if (!hasRevokedAt) {
        table.timestamp('revoked_at', { useTz: true }).nullable();
      }
    });
  }

  await knex(TABLE)
    .whereNull('expires_at')
    .update({ expires_at: knex.fn.now() });

  await knex.schema.alterTable(TABLE, (table) => {
    table.index(['expires_at'], EXPIRES_INDEX);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE, (table) => {
    table.dropIndex(['expires_at'], EXPIRES_INDEX);
    table.dropColumn('revoked_at');
    table.dropColumn('expires_at');
  });
}
