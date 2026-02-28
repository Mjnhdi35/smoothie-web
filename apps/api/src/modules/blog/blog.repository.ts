import { Inject, Injectable } from '@nestjs/common';
import {
  applyCursorPagination,
  decodeCursor,
  encodeCursor,
  type CursorPayload,
} from '../../common/query/cursor-pagination';
import { FilterBuilder } from '../../common/query/filter-builder';
import { applyDateRange } from '../../common/query/query-builder.helpers';
import {
  KNEX,
  type DbKnex,
} from '../../infrastructure/database/database.constants';
import type {
  BlogPostListPage,
  BlogPostListQuery,
  BlogPostRow,
} from './blog.types';

@Injectable()
export class BlogRepository {
  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  async list(query: BlogPostListQuery): Promise<BlogPostListPage> {
    const qb = this.knexClient<BlogPostRow>('blog_posts').select(
      'id',
      'title',
      'content',
      'status',
      'tag',
      'created_at',
    );

    new FilterBuilder(qb)
      .when(query.status, (builder, status) => {
        builder.where('status', status);
      })
      .when(query.tag, (builder, tag) => {
        builder.where('tag', tag);
      })
      .done();

    applyDateRange(qb, 'created_at', query.createdFrom, query.createdTo);
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
    title: string;
    content: string;
    status: string;
    tag: string;
  }): Promise<{ postId: string }> {
    const postId = crypto.randomUUID();

    await this.knexClient('blog_posts').insert({
      id: postId,
      title: input.title,
      content: input.content,
      status: input.status,
      tag: input.tag,
      created_at: this.knexClient.fn.now(),
      updated_at: this.knexClient.fn.now(),
    });

    return { postId };
  }

  private parseCursor(cursor: string | undefined): CursorPayload | undefined {
    return cursor === undefined ? undefined : decodeCursor(cursor);
  }
}
