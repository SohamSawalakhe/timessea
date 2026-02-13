import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
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

  @Get('scheduled')
  async getScheduled() {
    return this.articlesService.findScheduled();
  }

  @Get('drafts')
  @UseGuards(AuthGuard('jwt'))
  async getDrafts(@Req() req: Request & { user: { id: string } }) {
    return this.articlesService.findDrafts(req.user.id);
  }

  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('hasMedia') hasMedia?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const hasMediaBool = hasMedia === 'true';
    return this.articlesService.findAll(limitNum, offsetNum, hasMediaBool);
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

  @Post(':id/dislike')
  async toggleDislike(@Param('id') id: string) {
    return await this.articlesService.toggleDislike(id);
  }


  @Post(':id/view')
  async incrementViews(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id: string } },
  ) {
    const viewerId = req.user?.id || req.ip || 'anonymous';
    return await this.articlesService.incrementViews(id, viewerId);
  }

  @Post(':id/read')
  async incrementReads(@Param('id') id: string, @Req() req: Request) {
    const readerId = (req as any).user?.id || req.ip || 'anonymous';
    return await this.articlesService.incrementReads(id, readerId);
  }
}
