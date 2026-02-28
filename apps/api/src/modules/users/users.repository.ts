import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import {
  applyCursorPagination,
  decodeCursor,
  encodeCursor,
  type CursorPage,
  type CursorPayload,
} from '../../common/query/cursor-pagination';
import { BaseRepository } from '../../common/repository/base.repository';
import {
  applySort,
  applyDeletedScope,
  whereInsensitiveEqual,
} from '../../common/query/query-builder.helpers';
import type { DbKnex } from '../../infrastructure/database/database.constants';
import { KNEX } from '../../infrastructure/database/database.constants';
import {
  USER_COLUMNS,
  USER_LIST_DEFAULTS,
  USER_SELECT_COLUMNS,
  USERS_TABLE,
} from './users.constants';
import { applyUserListFilters } from './users.repository.filters';
import type { UsersRepositoryPort } from './users.repository.port';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserId,
  UserListPage,
  UserListQuery,
  UserLookupOptions,
  UserRow,
} from './users.types';

@Injectable()
export class UsersRepository
  extends BaseRepository<UserRow>
  implements UsersRepositoryPort
{
  constructor(@Inject(KNEX) knexClient: DbKnex) {
    super(knexClient, USERS_TABLE);
  }

  async create(
    input: CreateUserInput,
    trx?: Knex.Transaction,
  ): Promise<UserRow> {
    const [createdUser] = (await this.tableQuery(trx)
      .insert({
        ...input,
        ...this.createTimestamps(),
      })
      .returning([...USER_SELECT_COLUMNS])) as UserRow[];

    if (createdUser === undefined) {
      throw new Error('Failed to create user');
    }

    return createdUser;
  }

  async findById(
    id: UserId,
    options?: UserLookupOptions,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined> {
    const queryBuilder = this.tableQuery(trx)
      .select(...USER_SELECT_COLUMNS)
      .where({ [USER_COLUMNS.id]: id });
    applyDeletedScope(
      queryBuilder,
      options?.deleted ?? USER_LIST_DEFAULTS.deleted,
    );

    const user = (await queryBuilder.first()) as UserRow | undefined;
    return user;
  }

  async findByEmail(
    email: string,
    options?: UserLookupOptions,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined> {
    const queryBuilder = this.tableQuery(trx).select(...USER_SELECT_COLUMNS);
    whereInsensitiveEqual(queryBuilder, USER_COLUMNS.email, email);
    applyDeletedScope(
      queryBuilder,
      options?.deleted ?? USER_LIST_DEFAULTS.deleted,
    );

    const user = (await queryBuilder.first()) as UserRow | undefined;
    return user;
  }

  async findAll(
    query: UserListQuery,
    trx?: Knex.Transaction,
  ): Promise<UserListPage> {
    const queryBuilder = this.tableQuery(trx).select(...USER_SELECT_COLUMNS);

    applyUserListFilters(queryBuilder, query);
    applyCursorPagination(
      queryBuilder,
      this.parseCursor(query.cursor),
      USER_COLUMNS.createdAt,
      USER_COLUMNS.id,
    );
    applySort(queryBuilder, query.sortBy, query.sortOrder);

    queryBuilder.orderBy(USER_COLUMNS.id, query.sortOrder);

    const rows = (await queryBuilder.limit(query.limit + 1)) as UserRow[];
    return this.toCursorPage(rows, query.limit);
  }

  async updateById(
    id: UserId,
    input: UpdateUserInput,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined> {
    const updates = this.removeUndefinedFields(input);

    if (Object.keys(updates).length === 0) {
      return this.findById(id, undefined, trx);
    }

    const [updatedUser] = (await this.tableQuery(trx)
      .where({ [USER_COLUMNS.id]: id })
      .whereNull(USER_COLUMNS.deletedAt)
      .update({
        ...updates,
        ...this.updateTimestamp(),
      })
      .returning([...USER_SELECT_COLUMNS])) as UserRow[];

    return updatedUser;
  }

  async softDeleteById(id: UserId, trx?: Knex.Transaction): Promise<number> {
    const deletedCount = await this.tableQuery(trx)
      .where({ [USER_COLUMNS.id]: id })
      .whereNull(USER_COLUMNS.deletedAt)
      .update({
        [USER_COLUMNS.deletedAt]: this.knex.fn.now(),
        ...this.updateTimestamp(),
      });

    return deletedCount;
  }

  async restoreById(
    id: UserId,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined> {
    const [restoredUser] = (await this.tableQuery(trx)
      .where({ [USER_COLUMNS.id]: id })
      .whereNotNull(USER_COLUMNS.deletedAt)
      .update({
        [USER_COLUMNS.deletedAt]: null,
        ...this.updateTimestamp(),
      })
      .returning([...USER_SELECT_COLUMNS])) as UserRow[];

    return restoredUser;
  }

  private parseCursor(cursor: string | undefined): CursorPayload | undefined {
    if (cursor === undefined) {
      return undefined;
    }

    return decodeCursor(cursor);
  }

  private toCursorPage(rows: UserRow[], limit: number): CursorPage<UserRow> {
    if (rows.length <= limit) {
      return { items: rows };
    }

    const items = rows.slice(0, limit);
    const last = items[items.length - 1];

    if (last === undefined) {
      return { items: [] };
    }

    return {
      items,
      nextCursor: encodeCursor({
        createdAt: last.created_at.toISOString(),
        id: last.id,
      }),
    };
  }
}
