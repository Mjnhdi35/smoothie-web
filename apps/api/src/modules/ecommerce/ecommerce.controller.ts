import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { EcommerceService } from './ecommerce.service';
import type { ProductListPage } from './ecommerce.types';

@Controller('ecommerce')
export class EcommerceController {
  constructor(private readonly ecommerceService: EcommerceService) {}

  @Get('products')
  listProducts(@Query() query: ListProductsQueryDto): Promise<ProductListPage> {
    return this.ecommerceService.listProducts(query);
  }

  @Post('orders')
  createOrder(@Body() dto: CreateOrderDto): Promise<{ orderId: string }> {
    return this.ecommerceService.createOrder(dto);
  }
}
