import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventType } from '../modules/analytics/analytics.interface';
import { ArticlesGateway } from '../gateways/articles.gateway';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
    private articlesGateway: ArticlesGateway,
  ) {}

  /**
   * Create a new comment (top-level or reply)
   */
  async create(data: {
    content: string;
    articleId: string;
    authorId: string;
    parentId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          content: data.content,
          article: { connect: { id: data.articleId } },
          author: { connect: { id: data.authorId } },
          parent: data.parentId
            ? { connect: { id: data.parentId } }
            : undefined,
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
      });

      const updatedArticle = await tx.article.update({
        where: { id: data.articleId },
        data: { commentCount: { increment: 1 } },
      });

      this.articlesGateway.notifyCommentCountUpdate(
        data.articleId,
        updatedArticle.commentCount,
      );

      // Track comment event
      this.analyticsService.track({
        event: AnalyticsEventType.COMMENT,
        post_id: data.articleId,
        user_id: data.authorId,
        created_at: new Date(),
      });

      // Create notification for article author (if not self)
      const article = await tx.article.findUnique({
        where: { id: data.articleId },
        select: { authorId: true, title: true },
      });
      if (article && article.authorId !== data.authorId) {
        const actor = await tx.user.findUnique({
          where: { id: data.authorId },
          select: { name: true, picture: true },
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await (tx as any).notification.create({
          data: {
            userId: article.authorId,
            type: 'comment',
            title: 'New Comment',
            message: `${actor?.name || 'Someone'} commented on your article "${article.title}"`,
            articleId: data.articleId,
            actorId: data.authorId,
            actorName: actor?.name || null,
            actorPicture: actor?.picture || null,
          },
        });
      }

      return comment;
    });
  }

  /**
   * Get all comments for an article (tree structure)
   * Returns top-level comments with nested replies
   */
  async findByArticle(articleId: string, userId?: string) {
    // Fetch all comments for the article
    const allComments = await this.prisma.comment.findMany({
      where: { articleId, deletedAt: null }, // Only fetch non-deleted comments
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
        commentLikes: userId
          ? {
              where: { userId },
              select: { userId: true },
            }
          : undefined,
      },
      orderBy: { createdAt: 'asc' },
    });

    type OriginalComment = (typeof allComments)[0];
    type CommentNode = Omit<OriginalComment, 'commentLikes'> & {
      liked: boolean;
      replies: CommentNode[];
    };

    // Build tree structure
    const commentMap = new Map<string, CommentNode>();
    const rootComments: CommentNode[] = [];

    // First pass: create a map of all comments
    for (const comment of allComments) {
      // safe access using unknown cast first then to a type that includes potential extras
      type RawComment = OriginalComment & {
        commentLikes?: { userId: string }[];
      };
      const rawComment = comment as unknown as RawComment;

      const commentLikes = rawComment.commentLikes;
      const liked = !!(commentLikes && commentLikes.length > 0);

      // Create node without commentLikes property in it
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { commentLikes: _, ...rest } = rawComment;

      const node: CommentNode = {
        ...(rest as any),
        liked,
        replies: [],
      };

      commentMap.set(comment.id, node);
    }

    // Second pass: build tree
    for (const comment of allComments) {
      const node = commentMap.get(comment.id);
      if (node) {
        if (comment.parentId && commentMap.has(comment.parentId)) {
          commentMap.get(comment.parentId)?.replies.push(node);
        } else {
          rootComments.push(node);
        }
      }
    }

    return rootComments;
  }

  /**
   * Get comment count for an article
   */
  async getCount(articleId: string): Promise<number> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { commentCount: true },
    });
    // If article is null or commentCount is missing, default to 0
    return (article?.commentCount as number) ?? 0;
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string) {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        likes: { increment: 1 },
      },
    });
  }

  /**
   * Toggle like on a comment
   */
  async toggleLike(userId: string, commentId: string) {
    const existing = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    let updatedComment;

    if (existing) {
      updatedComment = await this.prisma.$transaction(async (tx) => {
        await tx.commentLike.delete({
          where: { id: existing.id },
        });
        return tx.comment.update({
          where: { id: commentId },
          data: { likes: { decrement: 1 } },
        });
      });
    } else {
      updatedComment = await this.prisma.$transaction(async (tx) => {
        await tx.commentLike.create({
          data: { userId, commentId },
        });
        return tx.comment.update({
          where: { id: commentId },
          data: { likes: { increment: 1 } },
        });
      });
    }

    if (this.articlesGateway) {
      this.articlesGateway.notifyCommentLiked(
        updatedComment.id,
        updatedComment.likes,
        updatedComment.articleId,
      );
    }

    return updatedComment;
  }

  /**
   * Alias for findByArticle (for transition)
   */
  async findAllByArticle(articleId: string) {
    // In the future, we can use userId to mark which comments the user has liked
    return this.findByArticle(articleId);
  }

  /**
   * Helper to get all descendant IDs for recursive deletion
   */
  private async getAllDescendantIds(parentId: string): Promise<string[]> {
    const children = await this.prisma.comment.findMany({
      where: { parentId, deletedAt: null },
      select: { id: true },
    });

    let ids = children.map((c) => c.id);
    for (const id of ids) {
      const descendantIds = await this.getAllDescendantIds(id);
      ids = [...ids, ...descendantIds];
    }
    return ids;
  }

  /**
   * Delete a comment (soft delete) and all its replies
   */
  async delete(commentId: string, userId: string) {
    // Only author can delete
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.deletedAt) {
      throw new Error('Comment is already deleted');
    }

    if (comment.authorId !== userId) {
      throw new Error('Not authorized to delete this comment');
    }

    const descendantIds = await this.getAllDescendantIds(commentId);
    const allToDelete = [commentId, ...descendantIds];

    return this.prisma.$transaction(async (tx) => {
      // Soft delete the comment and all its descendants
      await tx.comment.updateMany({
        where: { id: { in: allToDelete } },
        data: { deletedAt: new Date() },
      });

      // Decrement article comment count by total number of deleted comments
      const updatedArticle = await tx.article.update({
        where: { id: comment.articleId },
        data: { commentCount: { decrement: allToDelete.length } },
      });

      this.articlesGateway.notifyCommentCountUpdate(
        comment.articleId,
        updatedArticle.commentCount,
      );

      return comment;
    });
  }
}
