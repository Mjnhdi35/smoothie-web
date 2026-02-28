export const USERS_TABLE = 'users';
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export const USER_COLUMNS = {
  id: 'id',
  email: 'email',
  name: 'name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
} as const;

export const USER_SELECT_COLUMNS = [
  USER_COLUMNS.id,
  USER_COLUMNS.email,
  USER_COLUMNS.name,
  USER_COLUMNS.createdAt,
  USER_COLUMNS.updatedAt,
  USER_COLUMNS.deletedAt,
] as const;

export const USER_SORT_COLUMNS = [
  USER_COLUMNS.createdAt,
  USER_COLUMNS.updatedAt,
  USER_COLUMNS.email,
  USER_COLUMNS.name,
] as const;

export const USER_FIELD_MAX_LENGTH = {
  name: 120,
  email: 320,
} as const;

export const USER_LIST_PAGINATION = {
  defaultLimit: 20,
  minLimit: 1,
  maxLimit: 100,
} as const;

export const USER_LIST_DEFAULTS = {
  sortBy: USER_COLUMNS.createdAt,
  sortOrder: 'desc',
  deleted: 'exclude',
} as const;
