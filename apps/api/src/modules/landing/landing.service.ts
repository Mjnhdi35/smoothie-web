import { Inject, Injectable } from '@nestjs/common';
import { buildStableCacheKey } from '../../common/query/cache-key';
import { DEFAULT_CURSOR_PAGINATION } from '../../common/query/query.constants';
import { normalizePagination } from '../../common/query/query-normalizer';
import { RedisCacheService } from '../../infrastructure/redis/redis-cache.service';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { ListLandingPagesQueryDto } from './dto/list-landing-pages-query.dto';
import { LANDING_REPOSITORY } from './landing.constants';
import type { LandingRepositoryPort } from './landing.repository.port';
import type {
  LandingPageListPage,
  LandingPageListQuery,
} from './landing.types';

@Injectable()
export class LandingService {
  constructor(
    @Inject(LANDING_REPOSITORY)
    private readonly landingRepository: LandingRepositoryPort,
    private readonly cacheService: RedisCacheService,
  ) {}

  async list(query: ListLandingPagesQueryDto): Promise<LandingPageListPage> {
    const normalized = this.normalizeQuery(query);
    const cacheKey = buildStableCacheKey('landing:list', normalized);

    return this.cacheService.getOrSetJson<LandingPageListPage>(
      cacheKey,
      120,
      () => this.landingRepository.list(normalized),
    );
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
