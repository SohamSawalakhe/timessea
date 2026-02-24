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

import { AnalyticsQueryService } from '../services/analytics-query.service';

interface ArticleWithRelations extends Article {
  author: {
    id: string;
    name: string | null;
    email: string;
    picture: string | null;
  };
  likedBy?: { id: string }[];
  bookmarkedBy?: { id: string }[];
}

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private articlesGateway: ArticlesGateway,
    private redisService: RedisService,
    private analyticsService: AnalyticsService,
    private analyticsQueryService: AnalyticsQueryService,
  ) {}

  private ensureValidUUID(id: string): string {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) ? id : '00000000-0000-0000-0000-000000000000';
  }

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

  async findAll(
    limit = 20,
    offset = 0,
    hasMedia = false,
    userId?: string,
    authorId?: string,
  ): Promise<any[]> {
    const where: Prisma.ArticleWhereInput = {
      published: true,
      deletedAt: null,
    };

    if (authorId) {
      where.authorId = authorId;
    }

    if (hasMedia) {
      where.OR = [
        { AND: [{ image: { not: null } }, { image: { not: '' } }] },
        { media: { not: Prisma.DbNull } }
      ];
    }

    console.log(`ArticlesService: findAll called with userId: ${userId}`);
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
        likedBy: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : undefined,
        bookmarkedBy: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    const typedArticles = articles as unknown as ArticleWithRelations[];

    return typedArticles.map((article) => {
      const { likedBy, bookmarkedBy, ...rest } = article;
      return {
        ...rest,
        liked: !!(likedBy && likedBy.length > 0),
        bookmarked: !!(bookmarkedBy && bookmarkedBy.length > 0),
      };
    });
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

  async findPublished(authorId?: string): Promise<Article[]> {
    const where: Prisma.ArticleWhereInput = {
      published: true,
      deletedAt: null,
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

  async findOne(
    id: string,
    userId?: string,
  ): Promise<(Article & { liked: boolean; bookmarked: boolean }) | null> {
    const article = await this.prisma.article.findUnique({
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
        likedBy: userId
          ? {
              where: { userId },
              select: { userId: true },
            }
          : false,
        bookmarkedBy: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
    });

    if (!article) return null;

    const typedArticle = article as unknown as ArticleWithRelations;
    return {
      ...article,
      liked: userId ? (typedArticle.likedBy?.length ?? 0) > 0 : false,
      bookmarked: userId ? (typedArticle.bookmarkedBy?.length ?? 0) > 0 : false,
    };
  }

  async findRelated(
    id: string,
    limit = 4,
    offset = 0,
    userId?: string,
  ): Promise<Article[]> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { location: true, category: true },
    });

    if (!article) return [];

    const loc = article.location?.trim() || null;
    const cat = article.category;
    const results: ArticleWithRelations[] = [];
    const collectedIds = new Set<string>([id]); // Always exclude the current article

    const authorInclude = {
      author: { select: { id: true, name: true, email: true, picture: true } },
      likedBy: userId
        ? {
            where: { userId },
            select: { id: true },
          }
        : undefined,
      bookmarkedBy: userId
        ? {
            where: { userId },
            select: { id: true },
          }
        : undefined,
    };

    // Helper: case-insensitive location match
    const locEquals = loc
      ? { equals: loc, mode: 'insensitive' as const }
      : undefined;
    const locNotEquals = loc
      ? { not: loc, mode: 'insensitive' as const }
      : undefined;

    console.log(
      `[findRelated] Article ${id} | loc="${loc}" | cat="${cat}" | limit=${limit} | offset=${offset} | userId=${userId}`,
    );

    // --- Tier 1: Same Location + Same Category (Highest Priority) ---
    let count1 = 0;
    if (loc) {
      count1 = await this.prisma.article.count({
        where: {
          location: locEquals,
          category: cat,
          id: { not: id },
          published: true,
        },
      });

      if (offset < count1) {
        const take = Math.min(limit, count1 - offset);
        const res = (await this.prisma.article.findMany({
          where: {
            location: locEquals,
            category: cat,
            id: { not: id },
            published: true,
          },
          include: authorInclude,
          take,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        })) as ArticleWithRelations[];
        for (const a of res) {
          collectedIds.add(a.id);
        }
        results.push(...res);
      }
      console.log(
        `[findRelated] Tier 1 (loc+cat): count=${count1}, collected=${results.length}`,
      );
    }

    if (results.length >= limit) return this.mapToWithLiked(results);

    // --- Tier 2: Same Location, Different Category ---
    let count2 = 0;
    if (loc) {
      count2 = await this.prisma.article.count({
        where: {
          location: locEquals,
          category: { not: cat },
          id: { notIn: [...collectedIds] },
          published: true,
        },
      });

      const effectiveOffset2 = Math.max(0, offset - count1);
      if (effectiveOffset2 < count2) {
        const take = Math.min(
          limit - results.length,
          count2 - effectiveOffset2,
        );
        const res = (await this.prisma.article.findMany({
          where: {
            location: locEquals,
            category: { not: cat },
            id: { notIn: [...collectedIds] },
            published: true,
          },
          include: authorInclude,
          take,
          skip: effectiveOffset2,
          orderBy: { createdAt: 'desc' },
        })) as ArticleWithRelations[];
        for (const a of res) {
          collectedIds.add(a.id);
        }
        results.push(...res);
      }
      console.log(
        `[findRelated] Tier 2 (loc only): count=${count2}, collected=${results.length}`,
      );
    }

    if (results.length >= limit) return this.mapToWithLiked(results);

    // --- Tier 3: Same Category, Different Location ---
    let count3 = 0;
    const where3: Prisma.ArticleWhereInput = {
      category: cat,
      id: { notIn: [...collectedIds] },
      published: true,
    };
    if (loc) {
      where3.location = locNotEquals as Prisma.StringFilter;
    }

    count3 = await this.prisma.article.count({ where: where3 });

    const totalPrev = count1 + count2;
    const effectiveOffset3 = Math.max(0, offset - totalPrev);

    if (effectiveOffset3 < count3) {
      const take = Math.min(limit - results.length, count3 - effectiveOffset3);
      const res = (await this.prisma.article.findMany({
        where: where3,
        include: authorInclude,
        take,
        skip: effectiveOffset3,
        orderBy: { createdAt: 'desc' },
      })) as ArticleWithRelations[];
      for (const a of res) {
        collectedIds.add(a.id);
      }
      results.push(...res);
    }
    console.log(
      `[findRelated] Tier 3 (cat only): count=${count3}, collected=${results.length}`,
    );

    if (results.length >= limit) return this.mapToWithLiked(results);

    // --- Tier 4: Fallback (Different location AND different category) ---
    const where4: Prisma.ArticleWhereInput = {
      id: { notIn: [...collectedIds] },
      published: true,
      category: { not: cat },
    };
    if (loc) {
      where4.location = locNotEquals as Prisma.StringFilter;
    }

    const totalPrev4 = count1 + count2 + count3;
    const effectiveOffset4 = Math.max(0, offset - totalPrev4);
    const take4 = limit - results.length;

    const res4 = (await this.prisma.article.findMany({
      where: where4,
      include: authorInclude,
      take: take4,
      skip: effectiveOffset4,
      orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
    })) as ArticleWithRelations[];
    results.push(...res4);
    console.log(`[findRelated] Tier 4 (fallback): collected=${results.length}`);

    return this.mapToWithLiked(results);
  }

  private mapToWithLiked(
    articles: ArticleWithRelations[],
  ): (Article & { liked: boolean; bookmarked: boolean })[] {
    return articles.map((article) => {
      const { likedBy, bookmarkedBy, ...rest } = article;
      return {
        ...rest,
        liked: !!(likedBy && likedBy.length > 0),
        bookmarked: !!(bookmarkedBy && bookmarkedBy.length > 0),
      };
    }) as (Article & { liked: boolean; bookmarked: boolean })[];
  }

  async findTrending(
    limit = 4,
    offset = 0,
    excludeId?: string,
    userId?: string,
  ): Promise<Article[]> {
    const authorInclude = {
      author: { select: { id: true, name: true, email: true, picture: true } },
      likedBy: userId
        ? {
            where: { userId },
            select: { id: true },
          }
        : undefined,
      bookmarkedBy: userId
        ? {
            where: { userId },
            select: { id: true },
          }
        : undefined,
    };

    try {
      // 1. Try fetching from ClickHouse
      const fetchLimit = limit + offset + (excludeId ? 1 : 0);
      const trendingData =
        await this.analyticsQueryService.getTrendingPosts(fetchLimit);

      if (trendingData && trendingData.length > 0) {
        let trendingIds = trendingData.map((t) => t.post_id);

        if (excludeId) {
          trendingIds = trendingIds.filter((id) => id !== excludeId);
        }

        const articles = await this.prisma.article.findMany({
          where: {
            id: { in: trendingIds },
            published: true,
          },
          include: authorInclude,
        });

        const orderedArticles = trendingIds
          .map((id) =>
            (articles as ArticleWithRelations[]).find((a) => a.id === id),
          )
          .filter((a): a is ArticleWithRelations => !!a);

        if (orderedArticles.length > offset) {
          return this.mapToWithLiked(
            orderedArticles.slice(offset, offset + limit),
          );
        }

        if (orderedArticles.length === 0 && offset === 0) {
          throw new Error('No trending data');
        }
        return this.mapToWithLiked(
          orderedArticles.slice(offset, offset + limit),
        );
      }
    } catch (err) {
      console.warn(
        'ClickHouse trending fetch failed or empty, falling back to Prisma',
        err,
      );
    }

    // Fallback: Prisma Order By
    const fallbackArticles = await this.prisma.article.findMany({
      where: {
        published: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      include: authorInclude,
      orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });

    return this.mapToWithLiked(fallbackArticles);
  }

  update(id: string, data: Prisma.ArticleUpdateInput): Promise<Article> {
    return this.prisma.article.update({ where: { id }, data });
  }

  async remove(id: string, userId: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    if (article.authorId !== userId) {
      throw new Error('You are not authorized to delete this article');
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        published: false, // Also unpublish it from public feed
      },
    });
  }

  async toggleLike(id: string, userId: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new Error('Article not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const existingLike = await (this.prisma as any).articleLike.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId: id,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.$transaction([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (this.prisma as any).articleLike.delete({
          where: {
            userId_articleId: {
              userId,
              articleId: id,
            },
          },
        }),
        this.prisma.article.update({
          where: { id },
          data: {
            likes: { decrement: 1 },
          },
        }),
      ]);

      // Track unlike event
      this.analyticsService.track({
        event: AnalyticsEventType.UNLIKE,
        post_id: id,
        user_id: this.ensureValidUUID(userId),
        created_at: new Date(),
      });
    } else {
      // Like
      await this.prisma.$transaction([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (this.prisma as any).articleLike.create({
          data: {
            userId,
            articleId: id,
          },
        }),
        this.prisma.article.update({
          where: { id },
          data: {
            likes: { increment: 1 },
          },
        }),
      ]);

      // Track like event
      this.analyticsService.track({
        event: AnalyticsEventType.LIKE,
        post_id: id,
        user_id: this.ensureValidUUID(userId),
        created_at: new Date(),
      });

      // Create notification for article author (if not self)
      if (article.authorId !== userId) {
        const actor = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, picture: true },
        });
        await this.createNotification({
          userId: article.authorId,
          type: 'like',
          title: 'New Like',
          message: `${actor?.name || 'Someone'} liked your article "${article.title}"`,
          articleId: id,
          actorId: userId,
          actorName: actor?.name || null,
          actorPicture: actor?.picture || null,
        });
      }
    }

    const updatedArticle = await this.prisma.article.findUnique({
      where: { id },
      include: { author: true },
    }) as unknown as Article;

    this.articlesGateway.notifyArticleLiked(id, updatedArticle.likes);

    return updatedArticle;
  }

  async toggleBookmark(id: string, userId: string): Promise<{ bookmarked: boolean }> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new Error('Article not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const existingBookmark = await (this.prisma as any).bookmark.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId: id,
        },
      },
    });

    if (existingBookmark) {
      // Remove bookmark
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await (this.prisma as any).bookmark.delete({
        where: {
          userId_articleId: {
            userId,
            articleId: id,
          },
        },
      });
      return { bookmarked: false };
    } else {
      // Add bookmark
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await (this.prisma as any).bookmark.create({
        data: {
          userId,
          articleId: id,
        },
      });

      // Create notification for article author (if not self)
      if (article.authorId !== userId) {
        const actor = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, picture: true },
        });
        await this.createNotification({
          userId: article.authorId,
          type: 'bookmark',
          title: 'Article Saved',
          message: `${actor?.name || 'Someone'} saved your article "${article.title}"`,
          articleId: id,
          actorId: userId,
          actorName: actor?.name || null,
          actorPicture: actor?.picture || null,
        });
      }

      return { bookmarked: true };
    }
  }

  async findUserBookmarks(userId: string): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const bookmarks = await (this.prisma as any).bookmark.findMany({
      where: { userId },
      include: {
        article: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return bookmarks.map((b: any) => ({
      ...b.article,
      bookmarked: true,
      liked: false, // Could be enhanced to check if user liked
    }));
  }

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    articleId?: string;
    actorId?: string;
    actorName?: string | null;
    actorPicture?: string | null;
  }) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await (this.prisma as any).notification.create({ data });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
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
        user_id: this.ensureValidUUID(userId),
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

    // Track read event in ClickHouse
    this.analyticsService
      .track({
        event: AnalyticsEventType.POST_READ,
        post_id: id,
        user_id: this.ensureValidUUID(userId),
        metadata: {
          source: 'app',
        },
      })
      .catch((err) => console.error('Failed to track read:', err));

    return updatedArticle;
  }

  async backfillCommentCounts() {
    console.log('Starting comment count backfill...');
    const articles = await this.prisma.article.findMany({
      select: { id: true },
    });
    let updated = 0;

    for (const article of articles) {
      const count = await this.prisma.comment.count({
        where: { articleId: article.id, deletedAt: null },
      });

      await this.prisma.article.update({
        where: { id: article.id },
        data: { commentCount: count },
      });
      updated++;
    }
    console.log(`Backfilled comment counts for ${updated} articles.`);
    return { count: updated };
  }
}
