import type { PaginationOptions, PaginationQuery } from './query.types';

export function normalizeTrimmed(value: string): string {
  return value.trim();
}

export function normalizeLowerCase(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeOptionalTrimmed(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized === '' ? undefined : normalized;
}

export function normalizeOptionalLowerCase(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '' ? undefined : normalized;
}

export function normalizeDateInput(
  value: string | undefined,
): Date | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function normalizePagination(
  query: PaginationQuery,
  options: PaginationOptions,
): { limit: number; offset: number } {
  const limit = normalizeLimit(query.limit, options);
  const offset = normalizeOffset(query.offset, options);

  return { limit, offset };
}

function normalizeLimit(
  value: number | undefined,
  options: PaginationOptions,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return options.defaultLimit;
  }

  return Math.min(
    Math.max(Math.trunc(value), options.minLimit),
    options.maxLimit,
  );
}

function normalizeOffset(
  value: number | undefined,
  options: PaginationOptions,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return options.minOffset;
  }

  return Math.max(Math.trunc(value), options.minOffset);
}
