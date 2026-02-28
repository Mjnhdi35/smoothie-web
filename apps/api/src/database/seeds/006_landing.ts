import type { Knex } from 'knex';
import { NOW, offsetDate } from '../seed-data.constants';

const PAGES = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    slug: 'home',
    title: 'Smoothie Platform Home',
    status: 'published',
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    slug: 'pricing',
    title: 'Pricing and Plans',
    status: 'published',
  },
  {
    id: '60000000-0000-4000-8000-000000000003',
    slug: 'spring-campaign',
    title: 'Spring Campaign Landing',
    status: 'draft',
  },
] as const;

export async function seed(knex: Knex): Promise<void> {
  const hasPages = await knex.schema.hasTable('landing_pages');
  if (!hasPages) {
    return;
  }

  await knex('landing_pages')
    .insert(
      PAGES.map((page, index) => ({
        id: page.id,
        slug: page.slug,
        title: page.title,
        content: `${page.title} rich text content for renderer demo.`,
        status: page.status,
        created_at: offsetDate(NOW, -index),
        updated_at: offsetDate(NOW, -index),
      })),
    )
    .onConflict('id')
    .merge(['slug', 'title', 'content', 'status', 'updated_at']);

  const hasSections = await knex.schema.hasTable('sections');
  if (!hasSections) {
    return;
  }

  const sectionRows = PAGES.flatMap((page, pageIndex) =>
    Array.from({ length: 6 }, (_, sectionIndex) => ({
      id: `61000000-0000-4000-8000-${(pageIndex + 1)
        .toString()
        .padStart(4, '0')}${(sectionIndex + 1).toString().padStart(8, '0')}`,
      page_id: page.id,
      type:
        sectionIndex === 0
          ? 'hero'
          : sectionIndex % 2 === 0
            ? 'features'
            : 'cta',
      position: sectionIndex + 1,
      content_json: {
        headline: `${page.title} Section ${sectionIndex + 1}`,
        body: `Structured section content for ${page.slug}`,
        ctaLabel: sectionIndex % 2 === 0 ? 'Get Started' : 'Learn More',
      },
      created_at: offsetDate(NOW, -pageIndex, sectionIndex),
    })),
  );

  await knex('sections')
    .insert(sectionRows)
    .onConflict('id')
    .merge(['type', 'position', 'content_json']);
}
