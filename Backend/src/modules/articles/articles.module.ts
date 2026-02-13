import { Module } from '@nestjs/common';
import { ArticlesService } from '../../services/articles.service';
import { ArticlesController } from '../../controllers/articles.controller';
import { CommentsController } from '../../controllers/comments.controller';
import { CommentsService } from '../../services/comments.service';
import { ArticlesGateway } from '../../gateways/articles.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [PrismaModule, UsersModule, AnalyticsModule],
  controllers: [ArticlesController, CommentsController],
  providers: [ArticlesService, CommentsService, ArticlesGateway],
  exports: [ArticlesGateway, CommentsService],
})
export class ArticlesModule {}
