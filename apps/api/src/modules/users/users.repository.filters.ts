import type { Knex } from 'knex';
import { FilterBuilder } from '../../common/query/filter-builder';
import {
  applyDateRange,
  applyDeletedScope,
  whereInsensitiveContains,
  whereInsensitiveEqual,
} from '../../common/query/query-builder.helpers';
import { USER_COLUMNS } from './users.constants';
import type { UserListQuery } from './users.types';

export function applyUserListFilters(
  queryBuilder: Knex.QueryBuilder,
  query: UserListQuery,
): void {
  new FilterBuilder(queryBuilder)
    .when(query.deleted, (builder, deleted) => {
      applyDeletedScope(builder, deleted);
    })
    .when(query.email, (builder, email) => {
      whereInsensitiveEqual(builder, USER_COLUMNS.email, email);
    })
    .when(query.name, (builder, name) => {
      whereInsensitiveContains(builder, USER_COLUMNS.name, name);
    })
    .done();

  applyDateRange(
    queryBuilder,
    USER_COLUMNS.createdAt,
    query.createdFrom,
    query.createdTo,
  );
}
