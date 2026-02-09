import {
  Injectable,
  Controller,
  Get,
  Post,
  Param,
  Request,
} from '@nestjs/common';
import { AnalyticsService } from '../../services/analytics.service';
import {
  AnalyticsEventType,
  DeviceType,
  PostStatus,
} from './analytics.interface';

// Helper interface for request object
interface RequestWithUser {
  user: {
    id: string;
    locationId?: number;
  };
  headers: Record<string, string | string[] | undefined>;
}

// ============================================
// EXAMPLE 1: Posts Module Integration
// ============================================

@Injectable()
export class PostsService {
  constructor(
    private analyticsService: AnalyticsService,
    // ... other services
  ) {}

  /**
   * When a user views a post
   */
  async viewPost(postId: string, userId: string, deviceType: DeviceType) {
    // Track the view event
    await this.analyticsService.track({
      event: AnalyticsEventType.POST_VIEW,
      user_id: userId,
      post_id: postId,
      device: deviceType,
      created_at: new Date(),
    });
  }

  /**
   * When a user likes a post
   */
  async likePost(postId: string, userId: string, locationId?: number) {
    // Track the like
    await this.analyticsService.track({
      event: AnalyticsEventType.LIKE,
      user_id: userId,
      post_id: postId,
      location_id: locationId,
    });
  }

  /**
   * When a user comments on a post
   */
  async createComment(postId: string, userId: string, commentText: string) {
    // Track the comment
    await this.analyticsService.track({
      event: AnalyticsEventType.COMMENT,
      user_id: userId,
      post_id: postId,
      metadata: {
        comment_length: commentText.length,
      },
    });
  }

  /**
   * When a post is created
   */
  async createPost(authorId: string, postData: { locationId?: number }) {
    // Track post creation
    await this.analyticsService.track({
      event: AnalyticsEventType.POST_CREATED,
      user_id: authorId,
      post_id: 'post.id', // Use actual post ID
      post_status: PostStatus.PENDING,
      location_id: postData.locationId,
    });
  }

  async findOne(id: string) {
    return await Promise.resolve({ id, title: 'Example Post' });
  }
}

// ============================================
// EXAMPLE 2: Moderation Module Integration
// ============================================

@Injectable()
export class ModerationService {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * When a moderator approves a post
   */
  async approvePost(postId: string, moderatorId: string) {
    // Track moderation action
    await this.analyticsService.track({
      event: AnalyticsEventType.POST_APPROVED,
      user_id: moderatorId,
      post_id: postId,
      post_status: PostStatus.APPROVED,
    });
  }

  /**
   * When a moderator rejects a post
   */
  async rejectPost(postId: string, moderatorId: string, reason: string) {
    // Track moderation action with reason
    await this.analyticsService.track({
      event: AnalyticsEventType.POST_REJECTED,
      user_id: moderatorId,
      post_id: postId,
      post_status: PostStatus.REJECTED,
      metadata: {
        rejection_reason: reason,
      },
    });
  }

  /**
   * When a user reports content
   */
  async reportPost(postId: string, reporterId: string, reason: string) {
    // Track report event
    await this.analyticsService.track({
      event: AnalyticsEventType.REPORT,
      user_id: reporterId,
      post_id: postId,
      metadata: {
        report_reason: reason,
      },
    });
  }
}

// ============================================
// EXAMPLE 3: Auth Module Integration
// ============================================

@Injectable()
export class AuthService {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * When a user signs up
   */
  async signup(userData: {
    id: string;
    locationId?: number;
    device?: DeviceType;
    method: string;
  }) {
    // Track signup
    await this.analyticsService.track({
      event: AnalyticsEventType.USER_SIGNUP,
      user_id: userData.id,
      location_id: userData.locationId,
      device: userData.device,
      metadata: {
        signup_method: userData.method,
      },
    });
  }

  /**
   * When a user logs in
   */
  async login(userId: string, device: DeviceType) {
    // Track login
    await this.analyticsService.track({
      event: AnalyticsEventType.USER_LOGIN,
      user_id: userId,
      device: device,
    });
  }
}

// ============================================
// EXAMPLE 4: Controller Integration
// ============================================

@Controller('posts-example')
export class PostsExampleController {
  constructor(
    private postsService: PostsService,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * GET /posts-example/:id
   */
  @Get(':id')
  async getPost(@Param('id') id: string, @Request() req: RequestWithUser) {
    // Extract device type from user agent
    const userAgent = req.headers['user-agent'] as string;
    const deviceType = this.getDeviceType(userAgent);

    // Track the view
    await this.analyticsService.track({
      event: AnalyticsEventType.POST_VIEW,
      user_id: req.user?.id || 'anonymous',
      post_id: id,
      device: deviceType,
    });

    return this.postsService.findOne(id);
  }

  /**
   * POST /posts-example/:id/like
   */
  @Post(':id/like')
  async likePost(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.postsService.likePost(id, req.user.id, req.user.locationId);
    return { success: true };
  }

  private getDeviceType(userAgent: string): DeviceType {
    if (!userAgent) return DeviceType.UNKNOWN;

    const ua = userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
      return DeviceType.TABLET;
    }
    if (/mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      return DeviceType.MOBILE;
    }
    return DeviceType.WEB;
  }
}

// ============================================
// EXAMPLE 5: Batch Tracking
// ============================================

@Injectable()
export class NewsfeedService {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Track multiple impressions at once
   */
  async trackImpressions(userId: string, postIds: string[]) {
    const events = postIds.map((postId) => ({
      event: AnalyticsEventType.POST_VIEW,
      user_id: userId,
      post_id: postId,
      created_at: new Date(),
    }));

    // Track all impressions in one batch
    await this.analyticsService.trackBatch(events);
  }
}
