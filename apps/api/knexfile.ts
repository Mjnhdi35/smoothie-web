import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();

type KnexSettings = Knex.Config<Record<string, unknown>>;
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.trim() === '') {
  throw new Error('DATABASE_URL is required for Knex migrations.');
}

const baseConfig = {
  client: 'pg',
  connection: databaseUrl,
  pool: { min: 0, max: 3 },
  migrations: {
    directory: './src/database/migrations',
    extension: 'ts',
    tableName: 'knex_migrations',
  },
} satisfies KnexSettings;

const config = {
  development: baseConfig,
  test: {
    ...baseConfig,
    connection: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL,
  },
  production: baseConfig,
} satisfies Record<'development' | 'test' | 'production', KnexSettings>;

export default config;
module.exports = config;
