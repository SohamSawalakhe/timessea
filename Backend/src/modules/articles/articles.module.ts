import { Module } from '@nestjs/common';
import { ArticlesService } from '../../services/articles.service';
import { ArticlesController } from '../../controllers/articles.controller';
import { CommentsController } from '../../controllers/comments.controller';
import { CommentsService } from '../../services/comments.service';
import { ArticlesGateway } from '../../gateways/articles.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { NotificationsController } from '../../controllers/notifications.controller';
import { NotificationsService } from '../../services/notifications.service';

import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, UsersModule, AnalyticsModule, AuthModule],
  controllers: [
    ArticlesController,
    CommentsController,
    NotificationsController,
  ],
  providers: [
    ArticlesService,
    CommentsService,
    ArticlesGateway,
    NotificationsService,
  ],
  exports: [ArticlesGateway, CommentsService],
})
export class ArticlesModule {}
