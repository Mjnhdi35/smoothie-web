import type { Knex } from 'knex';

const USERS = 'users';
const ROLES = 'roles';

export async function up(knex: Knex): Promise<void> {
  const hasUsers = await knex.schema.hasTable(USERS);
  if (!hasUsers) {
    return;
  }

  const hasPasswordHash = await knex.schema.hasColumn(USERS, 'password_hash');
  const hasRoleId = await knex.schema.hasColumn(USERS, 'role_id');

  if (!hasPasswordHash || !hasRoleId) {
    await knex.schema.alterTable(USERS, (table) => {
      if (!hasPasswordHash) {
        table.string('password_hash', 255).nullable();
      }

      if (!hasRoleId) {
        table.uuid('role_id').nullable();
      }
    });
  }

  const defaultRole = await knex(ROLES)
    .select('id')
    .where({ name: 'user' })
    .first<{ id: string }>();
  if (defaultRole !== undefined) {
    await knex(USERS).whereNull('role_id').update({ role_id: defaultRole.id });
  }

  await knex.schema.alterTable(USERS, (table) => {
    table
      .foreign('role_id')
      .references('roles.id')
      .onUpdate('RESTRICT')
      .onDelete('RESTRICT');
    table.index(['role_id'], 'users_role_id_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasUsers = await knex.schema.hasTable(USERS);
  if (!hasUsers) {
    return;
  }

  await knex.schema.alterTable(USERS, (table) => {
    table.dropIndex(['role_id'], 'users_role_id_idx');
    table.dropForeign(['role_id']);
  });
}
