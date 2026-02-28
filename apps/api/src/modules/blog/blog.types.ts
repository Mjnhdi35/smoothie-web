export interface BlogPostRow {
  id: string;
  title: string;
  content: string;
  status: string;
  tag: string;
  created_at: Date;
}

export interface BlogPostListQuery {
  status?: string;
  tag?: string;
  createdFrom?: Date;
  createdTo?: Date;
  limit: number;
  cursor?: string;
}

export interface BlogPostListPage {
  items: BlogPostRow[];
  nextCursor?: string;
}
