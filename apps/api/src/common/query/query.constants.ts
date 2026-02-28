import type { PaginationOptions } from './query.types';

export const DEFAULT_CURSOR_PAGINATION = {
  defaultLimit: 20,
  minLimit: 1,
  maxLimit: 100,
} as const satisfies PaginationOptions;
