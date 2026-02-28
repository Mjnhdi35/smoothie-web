export interface LandingPageRow {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: string;
  created_at: Date;
}

export interface LandingPageListQuery {
  status?: string;
  limit: number;
  cursor?: string;
}

export interface LandingPageListPage {
  items: LandingPageRow[];
  nextCursor?: string;
}
