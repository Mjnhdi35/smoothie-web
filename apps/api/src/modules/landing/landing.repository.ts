import { Inject, Injectable } from '@nestjs/common';
import {
  applyCursorPagination,
  decodeCursor,
  encodeCursor,
  type CursorPayload,
} from '../../common/query/cursor-pagination';
import {
  KNEX,
  type DbKnex,
} from '../../infrastructure/database/database.constants';
import type {
  LandingPageListPage,
  LandingPageListQuery,
  LandingPageRow,
} from './landing.types';

@Injectable()
export class LandingRepository {
  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  async list(query: LandingPageListQuery): Promise<LandingPageListPage> {
    const qb = this.knexClient<LandingPageRow>('landing_pages').select(
      'id',
      'slug',
      'title',
      'content',
      'status',
      'created_at',
    );

    if (query.status !== undefined) {
      qb.where('status', query.status);
    }

    applyCursorPagination(
      qb,
      this.parseCursor(query.cursor),
      'created_at',
      'id',
    );
    qb.orderBy('created_at', 'desc').orderBy('id', 'desc');

    const rows = await qb.limit(query.limit + 1);

    if (rows.length <= query.limit) {
      return { items: rows };
    }

    const items = rows.slice(0, query.limit);
    const last = items[items.length - 1];

    if (last === undefined) {
      return { items: [] };
    }

    return {
      items,
      nextCursor: encodeCursor({
        createdAt: last.created_at.toISOString(),
        id: last.id,
      }),
    };
  }

  async create(input: {
    slug: string;
    title: string;
    content: string;
    status: string;
  }): Promise<{ pageId: string }> {
    const pageId = crypto.randomUUID();

    await this.knexClient('landing_pages').insert({
      id: pageId,
      slug: input.slug,
      title: input.title,
      content: input.content,
      status: input.status,
      created_at: this.knexClient.fn.now(),
      updated_at: this.knexClient.fn.now(),
    });

    return { pageId };
  }

  private parseCursor(cursor: string | undefined): CursorPayload | undefined {
    return cursor === undefined ? undefined : decodeCursor(cursor);
  }
}
