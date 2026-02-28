import type { BlogPostListPage, BlogPostListQuery } from './blog.types';

export interface BlogRepositoryPort {
  list(query: BlogPostListQuery): Promise<BlogPostListPage>;
  create(input: {
    title: string;
    content: string;
    status: string;
    tag: string;
  }): Promise<{ postId: string }>;
}
