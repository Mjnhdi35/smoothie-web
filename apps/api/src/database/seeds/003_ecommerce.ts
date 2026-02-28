import type { Knex } from 'knex';
import { NOW, USER_IDS, offsetDate } from '../seed-data.constants';

const CATEGORY_IDS = {
  electronics: '30000000-0000-4000-8000-000000000001',
  fashion: '30000000-0000-4000-8000-000000000002',
  home: '30000000-0000-4000-8000-000000000003',
  sports: '30000000-0000-4000-8000-000000000004',
  beauty: '30000000-0000-4000-8000-000000000005',
} as const;

const PRODUCT_IDS = Array.from({ length: 20 }, (_, index) => {
  const sequence = (index + 1).toString().padStart(12, '0');
  return `31000000-0000-4000-8000-${sequence}`;
});

export async function seed(knex: Knex): Promise<void> {
  const [hasProducts, hasInventory, hasOrders, hasOrderItems] =
    await Promise.all([
      knex.schema.hasTable('products'),
      knex.schema.hasTable('inventory'),
      knex.schema.hasTable('orders'),
      knex.schema.hasTable('order_items'),
    ]);

  if (!hasProducts || !hasInventory || !hasOrders || !hasOrderItems) {
    return;
  }

  const hasCategories = await knex.schema.hasTable('categories');
  const hasCategoryId = await knex.schema.hasColumn('products', 'category_id');
  const hasDescription = await knex.schema.hasColumn('products', 'description');

  const categories = [
    { id: CATEGORY_IDS.electronics, name: 'electronics' },
    { id: CATEGORY_IDS.fashion, name: 'fashion' },
    { id: CATEGORY_IDS.home, name: 'home' },
    { id: CATEGORY_IDS.sports, name: 'sports' },
    { id: CATEGORY_IDS.beauty, name: 'beauty' },
  ];

  if (hasCategories) {
    await knex('categories')
      .insert(categories.map((category) => ({ ...category, parent_id: null })))
      .onConflict('id')
      .merge(['name']);
  }

  const categoryIdByName = new Map(
    categories.map((category) => [category.name, category.id] as const),
  );

  const productDefinitions = [
    ['Wireless Earbuds', 'electronics', '59.00'],
    ['Mechanical Keyboard', 'electronics', '129.00'],
    ['4K Monitor 27"', 'electronics', '329.00'],
    ['Smart Watch', 'electronics', '199.00'],
    ['Cotton Hoodie', 'fashion', '49.00'],
    ['Slim Jeans', 'fashion', '69.00'],
    ['Leather Belt', 'fashion', '39.00'],
    ['Running Shoes', 'fashion', '119.00'],
    ['Coffee Grinder', 'home', '89.00'],
    ['Air Fryer', 'home', '149.00'],
    ['Desk Lamp', 'home', '45.00'],
    ['Storage Box Set', 'home', '29.00'],
    ['Yoga Mat Pro', 'sports', '42.00'],
    ['Adjustable Dumbbell', 'sports', '219.00'],
    ['Trail Backpack', 'sports', '99.00'],
    ['Cycling Helmet', 'sports', '79.00'],
    ['Vitamin C Serum', 'beauty', '25.00'],
    ['Sunscreen SPF50', 'beauty', '19.00'],
    ['Hair Repair Mask', 'beauty', '31.00'],
    ['Face Cleanser', 'beauty', '22.00'],
  ] as const;

  const products = productDefinitions.map(([name, category, price], index) => {
    const categoryId = categoryIdByName.get(category);
    const row: Record<string, unknown> = {
      id: PRODUCT_IDS[index],
      name,
      category,
      price,
      created_at: NOW,
      updated_at: NOW,
    };

    if (hasDescription) {
      row.description = `${name} curated for production demo catalog.`;
    }

    if (hasCategoryId && categoryId !== undefined) {
      row.category_id = categoryId;
    }

    return row;
  });

  await knex('products')
    .insert(products)
    .onConflict('id')
    .merge(['name', 'category', 'price', 'updated_at']);

  const inventoryRows = PRODUCT_IDS.map((productId, index) => ({
    product_id: productId,
    available_qty: 15 + (index % 5) * 5,
    updated_at: NOW,
  }));

  await knex('inventory')
    .insert(inventoryRows)
    .onConflict('product_id')
    .merge(['available_qty', 'updated_at']);

  const orderIds = [
    '32000000-0000-4000-8000-000000000001',
    '32000000-0000-4000-8000-000000000002',
    '32000000-0000-4000-8000-000000000003',
  ] as const;

  await knex('orders')
    .insert([
      {
        id: orderIds[0],
        user_id: USER_IDS.user01,
        idempotency_key: 'seed-order-001',
        status: 'created',
        created_at: offsetDate(NOW, -2),
        updated_at: offsetDate(NOW, -2),
      },
      {
        id: orderIds[1],
        user_id: USER_IDS.user02,
        idempotency_key: 'seed-order-002',
        status: 'paid',
        created_at: offsetDate(NOW, -1),
        updated_at: offsetDate(NOW, -1),
      },
      {
        id: orderIds[2],
        user_id: USER_IDS.user03,
        idempotency_key: 'seed-order-003',
        status: 'fulfilled',
        created_at: NOW,
        updated_at: NOW,
      },
    ])
    .onConflict('id')
    .merge(['status', 'updated_at']);

  const orderItems = [
    {
      id: '32100000-0000-4000-8000-000000000001',
      order_id: orderIds[0],
      product_id: PRODUCT_IDS[0],
      quantity: 1,
      price_at_time: '59.00',
      created_at: offsetDate(NOW, -2),
    },
    {
      id: '32100000-0000-4000-8000-000000000002',
      order_id: orderIds[0],
      product_id: PRODUCT_IDS[8],
      quantity: 1,
      price_at_time: '89.00',
      created_at: offsetDate(NOW, -2),
    },
    {
      id: '32100000-0000-4000-8000-000000000003',
      order_id: orderIds[1],
      product_id: PRODUCT_IDS[4],
      quantity: 2,
      price_at_time: '49.00',
      created_at: offsetDate(NOW, -1),
    },
    {
      id: '32100000-0000-4000-8000-000000000004',
      order_id: orderIds[1],
      product_id: PRODUCT_IDS[13],
      quantity: 1,
      price_at_time: '219.00',
      created_at: offsetDate(NOW, -1),
    },
    {
      id: '32100000-0000-4000-8000-000000000005',
      order_id: orderIds[2],
      product_id: PRODUCT_IDS[16],
      quantity: 1,
      price_at_time: '25.00',
      created_at: NOW,
    },
    {
      id: '32100000-0000-4000-8000-000000000006',
      order_id: orderIds[2],
      product_id: PRODUCT_IDS[2],
      quantity: 1,
      price_at_time: '329.00',
      created_at: NOW,
    },
    {
      id: '32100000-0000-4000-8000-000000000007',
      order_id: orderIds[2],
      product_id: PRODUCT_IDS[18],
      quantity: 2,
      price_at_time: '31.00',
      created_at: NOW,
    },
  ];

  await knex('order_items')
    .insert(orderItems)
    .onConflict('id')
    .merge(['quantity', 'price_at_time']);
}
