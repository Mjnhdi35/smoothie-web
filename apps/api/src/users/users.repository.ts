import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { BaseRepository } from '../common/repository/base.repository';
import {
  applyQueryFilterRules,
  type QueryFilterRule,
} from '../common/query/query-filter.engine';
import {
  applyDateRange,
  applyDeletedScope,
  applySort,
  orWhereInsensitiveContains,
  whereInsensitiveContains,
  whereInsensitiveEqual,
} from '../common/query/query-builder.helpers';
import type { DeletedScope, SortOrder } from '../common/query/query.types';
import type { DbKnex } from '../database/database.constants';
import { KNEX } from '../database/database.constants';

const USERS_TABLE = 'users';

export type UserId = string;
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export type UserSortBy = 'created_at' | 'updated_at' | 'email' | 'name';
export type UserSortOrder = SortOrder;
export type UserDeletedScope = DeletedScope;

export interface UserRow {
  id: UserId;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
}

export interface UserLookupOptions {
  deleted?: UserDeletedScope;
}

export interface UserListQuery {
  limit: number;
  offset: number;
  sortBy: UserSortBy;
  sortOrder: UserSortOrder;
  deleted: UserDeletedScope;
  name?: string;
  email?: string;
  search?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

const userListFilterRules: QueryFilterRule<UserListQuery>[] = [
  {
    isActive: () => true,
    apply: (queryBuilder, query) => {
      applyDeletedScope(queryBuilder, query.deleted);
    },
  },
  {
    isActive: (query) => query.email !== undefined,
    apply: (queryBuilder, query) => {
      whereInsensitiveEqual(queryBuilder, 'email', query.email!);
    },
  },
  {
    isActive: (query) => query.name !== undefined,
    apply: (queryBuilder, query) => {
      whereInsensitiveContains(queryBuilder, 'name', query.name!);
    },
  },
  {
    isActive: (query) => query.search !== undefined,
    apply: (queryBuilder, query) => {
      queryBuilder.andWhere((subQueryBuilder) => {
        whereInsensitiveContains(subQueryBuilder, 'email', query.search!);
        orWhereInsensitiveContains(subQueryBuilder, 'name', query.search!);
      });
    },
  },
  {
    isActive: (query) =>
      query.createdFrom !== undefined || query.createdTo !== undefined,
    apply: (queryBuilder, query) => {
      applyDateRange(
        queryBuilder,
        'created_at',
        query.createdFrom,
        query.createdTo,
      );
    },
  },
];

export interface UsersRepositoryPort {
  create(input: CreateUserInput, trx?: Knex.Transaction): Promise<UserRow>;
  findById(
    id: UserId,
    options?: UserLookupOptions,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined>;
  findByEmail(
    email: string,
    options?: UserLookupOptions,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined>;
  findAll(query: UserListQuery, trx?: Knex.Transaction): Promise<UserRow[]>;
  updateById(
    id: UserId,
    input: UpdateUserInput,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined>;
  softDeleteById(id: UserId, trx?: Knex.Transaction): Promise<number>;
  restoreById(id: UserId, trx?: Knex.Transaction): Promise<UserRow | undefined>;
}

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
      .returning('*')) as UserRow[];

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
    const queryBuilder = this.selectBase(trx).where({ id });
    applyDeletedScope(queryBuilder, options?.deleted ?? 'exclude');

    const user = (await queryBuilder.first()) as UserRow | undefined;
    return user;
  }

  async findByEmail(
    email: string,
    options?: UserLookupOptions,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined> {
    const queryBuilder = this.selectBase(trx);
    whereInsensitiveEqual(queryBuilder, 'email', email);
    applyDeletedScope(queryBuilder, options?.deleted ?? 'exclude');

    const user = (await queryBuilder.first()) as UserRow | undefined;
    return user;
  }

  async findAll(
    query: UserListQuery,
    trx?: Knex.Transaction,
  ): Promise<UserRow[]> {
    const queryBuilder = this.selectBase(trx);

    applyQueryFilterRules(queryBuilder, query, userListFilterRules);

    applySort(queryBuilder, query.sortBy, query.sortOrder);
    const users = await queryBuilder.limit(query.limit).offset(query.offset);

    return users as UserRow[];
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
      .where({ id })
      .whereNull('deleted_at')
      .update({
        ...updates,
        ...this.updateTimestamp(),
      })
      .returning('*')) as UserRow[];

    return updatedUser;
  }

  async softDeleteById(id: UserId, trx?: Knex.Transaction): Promise<number> {
    const deletedCount = await this.tableQuery(trx)
      .where({ id })
      .whereNull('deleted_at')
      .update({
        deleted_at: this.knex.fn.now(),
        ...this.updateTimestamp(),
      });

    return deletedCount;
  }

  async restoreById(
    id: UserId,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined> {
    const [restoredUser] = (await this.tableQuery(trx)
      .where({ id })
      .whereNotNull('deleted_at')
      .update({
        deleted_at: null,
        ...this.updateTimestamp(),
      })
      .returning('*')) as UserRow[];

    return restoredUser;
  }
}
