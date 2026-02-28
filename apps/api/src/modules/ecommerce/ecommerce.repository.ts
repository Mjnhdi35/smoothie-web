import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  applyCursorPagination,
  decodeCursor,
  encodeCursor,
  type CursorPayload,
} from '../../common/query/cursor-pagination';
import { FilterBuilder } from '../../common/query/filter-builder';
import {
  KNEX,
  type DbKnex,
} from '../../infrastructure/database/database.constants';
import type {
  CreateOrderInput,
  ProductListPage,
  ProductListQuery,
  ProductRow,
} from './ecommerce.types';

@Injectable()
export class EcommerceRepository {
  constructor(@Inject(KNEX) private readonly knexClient: DbKnex) {}

  async listProducts(query: ProductListQuery): Promise<ProductListPage> {
    const qb = this.knexClient<ProductRow>('products').select(
      'id',
      'name',
      'category',
      'price',
      'created_at',
    );

    new FilterBuilder(qb)
      .when(query.category, (builder, category) => {
        builder.whereILike('category', category);
      })
      .when(query.priceMin, (builder, priceMin) => {
        builder.where('price', '>=', priceMin);
      })
      .when(query.priceMax, (builder, priceMax) => {
        builder.where('price', '<=', priceMax);
      })
      .done();

    const cursor = this.parseCursor(query.cursor);
    applyCursorPagination(qb, cursor, 'created_at', 'id');
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

  async createOrder(input: CreateOrderInput): Promise<{ orderId: string }> {
    return this.knexClient.transaction(async (trx) => {
      const orderId = crypto.randomUUID();

      const inserted = await trx('orders')
        .insert({
          id: orderId,
          user_id: input.userId,
          idempotency_key: input.idempotencyKey,
          status: 'created',
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .onConflict('idempotency_key')
        .ignore()
        .returning('id');

      if (inserted.length === 0) {
        throw new ConflictException('Duplicate idempotency key');
      }

      for (const item of input.items) {
        const updated = await trx('inventory')
          .where({ product_id: item.productId })
          .where('available_qty', '>=', item.quantity)
          .decrement('available_qty', item.quantity);

        if (updated === 0) {
          throw new ConflictException(
            `Insufficient inventory for ${item.productId}`,
          );
        }

        await trx('order_items').insert({
          id: crypto.randomUUID(),
          order_id: orderId,
          product_id: item.productId,
          quantity: item.quantity,
          created_at: trx.fn.now(),
        });
      }

      return { orderId };
    });
  }

  private parseCursor(cursor: string | undefined): CursorPayload | undefined {
    if (cursor === undefined) {
      return undefined;
    }

    return decodeCursor(cursor);
  }
}
