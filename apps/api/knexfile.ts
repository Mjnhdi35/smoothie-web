import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();

type KnexSettings = Knex.Config<Record<string, unknown>>;

const baseConfig = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
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
