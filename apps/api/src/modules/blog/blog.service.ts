import { Inject, Injectable } from '@nestjs/common';
import { EVENT_BUS, type EventBus } from '../../common/events/event-bus';
import { createDomainEvent } from '../../common/events/domain-event';
import { DEFAULT_CURSOR_PAGINATION } from '../../common/query/query.constants';
import {
  normalizeDateInput,
  normalizePagination,
} from '../../common/query/query-normalizer';
import { RedisCacheService } from '../../infrastructure/redis/redis-cache.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { BlogRepository } from './blog.repository';
import type { BlogPostListPage, BlogPostListQuery } from './blog.types';

@Injectable()
export class BlogService {
  constructor(
    private readonly blogRepository: BlogRepository,
    private readonly cacheService: RedisCacheService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async list(query: ListPostsQueryDto): Promise<BlogPostListPage> {
    const normalized = this.normalizeQuery(query);
    const cacheKey = `blog:list:${JSON.stringify(normalized)}`;

    const cached = await this.cacheService.getJson<BlogPostListPage>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const page = await this.blogRepository.list(normalized);
    await this.cacheService.setJson(cacheKey, page, 90);

    return page;
  }

  async create(dto: CreatePostDto): Promise<{ postId: string }> {
    const created = await this.blogRepository.create(dto);

    await this.cacheService.del('blog:list:*');

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
