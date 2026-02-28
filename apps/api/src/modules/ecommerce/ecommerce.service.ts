import { Inject, Injectable } from '@nestjs/common';
import { EVENT_BUS, type EventBus } from '../../common/events/event-bus';
import { createDomainEvent } from '../../common/events/domain-event';
import { buildStableCacheKey } from '../../common/query/cache-key';
import { DEFAULT_CURSOR_PAGINATION } from '../../common/query/query.constants';
import { normalizePagination } from '../../common/query/query-normalizer';
import { IdempotencyService } from '../../infrastructure/redis/idempotency.service';
import { RedisCacheService } from '../../infrastructure/redis/redis-cache.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ECOMMERCE_REPOSITORY } from './ecommerce.constants';
import type { EcommerceRepositoryPort } from './ecommerce.repository.port';
import type { ProductListPage, ProductListQuery } from './ecommerce.types';

@Injectable()
export class EcommerceService {
  constructor(
    @Inject(ECOMMERCE_REPOSITORY)
    private readonly ecommerceRepository: EcommerceRepositoryPort,
    private readonly cacheService: RedisCacheService,
    private readonly idempotencyService: IdempotencyService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async listProducts(query: ListProductsQueryDto): Promise<ProductListPage> {
    const normalized = this.normalizeListQuery(query);
    const cacheKey = buildStableCacheKey('products:list', normalized);

    return this.cacheService.getOrSetJson<ProductListPage>(cacheKey, 60, () =>
      this.ecommerceRepository.listProducts(normalized),
    );
  }

  async createOrder(dto: CreateOrderDto): Promise<{ orderId: string }> {
    const claimed = await this.idempotencyService.claim(
      `idempotency:orders:${dto.idempotencyKey}`,
      300,
    );

    if (!claimed) {
      return { orderId: 'processing' };
    }

    const created = await this.ecommerceRepository.createOrder({
      userId: dto.userId,
      idempotencyKey: dto.idempotencyKey,
      items: dto.items,
    });

    await this.eventBus.publish(
      createDomainEvent({
        aggregate: 'order',
        type: 'order.created',
        payload: { orderId: created.orderId, userId: dto.userId },
      }),
    );

    return created;
  }

  private normalizeListQuery(query: ListProductsQueryDto): ProductListQuery {
    const limit = normalizePagination(query, DEFAULT_CURSOR_PAGINATION);

    return {
      limit,
      cursor: query.cursor,
      category: query.category,
      priceMin: query.priceMin,
      priceMax: query.priceMax,
    };
  }
}
