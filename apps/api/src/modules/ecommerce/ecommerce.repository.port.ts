import type {
  CreateOrderInput,
  ProductListPage,
  ProductListQuery,
} from './ecommerce.types';

export interface EcommerceRepositoryPort {
  listProducts(query: ProductListQuery): Promise<ProductListPage>;
  createOrder(input: CreateOrderInput): Promise<{ orderId: string }>;
}
