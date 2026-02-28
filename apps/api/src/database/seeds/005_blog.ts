import type { Knex } from 'knex';
import { NOW, USER_IDS, offsetDate } from '../seed-data.constants';

const TAG_IDS = {
  engineering: '50000000-0000-4000-8000-000000000001',
  business: '50000000-0000-4000-8000-000000000002',
  travel: '50000000-0000-4000-8000-000000000003',
  design: '50000000-0000-4000-8000-000000000004',
  operations: '50000000-0000-4000-8000-000000000005',
} as const;

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function seed(knex: Knex): Promise<void> {
  const hasPosts = await knex.schema.hasTable('blog_posts');
  if (!hasPosts) {
    return;
  }

  const hasTags = await knex.schema.hasTable('tags');
  const hasPostTags = await knex.schema.hasTable('post_tags');
  const hasAuthorId = await knex.schema.hasColumn('blog_posts', 'author_id');
  const hasSlug = await knex.schema.hasColumn('blog_posts', 'slug');

  if (hasTags) {
    await knex('tags')
      .insert([
        { id: TAG_IDS.engineering, name: 'engineering' },
        { id: TAG_IDS.business, name: 'business' },
        { id: TAG_IDS.travel, name: 'travel' },
        { id: TAG_IDS.design, name: 'design' },
        { id: TAG_IDS.operations, name: 'operations' },
      ])
      .onConflict('id')
      .merge(['name']);
  }

  const titles = [
    'How We Built Cursor Pagination for Products',
    'Reducing Booking Conflicts with Deterministic Locks',
    'Shipping a Clean RBAC Model for Admin Teams',
    'Designing Landing Pages for Better Conversion',
    'Scaling Chat History Reads with Index First Strategy',
    'Draft: Pricing Experiments for Summer Campaign',
    'Draft: Editorial Calendar for Product Launch',
    'Draft: SEO Checklist for Blog Authors',
    'Draft: Customer Retention Playbook',
    'Draft: Support SLA and Incident Workflow',
  ];

  const posts = titles.map((title, index) => {
    const id = `51000000-0000-4000-8000-${(index + 1)
      .toString()
      .padStart(12, '0')}`;

    const row: Record<string, unknown> = {
      id,
      title,
      content: `${title} - production demo content with realistic business context.`,
      status: index < 5 ? 'published' : 'draft',
      tag: index % 2 === 0 ? 'engineering' : 'operations',
      created_at: offsetDate(NOW, -(10 - index)),
      updated_at: offsetDate(NOW, -(10 - index)),
    };

    if (hasAuthorId) {
      row.author_id = index % 2 === 0 ? USER_IDS.staffA : USER_IDS.staffB;
    }

    if (hasSlug) {
      row.slug = `${slugify(title)}-${index + 1}`;
    }

    return row;
  });

  await knex('blog_posts')
    .insert(posts)
    .onConflict('id')
    .merge(['title', 'content', 'status', 'tag', 'updated_at']);

  if (hasTags && hasPostTags) {
    const postTags = posts.flatMap((post, index) => {
      const primaryTag =
        index % 2 === 0 ? TAG_IDS.engineering : TAG_IDS.operations;
      const secondaryTag =
        index < 5
          ? TAG_IDS.business
          : index % 3 === 0
            ? TAG_IDS.design
            : TAG_IDS.travel;

      return [
        { post_id: post.id, tag_id: primaryTag },
        { post_id: post.id, tag_id: secondaryTag },
      ];
    });

    await knex('post_tags')
      .insert(postTags)
      .onConflict(['post_id', 'tag_id'])
      .ignore();
  }
}
