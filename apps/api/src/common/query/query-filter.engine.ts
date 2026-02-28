import type { Knex } from 'knex';

export interface QueryFilterRule<TQuery> {
  isActive: (query: TQuery) => boolean;
  apply: (queryBuilder: Knex.QueryBuilder, query: TQuery) => void;
}

export function applyQueryFilterRules<TQuery>(
  queryBuilder: Knex.QueryBuilder,
  query: TQuery,
  rules: QueryFilterRule<TQuery>[],
): void {
  for (const rule of rules) {
    if (!rule.isActive(query)) {
      continue;
    }

    rule.apply(queryBuilder, query);
  }
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
