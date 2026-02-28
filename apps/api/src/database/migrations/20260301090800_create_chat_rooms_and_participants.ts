import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasChatRooms = await knex.schema.hasTable('chat_rooms');
  if (!hasChatRooms) {
    await knex.schema.createTable('chat_rooms', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('type', 40).notNullable();
      table
        .timestamp('created_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
    });
  }

  const hasParticipants = await knex.schema.hasTable('chat_participants');
  if (!hasParticipants) {
    await knex.schema.createTable('chat_participants', (table) => {
      table
        .uuid('room_id')
        .notNullable()
        .references('id')
        .inTable('chat_rooms')
        .onDelete('CASCADE')
        .onUpdate('RESTRICT');
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
        .onUpdate('RESTRICT');
      table
        .timestamp('joined_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.primary(['room_id', 'user_id']);
      table.index(['user_id'], 'chat_participants_user_id_idx');
    });
  }

  const hasMessages = await knex.schema.hasTable('chat_messages');
  if (hasMessages) {
    await knex.schema.alterTable('chat_messages', (table) => {
      table.index(['sender_id'], 'chat_messages_sender_id_idx');
      table.index(
        ['room_id', 'created_at'],
        'chat_messages_room_created_v2_idx',
      );
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasMessages = await knex.schema.hasTable('chat_messages');
  if (hasMessages) {
    await knex.schema.alterTable('chat_messages', (table) => {
      table.dropIndex(['sender_id'], 'chat_messages_sender_id_idx');
      table.dropIndex(
        ['room_id', 'created_at'],
        'chat_messages_room_created_v2_idx',
      );
    });
  }

  await knex.schema.dropTableIfExists('chat_participants');
  await knex.schema.dropTableIfExists('chat_rooms');
}
