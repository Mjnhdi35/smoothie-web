import type { Knex } from 'knex';
import type { DeletedScope, SortOrder } from './query.types';

export function applyDeletedScope(
  queryBuilder: Knex.QueryBuilder,
  scope: DeletedScope,
  column = 'deleted_at',
): void {
  if (scope === 'exclude') {
    queryBuilder.whereNull(column);
    return;
  }

  if (scope === 'only') {
    queryBuilder.whereNotNull(column);
  }
}

export function whereInsensitiveEqual(
  queryBuilder: Knex.QueryBuilder,
  column: string,
  value: string,
): void {
  queryBuilder.whereILike(column, value);
}

export function whereInsensitiveContains(
  queryBuilder: Knex.QueryBuilder,
  column: string,
  value: string,
): void {
  queryBuilder.whereILike(column, `%${value}%`);
}

export function orWhereInsensitiveContains(
  queryBuilder: Knex.QueryBuilder,
  column: string,
  value: string,
): void {
  queryBuilder.orWhereILike(column, `%${value}%`);
}

export function applyDateRange(
  queryBuilder: Knex.QueryBuilder,
  column: string,
  from?: Date,
  to?: Date,
): void {
  if (from !== undefined) {
    queryBuilder.where(column, '>=', from);
  }

  if (to !== undefined) {
    queryBuilder.where(column, '<=', to);
  }
}

export function applySort(
  queryBuilder: Knex.QueryBuilder,
  column: string,
  order: SortOrder,
): void {
  queryBuilder.orderBy(column, order);
}
