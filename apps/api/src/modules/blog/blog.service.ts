import { Inject, Injectable } from '@nestjs/common';
import { EVENT_BUS, type EventBus } from '../../common/events/event-bus';
import { createDomainEvent } from '../../common/events/domain-event';
import { buildStableCacheKey } from '../../common/query/cache-key';
import { DEFAULT_CURSOR_PAGINATION } from '../../common/query/query.constants';
import {
  normalizeDateInput,
  normalizePagination,
} from '../../common/query/query-normalizer';
import { RedisCacheService } from '../../infrastructure/redis/redis-cache.service';
import { BLOG_REPOSITORY } from './blog.constants';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import type { BlogRepositoryPort } from './blog.repository.port';
import type { BlogPostListPage, BlogPostListQuery } from './blog.types';

@Injectable()
export class BlogService {
  constructor(
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: BlogRepositoryPort,
    private readonly cacheService: RedisCacheService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async list(query: ListPostsQueryDto): Promise<BlogPostListPage> {
    const normalized = this.normalizeQuery(query);
    const cacheKey = buildStableCacheKey('blog:list', normalized);

    return this.cacheService.getOrSetJson<BlogPostListPage>(cacheKey, 90, () =>
      this.blogRepository.list(normalized),
    );
  }

  async create(dto: CreatePostDto): Promise<{ postId: string }> {
    const created = await this.blogRepository.create(dto);

    await this.cacheService.deleteByPrefix('blog:list:');

    if (dto.status === 'published') {
      await this.eventBus.publish(
        createDomainEvent({
          aggregate: 'blog_post',
          type: 'post.published',
          payload: { postId: created.postId },
        }),
      );
    }

    return created;
  }

  private normalizeQuery(query: ListPostsQueryDto): BlogPostListQuery {
    const limit = normalizePagination(query, DEFAULT_CURSOR_PAGINATION);

    return {
      status: query.status,
      tag: query.tag,
      createdFrom: normalizeDateInput(query.createdFrom),
      createdTo: normalizeDateInput(query.createdTo),
      limit,
      cursor: query.cursor,
    };
  }
}
