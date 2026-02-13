import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersService } from './users.service';
import { Article, Prisma } from '../generated/prisma/client';
import { CreateArticleDto } from '../modules/articles/dto/create-article.dto';

import { RedisService } from './redis.service';
import { ArticlesGateway } from '../gateways/articles.gateway';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventType } from '../modules/analytics/analytics.interface';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private articlesGateway: ArticlesGateway,
    private redisService: RedisService,
    private analyticsService: AnalyticsService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleScheduledPosts() {
    const now = new Date();

    // Check for articles scheduled in the past that are not published
    const dueArticles = await this.prisma.article.findMany({
      where: {
        published: false,
        scheduledAt: {
          lte: now,
          not: null,
        },
      },
      select: { id: true, title: true },
    });

    if (dueArticles.length > 0) {
      console.log(
        `[Cron] Publishing ${dueArticles.length} scheduled articles:`,
        dueArticles.map((a) => a.title),
      );

      const updateResult = await this.prisma.article.updateMany({
        where: {
          id: { in: dueArticles.map((a) => a.id) },
        },
        data: {
          published: true,
          scheduledAt: null,
        },
      });
      console.log(
        `[Cron] Successfully published ${updateResult.count} articles.`,
      );
    }
  }

  async createFromDto(dto: CreateArticleDto): Promise<Article> {
    // Find or create author
    let author = await this.usersService.findOne({ email: dto.author?.email });

    if (!author) {
      // Create new user if doesn't exist
      author = await this.usersService.create({
        email: dto.author?.email || 'anonymous@example.com',
        name: dto.author?.name || 'Anonymous',
        picture: dto.author?.picture,
      });
    }

    // Create article with authorId
    return this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        image: dto.image,
        media: dto.media as Prisma.InputJsonValue,
        category: dto.category,
        location: dto.location,
        readTime: dto.readTime,
        authorId: author.id,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        published: dto.published !== undefined ? dto.published : true,
        imageDescription: dto.imageDescription,
        imageCaption: dto.imageCaption,
        imageCredit: dto.imageCredit,
        subheadline: dto.subheadline,
        type: dto.type,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        factChecked: dto.factChecked,
      },
      include: { author: true },
    });
  }

  create(data: Prisma.ArticleCreateInput): Promise<Article> {
    return this.prisma.article.create({ data });
  }

  async findAll(limit = 20, offset = 0, hasMedia = false): Promise<Article[]> {
    const start = Date.now();
    const where: Prisma.ArticleWhereInput = {
      published: true,
    };

    if (hasMedia) {
      where.OR = [{ image: { not: null } }, { media: { not: Prisma.DbNull } }];
    }

    const articles = await this.prisma.article.findMany({
      where,
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

  async findScheduled(): Promise<Article[]> {
    return this.prisma.article.findMany({
      where: {
        published: false,
        scheduledAt: {
          not: null,
        },
      },
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
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findDrafts(authorId?: string): Promise<Article[]> {
    const where: Prisma.ArticleWhereInput = {
      published: false,
      scheduledAt: null,
    };

    if (authorId) {
      where.authorId = authorId;
    }

    return this.prisma.article.findMany({
      where,
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
  }

  findOne(id: string): Promise<Article | null> {
    return this.prisma.article.findUnique({
      where: { id },
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
    });
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

    const willLike = !article.liked;
    const wasDisliked = article.disliked;

    return this.prisma.article.update({
      where: { id },
      data: {
        liked: willLike,
        likes: willLike ? article.likes + 1 : Math.max(0, article.likes - 1),
        disliked: willLike ? false : wasDisliked,
        dislikes: (willLike && wasDisliked) ? Math.max(0, article.dislikes - 1) : article.dislikes,
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

  async toggleDislike(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new Error('Article not found');
    }

    const willDislike = !article.disliked;
    const wasLiked = article.liked;

    return this.prisma.article.update({
      where: { id },
      data: {
        disliked: willDislike,
        dislikes: willDislike ? article.dislikes + 1 : Math.max(0, article.dislikes - 1),
        liked: willDislike ? false : wasLiked,
        likes: (willDislike && wasLiked) ? Math.max(0, article.likes - 1) : article.likes,
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

    // Track view event in ClickHouse
    this.analyticsService
      .track({
        event: AnalyticsEventType.POST_VIEW,
        post_id: id,
        user_id: userId,
        metadata: {
          source: 'app',
        },
      })
      .catch((err) => console.error('Failed to track view:', err));

    return updatedArticle;
  }

  async incrementReads(id: string, userId: string): Promise<Article> {
    const readKey = `read:${id}:${userId}`;
    const hasRead = await this.redisService.incrementCounter(readKey, 3600); // 1 hour TTL

    if (hasRead > 1) {
      return this.findOne(id) as Promise<Article>;
    }

    const updatedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        reads: {
          increment: 1,
        },
      },
      include: { author: true },
    });

    return updatedArticle;
  }
}
