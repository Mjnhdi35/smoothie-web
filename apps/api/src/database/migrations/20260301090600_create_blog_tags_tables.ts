import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTags = await knex.schema.hasTable('tags');
  if (!hasTags) {
    await knex.schema.createTable('tags', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 120).notNullable().unique();
    });
  }

  const hasPostTags = await knex.schema.hasTable('post_tags');
  if (!hasPostTags) {
    await knex.schema.createTable('post_tags', (table) => {
      table
        .uuid('post_id')
        .notNullable()
        .references('id')
        .inTable('blog_posts')
        .onDelete('CASCADE')
        .onUpdate('RESTRICT');
      table
        .uuid('tag_id')
        .notNullable()
        .references('id')
        .inTable('tags')
        .onDelete('RESTRICT')
        .onUpdate('RESTRICT');
      table.primary(['post_id', 'tag_id']);
      table.index(['tag_id'], 'post_tags_tag_id_idx');
    });
  }

  const hasPosts = await knex.schema.hasTable('blog_posts');
  if (hasPosts) {
    await knex.schema.alterTable('blog_posts', (table) => {
      table.index(['author_id'], 'blog_posts_author_id_idx');
      table.index(['status', 'created_at'], 'blog_posts_status_created_v2_idx');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasPosts = await knex.schema.hasTable('blog_posts');
  if (hasPosts) {
    await knex.schema.alterTable('blog_posts', (table) => {
      table.dropIndex(['author_id'], 'blog_posts_author_id_idx');
      table.dropIndex(
        ['status', 'created_at'],
        'blog_posts_status_created_v2_idx',
      );
    });
  }

  await knex.schema.dropTableIfExists('post_tags');
  await knex.schema.dropTableIfExists('tags');
}
