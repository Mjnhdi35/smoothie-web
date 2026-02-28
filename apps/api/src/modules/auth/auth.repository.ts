import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import {
  KNEX,
  type DbKnex,
} from '../../infrastructure/database/database.constants';

interface AuthSessionRow {
  session_id: string;
  user_id: string;
  created_at: Date;
}

@Injectable()
export class AuthRepository {
  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  async createSession(input: {
    sessionId: string;
    userId: string;
    trx?: Knex.Transaction;
  }): Promise<void> {
    const executor = input.trx ?? this.knexClient;

    await executor<AuthSessionRow>('auth_sessions').insert({
      session_id: input.sessionId,
      user_id: input.userId,
      created_at: this.knexClient.fn.now(),
    });
  }
}
