import type { Knex } from 'knex';

const ORDERS = 'orders';
const ORDER_ITEMS = 'order_items';

export async function up(knex: Knex): Promise<void> {
  const hasOrders = await knex.schema.hasTable(ORDERS);
  const hasOrderItems = await knex.schema.hasTable(ORDER_ITEMS);

  if (hasOrders) {
    await knex.schema.alterTable(ORDERS, (table) => {
      table
        .foreign('user_id')
        .references('users.id')
        .onDelete('RESTRICT')
        .onUpdate('RESTRICT');
      table.index(['user_id'], 'orders_user_id_idx');
    });
  }

  if (hasOrderItems) {
    const hasPriceAtTime = await knex.schema.hasColumn(
      ORDER_ITEMS,
      'price_at_time',
    );
    if (!hasPriceAtTime) {
      await knex.schema.alterTable(ORDER_ITEMS, (table) => {
        table.decimal('price_at_time', 12, 2).nullable();
      });

      const joinedItems = await knex(ORDER_ITEMS)
        .leftJoin('products', 'products.id', `${ORDER_ITEMS}.product_id`)
        .select<
          { id: string; price: string | null }[]
        >(`${ORDER_ITEMS}.id`, 'products.price');

      for (const item of joinedItems) {
        if (item.price !== null) {
          await knex(ORDER_ITEMS)
            .where({ id: item.id })
            .update({ price_at_time: item.price });
        }
      }
    }

    await knex.schema.alterTable(ORDER_ITEMS, (table) => {
      table.unique(['order_id', 'product_id'], {
        indexName: 'order_items_order_product_unique_idx',
      });
      table.index(['product_id'], 'order_items_product_id_idx');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasOrders = await knex.schema.hasTable(ORDERS);
  const hasOrderItems = await knex.schema.hasTable(ORDER_ITEMS);

  if (hasOrders) {
    await knex.schema.alterTable(ORDERS, (table) => {
      table.dropIndex(['user_id'], 'orders_user_id_idx');
      table.dropForeign(['user_id']);
    });
  }

  if (hasOrderItems) {
    await knex.schema.alterTable(ORDER_ITEMS, (table) => {
      table.dropIndex(['product_id'], 'order_items_product_id_idx');
      table.dropUnique(
        ['order_id', 'product_id'],
        'order_items_order_product_unique_idx',
      );
    });
  }
}
