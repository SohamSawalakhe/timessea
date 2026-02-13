import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new comment (top-level or reply)
   */
  async create(data: {
    content: string;
    articleId: string;
    authorId: string;
    parentId?: string;
  }) {
    return this.prisma.comment.create({
      data: {
        content: data.content,
        article: { connect: { id: data.articleId } },
        author: { connect: { id: data.authorId } },
        ...(data.parentId ? { parent: { connect: { id: data.parentId } } } : {}),
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
  }

  /**
   * Get all comments for an article (tree structure)
   * Returns top-level comments with nested replies
   */
  async findByArticle(articleId: string) {
    // Fetch all comments for the article
    const allComments = await this.prisma.comment.findMany({
      where: { articleId },
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
      orderBy: { createdAt: 'asc' },
    });

    // Build tree structure
    const commentMap = new Map<string, any>();
    const rootComments: any[] = [];

    // First pass: create a map of all comments
    for (const comment of allComments) {
      commentMap.set(comment.id, { ...comment, replies: [] });
    }

    // Second pass: build tree
    for (const comment of allComments) {
      const node = commentMap.get(comment.id);
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId).replies.push(node);
      } else {
        rootComments.push(node);
      }
    }

    return rootComments;
  }

  /**
   * Get comment count for an article
   */
  async getCount(articleId: string): Promise<number> {
    return this.prisma.comment.count({
      where: { articleId },
    });
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
   * Delete a comment (and cascading replies)
   */
  async delete(commentId: string, userId: string) {
    // Only author can delete
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new Error('Not authorized to delete this comment');
    }

    return this.prisma.comment.delete({
      where: { id: commentId },
    });
  }
}
