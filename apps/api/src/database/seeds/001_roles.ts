import type { Knex } from 'knex';
import { NOW, ROLE_IDS } from '../seed-data.constants';

export async function seed(knex: Knex): Promise<void> {
  const hasRoles = await knex.schema.hasTable('roles');
  if (!hasRoles) {
    return;
  }

  await knex('roles')
    .insert([
      { id: ROLE_IDS.admin, name: 'admin', created_at: NOW },
      { id: ROLE_IDS.staff, name: 'staff', created_at: NOW },
      { id: ROLE_IDS.user, name: 'user', created_at: NOW },
    ])
    .onConflict('id')
    .merge(['name']);
}
