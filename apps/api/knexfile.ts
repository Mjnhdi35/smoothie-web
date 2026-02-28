import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import { normalizeDatabaseUrl } from './src/config/database-url';

dotenv.config();

type KnexSettings = Knex.Config<Record<string, unknown>>;
const rawDatabaseUrl = process.env.DATABASE_URL;

if (rawDatabaseUrl === undefined || rawDatabaseUrl.trim() === '') {
  throw new Error('DATABASE_URL is required for Knex migrations.');
}

const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);

const baseConfig = {
  client: 'pg',
  connection: {
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: true,
    },
    statement_timeout: 5000,
    query_timeout: 5000,
  },
  pool: {
    min: 0,
    max: 5,
    idleTimeoutMillis: 30000,
  },
  migrations: {
    directory: './src/database/migrations',
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/database/seeds',
    extension: 'ts',
  },
} satisfies KnexSettings;

const config = {
  development: baseConfig,
  test: {
    ...baseConfig,
    connection: normalizeDatabaseUrl(
      process.env.DATABASE_URL_TEST ?? rawDatabaseUrl,
    ),
  },
  production: baseConfig,
} satisfies Record<'development' | 'test' | 'production', KnexSettings>;

export default config;
module.exports = config;
