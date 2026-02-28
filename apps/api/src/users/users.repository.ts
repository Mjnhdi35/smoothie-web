import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { BaseRepository } from '../common/repository/base.repository';
import { KNEX } from '../database/database.module';

const USERS_TABLE = 'users';

export type UserId = string;

export interface UserRow {
  id: UserId;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
}

export interface UserListOptions {
  limit: number;
  offset: number;
}

@Injectable()
export class UsersRepository extends BaseRepository<UserRow> {
  constructor(@Inject(KNEX) knexClient: Knex) {
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
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined> {
    const user = (await this.selectBase(trx).where({ id }).first()) as
      | UserRow
      | undefined;
    return user;
  }

  async findByEmail(
    email: string,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined> {
    const user = (await this.selectBase(trx)
      .whereRaw('lower(email) = lower(?)', [email])
      .first()) as UserRow | undefined;
    return user;
  }

  async findAll(
    options: UserListOptions,
    trx?: Knex.Transaction,
  ): Promise<UserRow[]> {
    const users = await this.selectBase(trx)
      .orderBy('id', 'desc')
      .limit(options.limit)
      .offset(options.offset);

    return users as UserRow[];
  }

  async updateById(
    id: UserId,
    input: UpdateUserInput,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined> {
    const updates = this.removeUndefinedFields(input);

    if (Object.keys(updates).length === 0) {
      return this.findById(id, trx);
    }

    const [updatedUser] = (await this.tableQuery(trx)
      .where({ id })
      .update({
        ...updates,
        ...this.updateTimestamp(),
      })
      .returning('*')) as UserRow[];

    return updatedUser;
  }

  async deleteById(id: UserId, trx?: Knex.Transaction): Promise<number> {
    const deletedCount = await this.tableQuery(trx).where({ id }).del();
    return deletedCount;
  }
}
