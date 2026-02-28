#!/usr/bin/env node
import process from 'node:process';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl.trim() === '') {
  throw new Error('DATABASE_URL is required');
}

const queryArg = process.argv.slice(2).join(' ').trim();
if (queryArg === '') {
  throw new Error('Usage: pnpm --filter @smoothie/api db:explain -- "SELECT ..."');
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: true },
});

await client.connect();

try {
  const result = await client.query(
    `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT) ${queryArg}`,
  );

  for (const row of result.rows) {
    process.stdout.write(`${row['QUERY PLAN']}\n`);
  }
} finally {
  await client.end();
}
