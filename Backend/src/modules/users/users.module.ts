import { Module } from '@nestjs/common';
import { UsersService } from '../../services/users.service';
import { UsersController } from './users.controller';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
