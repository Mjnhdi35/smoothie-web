import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type { DbKnex } from './database.constants';
import { KNEX } from './database.constants';

@Injectable()
export class KnexService {
  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  get client(): DbKnex {
    return this.knexClient;
  }

  raw(sql: string, bindings?: Knex.RawBinding[]): Promise<unknown> {
    if (bindings === undefined) {
      return this.knexClient.raw(sql);
    }

    return this.knexClient.raw(sql, bindings);
  }

  transaction<T>(handler: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    return this.knexClient.transaction(handler);
  }
}
