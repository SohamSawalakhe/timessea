import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CommentsService } from '../services/comments.service';
import { Comment } from '../generated/prisma/client';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
}

@Controller('api/articles')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * GET /api/articles/:articleId/comments
   * Get all comments for an article (tree structure)
   */
  @Get(':articleId/comments')
  async getComments(@Param('articleId') articleId: string) {
    return this.commentsService.findByArticle(articleId);
  }

  /**
   * GET /api/articles/:articleId/comments/count
   * Get comment count
   */
  @Get(':articleId/comments/count')
  async getCommentCount(@Param('articleId') articleId: string) {
    const count = await this.commentsService.getCount(articleId);
    return { count };
  }

  /**
   * POST /api/articles/:articleId/comments
   * Create a comment (requires auth)
   */
  @Post(':articleId/comments')
  @UseGuards(AuthGuard('jwt'))
  async createComment(
    @Param('articleId') articleId: string,
    @Body() body: { content: string; parentId?: string },
    @Req() req: RequestWithUser,
  ): Promise<Comment> {
    if (!body.content || !body.content.trim()) {
      throw new HttpException(
        'Comment content is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.commentsService.create({
      content: body.content.trim(),
      articleId,
      authorId: req.user.id,
      parentId: body.parentId,
    });
  }

  /**
   * POST /api/articles/:articleId/comments/:commentId/like
   * Like a comment
   */
  @Post(':articleId/comments/:commentId/like')
  async likeComment(@Param('commentId') commentId: string): Promise<Comment> {
    return this.commentsService.likeComment(commentId);
  }

  /**
   * DELETE /api/articles/:articleId/comments/:commentId
   * Delete a comment (requires auth, owner only)
   */
  @Delete(':articleId/comments/:commentId')
  @UseGuards(AuthGuard('jwt'))
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: RequestWithUser,
  ): Promise<Comment> {
    try {
      return await this.commentsService.delete(commentId, req.user.id);
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to delete comment',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
