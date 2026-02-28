import type {
  LandingPageListPage,
  LandingPageListQuery,
} from './landing.types';

export interface LandingRepositoryPort {
  list(query: LandingPageListQuery): Promise<LandingPageListPage>;
  create(input: {
    slug: string;
    title: string;
    content: string;
    status: string;
  }): Promise<{ pageId: string }>;
}
