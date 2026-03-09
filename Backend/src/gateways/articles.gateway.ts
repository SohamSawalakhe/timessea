import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { ConsoleLogger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ArticlesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new ConsoleLogger(ArticlesGateway.name);

  @WebSocketServer()
  server!: Server;

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  notifyArticleViewed(articleId: string, views: number) {
    this.server.emit('articleViewed', { articleId, views });
  }

  notifyArticleLiked(articleId: string, likes: number) {
    this.server.emit('articleLiked', { articleId, likes });
  }

  notifyCommentLiked(commentId: string, likes: number, articleId: string) {
    this.server.emit('commentLiked', { commentId, likes, articleId });
  }

  notifyCommentCountUpdate(articleId: string, commentCount: number) {
    this.server.emit('commentCountUpdate', { articleId, commentCount });
  }
}
