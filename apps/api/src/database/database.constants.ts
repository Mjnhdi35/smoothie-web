import type { Knex } from 'knex';

export const KNEX = Symbol('KNEX');
export type DbKnex = Knex<Record<string, unknown>, unknown[]>;
