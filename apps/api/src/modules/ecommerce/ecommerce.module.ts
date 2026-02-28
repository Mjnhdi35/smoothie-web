import { Module } from '@nestjs/common';
import { EcommerceController } from './ecommerce.controller';
import { ECOMMERCE_REPOSITORY } from './ecommerce.constants';
import { EcommerceRepository } from './ecommerce.repository';
import { EcommerceService } from './ecommerce.service';

@Module({
  controllers: [EcommerceController],
  providers: [
    EcommerceRepository,
    {
      provide: ECOMMERCE_REPOSITORY,
      useExisting: EcommerceRepository,
    },
    EcommerceService,
  ],
})
export class EcommerceModule {}
