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
    location?: string,
    feed?: string,
    query?: string,
  ): Promise<any[]> {
    const baseWhere: Prisma.ArticleWhereInput = {
      published: true,
      deletedAt: null,
    };

    if (authorId) {
      baseWhere.authorId = authorId;
    }

    // "Following" feed: only articles from authors the user follows
    if (feed === 'following' && userId) {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followedAuthorIds = follows.map((f) => f.followingId);
      if (followedAuthorIds.length === 0) {
        return [];
      }
      baseWhere.authorId = { in: followedAuthorIds };
    }

    const includeClause = {
      author: {
        select: { id: true, name: true, email: true, picture: true },
      },
      likedBy: userId ? { where: { userId }, select: { id: true } } : undefined,
      bookmarkedBy: userId
        ? { where: { userId }, select: { id: true } }
        : undefined,
    };

    // "For You" feed: personalized based on user engagement (likes, comments, bookmarks, views, reads)
    // Cached seamlessly in Redis to prevent spamming ClickHouse and Postgres
    if (feed === 'for-you' && userId) {
      const cacheKey = `user_foryou_prefs:${userId}`;
      let categoryScoresRecord: Record<string, number> = {};
      let interactedIdsMap: Record<string, boolean> = {};

      try {
        const cachedPrefs = await this.redisService.getClient().get(cacheKey);
        if (cachedPrefs) {
          const parsed = JSON.parse(cachedPrefs) as unknown as {
            categoryScoresRecord?: Record<string, number>;
            interactedIds?: Record<string, boolean>;
          };
          categoryScoresRecord = parsed.categoryScoresRecord || {};
          interactedIdsMap = parsed.interactedIds || {};
        }
      } catch (err) {
        console.warn('Redis for-you cache error:', err);
      }

      // If no valid cache, compute preferences
      if (Object.keys(categoryScoresRecord).length === 0) {
        // 1. Prisma: Explicit engagements (weight: 3)
        const [likedArticles, commentedArticles, bookmarkedArticles] =
          await Promise.all([
            this.prisma.articleLike.findMany({
              where: { userId },
              include: { article: { select: { category: true } } },
              orderBy: { createdAt: 'desc' },
              take: 50,
            }),
            this.prisma.comment.findMany({
              where: { authorId: userId, deletedAt: null },
              include: { article: { select: { category: true } } },
              orderBy: { createdAt: 'desc' },
              take: 50,
            }),
            this.prisma.bookmark.findMany({
              where: { userId },
              include: { article: { select: { category: true } } },
              orderBy: { createdAt: 'desc' },
              take: 50,
            }),
          ]);

        // 2. ClickHouse: Implicit engagements (Views weight: 1, Reads weight: 2)
        const [viewHistory, readHistory] = await Promise.all([
          this.analyticsQueryService.getUserViewHistory(
            userId,
            50,
          ) as Promise<{ category?: string; id: string }[]>,
          this.analyticsQueryService.getUserReadHistory(
            userId,
            30,
          ) as Promise<{ category?: string; id: string }[]>,
        ]);

        const addScore = (cat: string | undefined | null, weight: number) => {
          if (cat) {
            categoryScoresRecord[cat] =
              (categoryScoresRecord[cat] || 0) + weight;
          }
        };

        for (const like of likedArticles) {
          addScore(like.article?.category, 3);
          interactedIdsMap[like.articleId] = true;
        }
        for (const comment of commentedArticles) {
          addScore(comment.article?.category, 3);
          interactedIdsMap[comment.articleId] = true;
        }
        for (const bookmark of bookmarkedArticles) {
          addScore(bookmark.article?.category, 3);
          interactedIdsMap[bookmark.articleId] = true;
        }
        for (const view of viewHistory) {
          if (view) {
            addScore(view.category, 1);
            interactedIdsMap[view.id] = true;
          }
        }
        for (const read of readHistory) {
          if (read) {
            addScore(read.category, 2);
            interactedIdsMap[read.id] = true;
          }
        }

        // Cache for 15 minutes (900s)
        try {
          await this.redisService.getClient().set(
            cacheKey,
            JSON.stringify({
              categoryScoresRecord,
              interactedIds: interactedIdsMap,
            }),
            'EX',
            900,
          );
        } catch (err) {
          console.warn('Failed to cache for-you prefs:', err);
        }
      }

      // 6. Fetch a broader pool of candidates
      const candidates = await this.prisma.article.findMany({
        where: { published: true, deletedAt: null },
        take: 100, // Look at the 100 most recent/popular candidates
        include: includeClause,
        orderBy: [{ views: 'desc' }, { createdAt: 'desc' }], // General popularity baseline
      });

      const typedCandidates = candidates as unknown as ArticleWithRelations[];

      // 7. Score and sort candidates precisely based on user behavior
      const scoredArticles = typedCandidates.map((article) => {
        let score = 0;

        // Base Popularity
        score += (article.views || 0) * 0.1;
        score += (article.likes || 0) * 2;
        score += (article.reads || 0) * 0.5;

        // Algorithmic Recency Decay (penalty based on hours old)
        const hoursOld =
          (Date.now() - new Date(article.createdAt).getTime()) /
          (1000 * 60 * 60);
        score -= hoursOld * 0.1;

        // Core Criterion: Category Preference matching
        if (article.category && categoryScoresRecord[article.category]) {
          score += categoryScoresRecord[article.category] * 20; // Massive boost for preferred categories
        }

        return { article, score };
      });

      // Sort by final algorithmic score descending
      scoredArticles.sort((a, b) => b.score - a.score);

      // Slicing for pagination
      const finalArticles = scoredArticles
        .slice(offset, offset + limit)
        .map((scored) => scored.article);

      return finalArticles.map((article) => {
        const { likedBy, bookmarkedBy, ...rest } = article;
        return {
          ...rest,
          liked: !!(likedBy && likedBy.length > 0),
          bookmarked: !!(bookmarkedBy && bookmarkedBy.length > 0),
        };
      });
    }

    const andConditions: Prisma.ArticleWhereInput[] = [];

    if (query && query.trim()) {
      const searchQuery = query.trim();
      andConditions.push({
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { content: { contains: searchQuery, mode: 'insensitive' } },
          { excerpt: { contains: searchQuery, mode: 'insensitive' } },
          { author: { name: { contains: searchQuery, mode: 'insensitive' } } },
        ],
      });
    }

    if (hasMedia) {
      andConditions.push({
        OR: [
          { AND: [{ image: { not: null } }, { image: { not: '' } }] },
          { media: { not: Prisma.DbNull } },
        ],
      });
    }

    if (andConditions.length > 0) {
      baseWhere.AND = andConditions;
    }

    console.log(
      `ArticlesService: findAll called with userId: ${userId}, location: ${location}, feed: ${feed}`,
    );

    // ---- Hierarchical location filtering ----
    // Location comes as comma-separated tiers: "Naigaon,Vasai,Maharashtra,India"
    // We fetch per-tier (most local first) and deduplicate, so local news appears first.
    if (location && location.trim()) {
      const locationTerms = location
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (locationTerms.length > 0) {
        const collectedIds = new Set<string>();
        const allArticles: ArticleWithRelations[] = [];
        let skipped = 0;

        for (const term of locationTerms) {
          if (allArticles.length >= limit) break;

          const tierWhere: Prisma.ArticleWhereInput = {
            ...baseWhere,
            location: { contains: term, mode: 'insensitive' },
          };

          // Exclude already-collected articles
          if (collectedIds.size > 0) {
            tierWhere.id = { notIn: [...collectedIds] };
          }

          // Count total for this tier to handle offset properly
          const tierCount = await this.prisma.article.count({
            where: tierWhere,
          });

          // Calculate how many to skip in this tier
          const tierSkip = Math.max(0, offset - skipped);
          skipped += tierCount;

          if (tierSkip >= tierCount) continue; // This tier is fully before the offset

          const remaining = limit - allArticles.length;
          const tierArticles = (await this.prisma.article.findMany({
            where: tierWhere,
            take: remaining,
            skip: tierSkip,
            include: includeClause,
            orderBy: { createdAt: 'desc' },
          })) as unknown as ArticleWithRelations[];

          for (const a of tierArticles) {
            collectedIds.add(a.id);
            allArticles.push(a);
          }
        }

        return allArticles.map((article) => {
          const { likedBy, bookmarkedBy, ...rest } = article;
          return {
            ...rest,
            liked: !!(likedBy && likedBy.length > 0),
            bookmarked: !!(bookmarkedBy && bookmarkedBy.length > 0),
          };
        });
      }
    }

    // Default: no location filter (Cacheable global feed)
    const isCacheable = !query && !authorId && !hasMedia && !feed;
    const cacheKey = `feed_global:${limit}:${offset}`;

    let rawArticles: ArticleWithRelations[] = [];
    let cacheHit = false;

    if (isCacheable) {
      try {
        const cachedStr = await this.redisService.getClient().get(cacheKey);
        if (cachedStr) {
          rawArticles = JSON.parse(cachedStr) as unknown as ArticleWithRelations[];
          cacheHit = true;
        }
      } catch (err) {
        console.warn('Global feed cache read failed:', err);
      }
    }

    if (!cacheHit) {
      // Fetch globally without user-specific include clauses so it can be cached for everyone
      rawArticles = await this.prisma.article.findMany({
        where: baseWhere,
        take: limit,
        skip: offset,
        include: {
          author: {
            select: { id: true, name: true, email: true, picture: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (isCacheable) {
        try {
          // Cache the global feed for 30 seconds
          await this.redisService
            .getClient()
            .set(cacheKey, JSON.stringify(rawArticles), 'EX', 30);
        } catch (err) {
          console.warn('Global feed cache write failed:', err);
        }
      }
    }

    // Now, efficiently map user-specific interactions if a user is logged in
    if (userId && rawArticles.length > 0) {
      const articleIds = rawArticles.map((a) => a.id);
      const [userLikes, userBookmarks] = await Promise.all([
        this.prisma.articleLike.findMany({
          where: { userId, articleId: { in: articleIds } },
          select: { articleId: true },
        }),
        this.prisma.bookmark.findMany({
          where: { userId, articleId: { in: articleIds } },
          select: { articleId: true },
        }),
      ]);

      const likedSet = new Set(userLikes.map((l) => l.articleId));
      const bookmarkedSet = new Set(userBookmarks.map((b) => b.articleId));

      return rawArticles.map((article) => ({
        ...article,
        liked: likedSet.has(article.id),
        bookmarked: bookmarkedSet.has(article.id),
      }));
    }

    return rawArticles.map((article) => ({
      ...article,
      liked: false,
      bookmarked: false,
    }));
  }

  async findScheduled(): Promise<Article[]> {
    return this.prisma.article.findMany({
      where: {
        published: false,
        deletedAt: null,
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
    if (!authorId) return [];

    const where: Prisma.ArticleWhereInput = {
      published: false,
      deletedAt: null,
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
    console.log('findPublished authorId:', authorId);
    if (!authorId) return [];

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
      select: { location: true },
    });

    if (!article) return [];

    const loc = article.location?.trim() || null;
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

    let skipped = 0;

    // ---- Hierarchical location filtering (same as local feed) ----
    if (loc) {
      const locationTerms = loc
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      for (const term of locationTerms) {
        if (results.length >= limit) break;

        const tierWhere: Prisma.ArticleWhereInput = {
          published: true,
          deletedAt: null,
          location: { contains: term, mode: 'insensitive' },
          id: { notIn: [...collectedIds] },
        };

        const tierCount = await this.prisma.article.count({
          where: tierWhere,
        });

        const tierSkip = Math.max(0, offset - skipped);
        skipped += tierCount;

        if (tierSkip >= tierCount) continue;

        const remaining = limit - results.length;
        const tierArticles = (await this.prisma.article.findMany({
          where: tierWhere,
          take: remaining,
          skip: tierSkip,
          include: authorInclude,
          orderBy: { createdAt: 'desc' },
        })) as unknown as ArticleWithRelations[];

        for (const a of tierArticles) {
          collectedIds.add(a.id);
          results.push(a);
        }
      }
    }

    // --- Fallback if no location or not enough location articles ---
    if (results.length < limit) {
      const fallbackWhere: Prisma.ArticleWhereInput = {
        published: true,
        deletedAt: null,
        id: { notIn: [...collectedIds] },
      };

      const fallbackCount = await this.prisma.article.count({
        where: fallbackWhere,
      });

      const fallbackSkip = Math.max(0, offset - skipped);
      skipped += fallbackCount;

      if (fallbackSkip < fallbackCount) {
        const remaining = limit - results.length;
        const fallbackArticles = (await this.prisma.article.findMany({
          where: fallbackWhere,
          take: remaining,
          skip: fallbackSkip,
          include: authorInclude,
          orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
        })) as unknown as ArticleWithRelations[];

        for (const a of fallbackArticles) {
          collectedIds.add(a.id);
          results.push(a);
        }
      }
    }

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
        let trendingIds = (trendingData as { post_id: string }[]).map(
          (t) => t.post_id,
        );

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
      void this.analyticsService.track({
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
      void this.analyticsService.track({
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

    const updatedArticle = (await this.prisma.article.findUnique({
      where: { id },
      include: { author: true },
    })) as unknown as Article;

    this.articlesGateway.notifyArticleLiked(id, updatedArticle.likes);

    return updatedArticle;
  }

  async toggleBookmark(
    id: string,
    userId: string,
  ): Promise<{ bookmarked: boolean }> {
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
    return bookmarks.map((b) => ({
      ...((b as unknown as { article: ArticleWithRelations }).article),
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
