import { Module } from '@nestjs/common';
import { EcommerceController } from './ecommerce.controller';
import { EcommerceRepository } from './ecommerce.repository';
import { EcommerceService } from './ecommerce.service';

@Module({
  controllers: [EcommerceController],
  providers: [EcommerceRepository, EcommerceService],
})
export class EcommerceModule {}
