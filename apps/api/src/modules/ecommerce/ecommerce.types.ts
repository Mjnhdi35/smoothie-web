export interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: string;
  created_at: Date;
}

export interface ProductListQuery {
  priceMin?: number;
  priceMax?: number;
  category?: string;
  limit: number;
  cursor?: string;
}

export interface ProductListPage {
  items: ProductRow[];
  nextCursor?: string;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  userId: string;
  idempotencyKey: string;
  items: CreateOrderItemInput[];
}
