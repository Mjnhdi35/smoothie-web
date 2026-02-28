import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasAuditLogs = await knex.schema.hasTable('audit_logs');
  if (!hasAuditLogs) {
    await knex.schema.createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table
        .uuid('user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('RESTRICT');
      table.string('action', 80).notNullable();
      table.string('entity', 80).notNullable();
      table.uuid('entity_id').nullable();
      table.jsonb('metadata').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table
        .timestamp('created_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.index(['user_id'], 'audit_logs_user_id_idx');
      table.index(['entity', 'entity_id'], 'audit_logs_entity_entity_id_idx');
      table.index(['created_at'], 'audit_logs_created_at_idx');
    });
  }

  const hasActivityLogs = await knex.schema.hasTable('activity_logs');
  if (!hasActivityLogs) {
    await knex.schema.createTable('activity_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table
        .uuid('user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('RESTRICT');
      table.string('activity_type', 80).notNullable();
      table.jsonb('context').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table
        .timestamp('created_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.index(['user_id'], 'activity_logs_user_id_idx');
      table.index(['created_at'], 'activity_logs_created_at_idx');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('activity_logs');
  await knex.schema.dropTableIfExists('audit_logs');
}
