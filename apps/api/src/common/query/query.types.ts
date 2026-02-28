export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const DELETED_SCOPES = ['exclude', 'include', 'only'] as const;
export type DeletedScope = (typeof DELETED_SCOPES)[number];

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface PaginationOptions {
  defaultLimit: number;
  minLimit: number;
  maxLimit: number;
  minOffset: number;
}
