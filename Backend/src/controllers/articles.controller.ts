import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ArticlesService } from '../services/articles.service';
import { CreateArticleDto } from '../modules/articles/dto/create-article.dto';
import { Prisma } from '../generated/prisma/client';

@Controller('api/articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  async create(@Body() dto: CreateArticleDto) {
    return this.articlesService.createFromDto(dto);
  }

  @Get()
  findAll(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.articlesService.findAll(limitNum, offsetNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Prisma.ArticleUpdateInput) {
    return this.articlesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }

  @Post(':id/like')
  async toggleLike(@Param('id') id: string) {
    return await this.articlesService.toggleLike(id);
  }

  @Post(':id/bookmark')
  async toggleBookmark(@Param('id') id: string) {
    return await this.articlesService.toggleBookmark(id);
  }
}
