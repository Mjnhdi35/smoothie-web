import type { Knex } from 'knex';

const CATEGORIES = 'categories';
const PRODUCTS = 'products';

export async function up(knex: Knex): Promise<void> {
  const hasProducts = await knex.schema.hasTable(PRODUCTS);
  if (!hasProducts) {
    return;
  }

  const hasCategories = await knex.schema.hasTable(CATEGORIES);
  if (!hasCategories) {
    await knex.schema.createTable(CATEGORIES, (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 120).notNullable();
      table
        .uuid('parent_id')
        .nullable()
        .references('id')
        .inTable(CATEGORIES)
        .onDelete('SET NULL')
        .onUpdate('RESTRICT');
      table
        .timestamp('created_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.unique(['name', 'parent_id'], {
        indexName: 'categories_name_parent_unique_idx',
      });
      table.index(['parent_id'], 'categories_parent_id_idx');
    });
  }

  const hasCategoryId = await knex.schema.hasColumn(PRODUCTS, 'category_id');
  if (!hasCategoryId) {
    await knex.schema.alterTable(PRODUCTS, (table) => {
      table.uuid('category_id').nullable();
      table.text('description').nullable();
    });
  }

  const distinctCategories = await knex(PRODUCTS)
    .distinct<{ category: string }[]>('category')
    .whereNotNull('category');

  for (const row of distinctCategories) {
    const categoryName = row.category.trim();
    if (categoryName === '') {
      continue;
    }

    await knex(CATEGORIES)
      .insert({ name: categoryName })
      .onConflict(['name', 'parent_id'])
      .ignore();
  }

  const categories = await knex(CATEGORIES).select<
    { id: string; name: string }[]
  >('id', 'name');
  const categoryByName = new Map(
    categories.map((item) => [item.name, item.id]),
  );

  const products = await knex(PRODUCTS).select<
    { id: string; category: string | null }[]
  >('id', 'category');
  for (const product of products) {
    if (product.category === null) {
      continue;
    }

    const categoryId = categoryByName.get(product.category);
    if (categoryId !== undefined) {
      await knex(PRODUCTS)
        .where({ id: product.id })
        .update({ category_id: categoryId });
    }
  }

  await knex.schema.alterTable(PRODUCTS, (table) => {
    table
      .foreign('category_id')
      .references('categories.id')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');
    table.index(['category_id'], 'products_category_id_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasProducts = await knex.schema.hasTable(PRODUCTS);
  if (hasProducts) {
    await knex.schema.alterTable(PRODUCTS, (table) => {
      table.dropIndex(['category_id'], 'products_category_id_idx');
      table.dropForeign(['category_id']);
    });
  }
}
