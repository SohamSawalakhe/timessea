import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";

/**
 * Frontend Analytics Service
 *
 * Handles tracking user interactions and sending them to the backend API.
 * Includes debouncing/batching logic to reduce network requests.
 * Manages client_id for anonymous user tracking.
 */

// Define event types matching the backend
export enum AnalyticsEventType {
  PAGE_VIEW = "page_view",
  POST_VIEW = "post_view",
  POST_READ = "post_read",
  LIKE = "like",
  COMMENT = "comment",
  SHARE = "share",
  SAVE = "save",
  SEARCH_QUERY = "search_query",
}

export interface AnalyticsEvent {
  event: AnalyticsEventType;
  client_id?: string;
  user_id?: string;
  post_id?: string;
  post_status?: string;
  location_id?: number | null;
  device?: string;
  duration?: number;
  metadata?: Record<string, any>;
  created_at?: Date;
}

const CLIENT_ID_KEY = "ts_client_id";

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private isProcessing = false;
  private BATCH_SIZE = 5;
  private FLUSH_INTERVAL = 3000;
  private timer: NodeJS.Timeout | null = null;
  private endpoint = "http://127.0.0.1:5000/api/analytics/track";

  constructor() {
    if (typeof window !== "undefined") {
      this.startFlushTimer();
    }
  }

  /**
   * Get or create a persistent client ID
   */
  public getClientId(): string {
    if (typeof window === "undefined") return "server-side";

    // 1. Try cookie
    let clientId = Cookies.get(CLIENT_ID_KEY);
    if (clientId) return clientId;

    // 2. Try localStorage
    clientId = localStorage.getItem(CLIENT_ID_KEY) || undefined;
    if (clientId) {
      // Restore cookie
      Cookies.set(CLIENT_ID_KEY, clientId, { expires: 365, sameSite: "Lax" });
      return clientId;
    }

    // 3. Generate new
    clientId = uuidv4();
    this.setClientId(clientId);
    return clientId;
  }

  private setClientId(clientId: string) {
    if (typeof window === "undefined") return;
    Cookies.set(CLIENT_ID_KEY, clientId, { expires: 365, sameSite: "Lax" });
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  /**
   * Track a single event
   */
  public track(event: AnalyticsEvent) {
    // Add defaults
    if (!event.client_id) {
      event.client_id = this.getClientId();
    }
    if (!event.device && typeof window !== "undefined") {
      event.device = this.getDeviceType();
    }
    if (!event.created_at) {
      event.created_at = new Date();
    }

    // Push to queue
    this.queue.push(event);

    // Flush if full
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  private getDeviceType(): string {
    const ua = navigator.userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua))
      return "tablet";
    if (/mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua))
      return "mobile";
    return "web";
  }

  private async flush() {
    if (this.queue.length === 0 || this.isProcessing) return;

    this.isProcessing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      // Send batch to backend
      // Using /batch endpoint if available, but for now assuming single endpoint or simplified
      await fetch(`${this.endpoint}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
    } catch (error) {
      console.error("Analytics flush error:", error);
      // Optional: Re-queue failed events (careful of loops)
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
