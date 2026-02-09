/**
 * Analytics Event Types
 * Define all possible analytics events in your platform
 */
export enum AnalyticsEventType {
  // Post Events
  POST_VIEW = 'post_view',
  POST_READ = 'post_read',
  POST_CREATED = 'post_created',
  POST_APPROVED = 'post_approved',
  POST_REJECTED = 'post_rejected',
  POST_DELETED = 'post_deleted',

  // Engagement Events
  LIKE = 'like',
  UNLIKE = 'unlike',
  COMMENT = 'comment',
  COMMENT_DELETED = 'comment_deleted',
  SHARE = 'share',
  SAVE = 'save',
  REPORT = 'report',

  // User Events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_SIGNUP = 'user_signup',
  USER_PROFILE_VIEW = 'user_profile_view',
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',

  // Search & Discovery
  SEARCH_QUERY = 'search_query',
  HASHTAG_CLICK = 'hashtag_click',
  TRENDING_VIEW = 'trending_view',

  // Moderation Events
  MODERATION_REVIEW = 'moderation_review',
  MODERATION_APPROVE = 'moderation_approve',
  MODERATION_REJECT = 'moderation_reject',
}

/**
 * Post Status Types
 */
export enum PostStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELETED = 'deleted',
}

/**
 * Device Types
 */
export enum DeviceType {
  MOBILE = 'mobile',
  WEB = 'web',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

/**
 * Analytics Event Interface
 * This is the core contract for all analytics events
 */
export interface AnalyticsEvent {
  event: AnalyticsEventType;
  user_id: string;
  post_id?: string;
  post_status?: PostStatus;
  location_id?: number;
  device?: DeviceType;
  metadata?: Record<string, any>;
  created_at?: Date;
}

/**
 * Post Analytics Response
 */
export interface PostAnalytics {
  post_id: string;
  views: number;
  unique_views: number;
  reads: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
  geo_distribution?: Array<{
    location_id: number;
    count: number;
  }>;
}

/**
 * Platform Analytics Response
 */
export interface PlatformAnalytics {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  posts_today: number;
  posts_approved_today: number;
  posts_rejected_today: number;
  total_engagement_today: number;
}

/**
 * User Activity Analytics
 */
export interface UserActivityAnalytics {
  user_id: string;
  total_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  engagement_score: number;
}
