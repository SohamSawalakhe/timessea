import { useEffect, useRef, useState } from "react";
import { analytics, AnalyticsEventType } from "@/lib/analytics";

type ContentType = "article" | "short_video" | "long_video";

interface UseViewTrackerProps {
  postId: string;
  type: ContentType;
  threshold?: number; // Optional override
  onTrigger?: () => void;
}

/**
 * Hook to track meaningful views based on duration and visibility.
 * - Article: 10s
 * - Short Video: 3s
 * - Long Video: 30s
 */
export const useViewTracker = ({
  postId,
  type,
  threshold,
  onTrigger,
}: UseViewTrackerProps) => {
  const [hasViewed, setHasViewed] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const cumulativeTimeRef = useRef<number>(0);

  // Determine threshold based on type (if not overridden)
  const getThreshold = () => {
    if (threshold) return threshold;
    switch (type) {
      case "short_video":
        return 3000;
      case "long_video":
        return 30000;
      case "article":
      default:
        return 10000;
    }
  };

  useEffect(() => {
    if (hasViewed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const now = Date.now();

        if (entry.isIntersecting) {
          // Started viewing
          startTimeRef.current = now;
        } else {
          // Stopped viewing
          if (startTimeRef.current) {
            const duration = now - startTimeRef.current;
            cumulativeTimeRef.current += duration;
            startTimeRef.current = null;
          }
        }

        // Check validation
        checkThreshold();
      },
      { threshold: 0.5 }, // 50% visible
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    // Interval to check while user is still viewing (don't wait for scroll away)
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const currentSession = Date.now() - startTimeRef.current;
        if (cumulativeTimeRef.current + currentSession >= getThreshold()) {
          triggerView();
        }
      }
    }, 1000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [postId, type, hasViewed]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const checkThreshold = () => {
    if (hasViewed) return;
    if (cumulativeTimeRef.current >= getThreshold()) {
      triggerView();
    }
  };

  const triggerView = () => {
    if (hasViewed) return;
    setHasViewed(true);

    analytics.track({
      event: AnalyticsEventType.POST_VIEW,
      post_id: postId,
      duration: Math.round(
        (cumulativeTimeRef.current +
          (startTimeRef.current ? Date.now() - startTimeRef.current : 0)) /
          1000,
      ),
      metadata: { type },
    });
    console.log(`[Analytics] View recorded for ${type} ${postId}`);

    if (onTrigger) {
      onTrigger();
    }
  };

  return { elementRef };
};
