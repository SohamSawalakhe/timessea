import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersService } from './users.service';
import { Article, Prisma } from '../generated/prisma/client';
import { CreateArticleDto } from '../modules/articles/dto/create-article.dto';

import { RedisService } from './redis.service';
import { ArticlesGateway } from '../gateways/articles.gateway';

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private articlesGateway: ArticlesGateway,
    private redisService: RedisService,
  ) {}

  async createFromDto(dto: CreateArticleDto): Promise<Article> {
    // Find or create author
    let author = await this.usersService.findOne({ email: dto.author?.email });

    if (!author) {
      // Create new user if doesn't exist
      author = await this.usersService.create({
        email: dto.author?.email || 'anonymous@example.com',
        name: dto.author?.name || 'Anonymous',
        picture: dto.author?.avatar,
      });
    }

    // Create article with authorId
    return this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        authorId: author.id,
      },
      include: { author: true },
    });
  }

  create(data: Prisma.ArticleCreateInput): Promise<Article> {
    return this.prisma.article.create({ data });
  }

  async findAll(limit = 20, offset = 0): Promise<Article[]> {
    const start = Date.now();
    const articles = await this.prisma.article.findMany({
      take: limit,
      skip: offset,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`findAll took ${Date.now() - start}ms for ${limit} items`);
    return articles;
  }

  findOne(id: string): Promise<Article | null> {
    return this.prisma.article.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.ArticleUpdateInput): Promise<Article> {
    return this.prisma.article.update({ where: { id }, data });
  }

  remove(id: string): Promise<Article> {
    return this.prisma.article.delete({ where: { id } });
  }

  async toggleLike(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new Error('Article not found');
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        liked: !article.liked,
        likes: article.liked ? article.likes - 1 : article.likes + 1,
      },
      include: { author: true },
    });
  }

  async toggleBookmark(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new Error('Article not found');
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        bookmarked: !article.bookmarked,
      },
      include: { author: true },
    });
  }

  async incrementViews(id: string, userId: string): Promise<Article> {
    const viewKey = `viewed:${id}:${userId}`;
    const hasViewed = await this.redisService.incrementCounter(viewKey, 3600); // 1 hour TTL

    // If counter > 1, user has already viewed recently
    if (hasViewed > 1) {
      return this.findOne(id) as Promise<Article>;
    }

    const updatedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        views: {
          increment: 1,
        },
      },
      include: { author: true },
    });

    this.articlesGateway.notifyArticleViewed(
      updatedArticle.id,
      updatedArticle.views,
    );

    return updatedArticle;
  }
}
