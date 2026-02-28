export function normalizeDatabaseUrl(rawValue: string): string {
  const value = rawValue.trim();

  if (value === '') {
    throw new Error('DATABASE_URL must not be empty');
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use postgres:// or postgresql://');
  }

  if (url.searchParams.get('sslmode') !== 'verify-full') {
    url.searchParams.set('sslmode', 'verify-full');
  }

  return url.toString();
}
