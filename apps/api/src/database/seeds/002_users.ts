import type { Knex } from 'knex';
import { NOW, ROLE_IDS, USER_IDS } from '../seed-data.constants';

async function hashPassword(knex: Knex, plain: string): Promise<string> {
  const row = await knex
    .raw<{
      rows: Array<{ hash: string }>;
    }>("SELECT crypt(?, gen_salt('bf', 10)) AS hash", [plain])
    .then((result) => result.rows[0]);

  if (row === undefined) {
    throw new Error('Failed to hash password for seed data');
  }

  return row.hash;
}

export async function seed(knex: Knex): Promise<void> {
  const hasUsers = await knex.schema.hasTable('users');
  const hasRoles = await knex.schema.hasTable('roles');

  if (!hasUsers || !hasRoles) {
    return;
  }

  const [adminHash, staffHash, userHash] = await Promise.all([
    hashPassword(knex, 'Admin#2026!'),
    hashPassword(knex, 'Staff#2026!'),
    hashPassword(knex, 'User#2026!'),
  ]);

  const users = [
    {
      id: USER_IDS.superAdmin,
      email: 'admin@smoothie.local',
      name: 'System Admin',
      role_id: ROLE_IDS.admin,
      password_hash: adminHash,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: USER_IDS.staffA,
      email: 'staff.ops@smoothie.local',
      name: 'Ops Staff',
      role_id: ROLE_IDS.staff,
      password_hash: staffHash,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: USER_IDS.staffB,
      email: 'staff.support@smoothie.local',
      name: 'Support Staff',
      role_id: ROLE_IDS.staff,
      password_hash: staffHash,
      created_at: NOW,
      updated_at: NOW,
    },
    ...Array.from({ length: 10 }, (_, index) => {
      const sequence = index + 1;
      const padded = sequence.toString().padStart(2, '0');
      const userId = USER_IDS[`user${padded}` as keyof typeof USER_IDS];

      if (userId === undefined) {
        throw new Error(`Missing deterministic user id for index ${padded}`);
      }

      return {
        id: userId,
        email: `customer${padded}@smoothie.local`,
        name: `Customer ${padded}`,
        role_id: ROLE_IDS.user,
        password_hash: userHash,
        created_at: NOW,
        updated_at: NOW,
      };
    }),
  ];

  await knex('users')
    .insert(users)
    .onConflict('id')
    .merge(['email', 'name', 'role_id', 'password_hash', 'updated_at']);
}
