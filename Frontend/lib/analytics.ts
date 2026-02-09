
/**
 * Frontend Analytics Service
 * 
 * Handles tracking user interactions and sending them to the backend API.
 * Includes debouncing/batching logic to reduce network requests.
 */

// Define event types matching the backend
export enum AnalyticsEventType {
  // Page Events
  PAGE_VIEW = 'page_view',

  // Post Interactions
  POST_VIEW = 'post_view',
  POST_READ = 'post_read',
  POST_CREATED = 'post_created',
  POST_APPROVED = 'post_approved',
  POST_REJECTED = 'post_rejected',
  POST_DELETED = 'post_deleted',

  // Engagement
  LIKE = 'like',
  UNLIKE = 'unlike',
  COMMENT = 'comment',
  SHARE = 'share',
  SAVE = 'save',
  REPORT = 'report',

  // User Actions
  USER_LOGIN = 'user_login',
  USER_SIGNUP = 'user_signup',
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',

  // Discovery
  SEARCH_QUERY = 'search_query',
  HASHTAG_CLICK = 'hashtag_click',
  TRENDING_VIEW = 'trending_view',

  // Moderation
  MODERATION_REVIEW = 'moderation_review',
  MODERATION_APPROVE = 'moderation_approve',
  MODERATION_REJECT = 'moderation_reject',
}

export interface AnalyticsEvent {
  event: AnalyticsEventType;
  user_id?: string;
  post_id?: string;
  post_status?: string;
  location_id?: number | null;
  device?: string;
  metadata?: Record<string, any>;
  created_at?: Date;
}

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private isProcessing = false;
  private BATCH_SIZE = 10;
  private FLUSH_INTERVAL = 5000; // 5 seconds
  private timer: NodeJS.Timeout | null = null;
  private endpoint = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/analytics/track` : 'http://localhost:3000/analytics/track';

  constructor() {
    // Start flush timer on client side only
    if (typeof window !== 'undefined') {
      this.startFlushTimer();
    }
  }

  /**
   * Track a single event
   */
  public track(event: AnalyticsEvent) {
    // Add device info if missing
    if (!event.device && typeof window !== 'undefined') {
      event.device = this.getDeviceType();
    }

    if (!event.created_at) {
        event.created_at = new Date();
    }

    // Add to queue
    this.queue.push(event);

    // Flush immediately if urgent or queue full
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Helper: Detect device type
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      return 'mobile';
    }
    return 'web';
  }

  /**
   * Send queued events to backend
   */
  private async flush() {
    if (this.queue.length === 0 || this.isProcessing) return;

    this.isProcessing = true;
    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      // If single event, use single endpoint (or batch endpoint if available)
      // For simplicity, we'll iterate or use a batch endpoint if implemented in backend
      // Assuming backend supports batch on /analytics/track/batch
      
      const response = await fetch(`${this.endpoint}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventsToSend),
      });

      if (!response.ok) {
        // Simple retry logic: put back in queue if failed (optional, be careful of loops)
        console.warn('Analytics flush failed', response.statusText);
      }
    } catch (error) {
      console.error('Analytics error:', error);
      // In a real app, you might want to retry or store in localStorage for later
    } finally {
      this.isProcessing = false;
    }
  }

  private startFlushTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }
}

export const analytics = new AnalyticsService();
