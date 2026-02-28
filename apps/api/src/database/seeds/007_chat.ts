import type { Knex } from 'knex';
import { NOW, USER_IDS, offsetDate } from '../seed-data.constants';

const ROOM_IDS = {
  support: '70000000-0000-4000-8000-000000000001',
  community: '70000000-0000-4000-8000-000000000002',
} as const;

export async function seed(knex: Knex): Promise<void> {
  const hasMessages = await knex.schema.hasTable('chat_messages');
  if (!hasMessages) {
    return;
  }

  const hasRooms = await knex.schema.hasTable('chat_rooms');
  const hasParticipants = await knex.schema.hasTable('chat_participants');

  if (hasRooms) {
    await knex('chat_rooms')
      .insert([
        {
          id: ROOM_IDS.support,
          type: 'support',
          created_at: offsetDate(NOW, -2),
        },
        {
          id: ROOM_IDS.community,
          type: 'community',
          created_at: offsetDate(NOW, -1),
        },
      ])
      .onConflict('id')
      .merge(['type']);
  }

  if (hasParticipants) {
    await knex('chat_participants')
      .insert([
        {
          room_id: ROOM_IDS.support,
          user_id: USER_IDS.staffA,
          joined_at: offsetDate(NOW, -2),
        },
        {
          room_id: ROOM_IDS.support,
          user_id: USER_IDS.user01,
          joined_at: offsetDate(NOW, -2),
        },
        {
          room_id: ROOM_IDS.support,
          user_id: USER_IDS.user02,
          joined_at: offsetDate(NOW, -2),
        },
        {
          room_id: ROOM_IDS.community,
          user_id: USER_IDS.staffB,
          joined_at: offsetDate(NOW, -1),
        },
        {
          room_id: ROOM_IDS.community,
          user_id: USER_IDS.user03,
          joined_at: offsetDate(NOW, -1),
        },
        {
          room_id: ROOM_IDS.community,
          user_id: USER_IDS.user04,
          joined_at: offsetDate(NOW, -1),
        },
      ])
      .onConflict(['room_id', 'user_id'])
      .ignore();
  }

  const senderRotation = [
    USER_IDS.staffA,
    USER_IDS.user01,
    USER_IDS.user02,
    USER_IDS.staffB,
    USER_IDS.user03,
    USER_IDS.user04,
  ] as const;

  const messages = Array.from({ length: 20 }, (_, index) => {
    const roomId = index < 10 ? ROOM_IDS.support : ROOM_IDS.community;
    const senderId = senderRotation[index % senderRotation.length];

    return {
      id: `71000000-0000-4000-8000-${(index + 1).toString().padStart(12, '0')}`,
      room_id: roomId,
      sender_id: senderId,
      message: `Seed message ${index + 1} for ${roomId === ROOM_IDS.support ? 'support' : 'community'} room`,
      created_at: offsetDate(NOW, -1, index),
    };
  });

  await knex('chat_messages')
    .insert(messages)
    .onConflict('id')
    .merge(['message']);
}
