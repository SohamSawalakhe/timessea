import { Module } from '@nestjs/common';
import { ArticlesService } from '../../services/articles.service';
import { ArticlesController } from '../../controllers/articles.controller';
import { ArticlesGateway } from '../../gateways/articles.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [PrismaModule, UsersModule, AnalyticsModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticlesGateway],
  exports: [ArticlesGateway],
})
export class ArticlesModule {}
