import { Module } from '@nestjs/common';
import { BLOG_REPOSITORY } from './blog.constants';
import { BlogController } from './blog.controller';
import { BlogRepository } from './blog.repository';
import { BlogService } from './blog.service';

@Module({
  controllers: [BlogController],
  providers: [
    BlogRepository,
    {
      provide: BLOG_REPOSITORY,
      useExisting: BlogRepository,
    },
    BlogService,
  ],
})
export class BlogModule {}
