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
  expires_at: Date;
  revoked_at: Date | null;
}

@Injectable()
export class AuthRepository {
  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  async createSession(input: {
    sessionId: string;
    userId: string;
    expiresAt: Date;
    trx?: Knex.Transaction;
  }): Promise<void> {
    const executor = input.trx ?? this.knexClient;

    await executor<AuthSessionRow>('auth_sessions').insert({
      session_id: input.sessionId,
      user_id: input.userId,
      created_at: this.knexClient.fn.now(),
      expires_at: input.expiresAt,
      revoked_at: null,
    });
  }

  async revokeSession(
    sessionId: string,
    trx?: Knex.Transaction,
  ): Promise<number> {
    const executor = trx ?? this.knexClient;

    return executor<AuthSessionRow>('auth_sessions')
      .where({ session_id: sessionId })
      .whereNull('revoked_at')
      .update({
        revoked_at: this.knexClient.fn.now(),
      });
  }
}
