import type { Knex } from 'knex';

export class FilterBuilder {
  constructor(private readonly queryBuilder: Knex.QueryBuilder) {}

  when<TValue>(
    value: TValue | undefined,
    apply: (queryBuilder: Knex.QueryBuilder, value: TValue) => void,
  ): this {
    if (value !== undefined) {
      apply(this.queryBuilder, value);
    }

    return this;
  }

  done(): Knex.QueryBuilder {
    return this.queryBuilder;
  }
}
