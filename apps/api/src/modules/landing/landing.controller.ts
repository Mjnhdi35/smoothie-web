import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { ListLandingPagesQueryDto } from './dto/list-landing-pages-query.dto';
import { LandingService } from './landing.service';
import type { LandingPageListPage } from './landing.types';

@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get('pages')
  list(@Query() query: ListLandingPagesQueryDto): Promise<LandingPageListPage> {
    return this.landingService.list(query);
  }

  @Post('pages')
  create(@Body() dto: CreateLandingPageDto): Promise<{ pageId: string }> {
    return this.landingService.create(dto);
  }
}
