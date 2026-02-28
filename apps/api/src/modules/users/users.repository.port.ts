import type { Knex } from 'knex';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserId,
  UserListPage,
  UserListQuery,
  UserLookupOptions,
  UserRow,
} from './users.types';

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
  findAll(query: UserListQuery, trx?: Knex.Transaction): Promise<UserListPage>;
  updateById(
    id: UserId,
    input: UpdateUserInput,
    trx?: Knex.Transaction,
  ): Promise<UserRow | undefined>;
  softDeleteById(id: UserId, trx?: Knex.Transaction): Promise<number>;
  restoreById(id: UserId, trx?: Knex.Transaction): Promise<UserRow | undefined>;
}
