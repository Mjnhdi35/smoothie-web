import type { USER_SORT_COLUMNS } from './users.constants';

export type UserId = string;

export type UserSortBy = (typeof USER_SORT_COLUMNS)[number];
export type UserSortOrder = 'asc' | 'desc';
export type UserDeletedScope = 'exclude' | 'include' | 'only';

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
  cursor?: string;
  sortBy: UserSortBy;
  sortOrder: UserSortOrder;
  deleted: UserDeletedScope;
  name?: string;
  email?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface UserListPage {
  items: UserRow[];
  nextCursor?: string;
}
