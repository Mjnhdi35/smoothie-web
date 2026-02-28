import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import type { BlogPostListPage } from './blog.types';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('posts')
  list(@Query() query: ListPostsQueryDto): Promise<BlogPostListPage> {
    return this.blogService.list(query);
  }

  @Post('posts')
  create(@Body() dto: CreatePostDto): Promise<{ postId: string }> {
    return this.blogService.create(dto);
  }
}
