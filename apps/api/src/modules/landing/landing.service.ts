import { Injectable } from '@nestjs/common';
import { DEFAULT_CURSOR_PAGINATION } from '../../common/query/query.constants';
import { normalizePagination } from '../../common/query/query-normalizer';
import { RedisCacheService } from '../../infrastructure/redis/redis-cache.service';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { ListLandingPagesQueryDto } from './dto/list-landing-pages-query.dto';
import { LandingRepository } from './landing.repository';
import type {
  LandingPageListPage,
  LandingPageListQuery,
} from './landing.types';

@Injectable()
export class LandingService {
  constructor(
    private readonly landingRepository: LandingRepository,
    private readonly cacheService: RedisCacheService,
  ) {}

  async list(query: ListLandingPagesQueryDto): Promise<LandingPageListPage> {
    const normalized = this.normalizeQuery(query);
    const cacheKey = `landing:list:${JSON.stringify(normalized)}`;

    const cached =
      await this.cacheService.getJson<LandingPageListPage>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const page = await this.landingRepository.list(normalized);
    await this.cacheService.setJson(cacheKey, page, 120);
    return page;
  }

  async create(dto: CreateLandingPageDto): Promise<{ pageId: string }> {
    const created = await this.landingRepository.create(dto);
    await this.cacheService.del(`landing:slug:${dto.slug}`);
    return created;
  }

  private normalizeQuery(
    query: ListLandingPagesQueryDto,
  ): LandingPageListQuery {
    const limit = normalizePagination(query, DEFAULT_CURSOR_PAGINATION);

    return {
      status: query.status,
      limit,
      cursor: query.cursor,
    };
  }
}
