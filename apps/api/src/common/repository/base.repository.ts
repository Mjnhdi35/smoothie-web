import type { Knex } from 'knex';

export abstract class BaseRepository<TRecord extends object> {
  protected constructor(
    protected readonly knex: Knex,
    protected readonly table: string,
  ) {}

  protected tableQuery(
    trx?: Knex.Transaction,
  ): Knex.QueryBuilder<TRecord, unknown[]> {
    const executor = trx ?? this.knex;
    return executor<TRecord, unknown[]>(this.table);
  }

  protected selectBase(
    trx?: Knex.Transaction,
  ): Knex.QueryBuilder<TRecord, unknown[]> {
    return this.tableQuery(trx).select('*');
  }

  protected createTimestamps(): {
    created_at: Knex.Raw;
    updated_at: Knex.Raw;
  } {
    return {
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };
  }

  protected updateTimestamp(): { updated_at: Knex.Raw } {
    return { updated_at: this.knex.fn.now() };
  }

  protected removeUndefinedFields<TPayload extends object>(
    payload: TPayload,
  ): Partial<TPayload> {
    const cleaned: Partial<TPayload> = {};

    for (const [key, value] of Object.entries(payload) as Array<
      [keyof TPayload, TPayload[keyof TPayload]]
    >) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }
}
