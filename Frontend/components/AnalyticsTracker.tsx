'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { analytics, AnalyticsEventType } from '../lib/analytics';

function AnalyticsTrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      // Construct full URL including query params
      const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      analytics.track({
        event: AnalyticsEventType.POST_VIEW, // Generic view event, or create a PAGE_VIEW type
        // Using POST_VIEW as a placeholder for general page hits if PAGE_VIEW isn't defined yet,
        // but ideally we should update the Enum. For now let's use a generic 'page_view' literal or fit it into existing schema.
        // The current enum has POST_VIEW. Let's send a custom 'page_view' as a string if the type allows, or stick to the defined Enum.
        // The backend uses String for event type, so we can send any string.
        // However, the frontend lib enforces the Enum. I should add PAGE_VIEW to the Enum in lib/analytics.ts first.
        // For this step, I will use 'page_view' cast as any or add it to the Enum.
        // Let's assume I will update the Enum in the previous file.
        // Actually, let's use a meaningful event. If it's a post page /posts/[id], we might want to track POST_VIEW.
        // For general pages, maybe we just track navigation?
        // Let's stick to a simple 'page_view' event.
        // I'll update the enum in the next step.
        event: 'page_view' as AnalyticsEventType, 
        metadata: {
          path: pathname,
          url: url,
          referrer: typeof document !== 'undefined' ? document.referrer : '',
        },
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerContent />
    </Suspense>
  );
}
