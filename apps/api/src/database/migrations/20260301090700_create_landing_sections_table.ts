import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasSections = await knex.schema.hasTable('sections');
  if (hasSections) {
    return;
  }

  await knex.schema.createTable('sections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('page_id')
      .notNullable()
      .references('id')
      .inTable('landing_pages')
      .onDelete('CASCADE')
      .onUpdate('RESTRICT');
    table.string('type', 80).notNullable();
    table.integer('position').notNullable();
    table.jsonb('content_json').notNullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.unique(['page_id', 'position'], {
      indexName: 'sections_page_position_unique_idx',
    });
    table.index(['page_id'], 'sections_page_id_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sections');
}
