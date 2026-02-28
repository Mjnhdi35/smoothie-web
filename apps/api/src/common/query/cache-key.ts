type CacheValue = string | number | boolean | Date | null | undefined;

function normalizeCacheValue(value: CacheValue): string | number | boolean {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return '';
}

export function buildStableCacheKey(prefix: string, payload: object): string {
  const entries = Object.entries(payload as Record<string, CacheValue>)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, normalizeCacheValue(value)] as const)
    .filter(([, value]) => value !== '');

  if (entries.length === 0) {
    return prefix;
  }

  entries.sort(([left], [right]) => left.localeCompare(right));
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    params.set(key, String(value));
  }

  return `${prefix}:${params.toString()}`;
}
