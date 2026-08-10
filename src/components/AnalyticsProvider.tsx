'use client';

import { Suspense } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import AffiliateClickListener from '@/components/AffiliateClickListener';

function AnalyticsTracker() {
  useAnalytics();
  return null;
}

export default function AnalyticsProvider() {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {/* Outside the Suspense boundary on purpose: the listener only needs
          usePathname (never useSearchParams), so it must not be gated behind a
          suspending sibling — a money link clicked during that suspense would
          otherwise go uncounted. */}
      <AffiliateClickListener />
    </>
  );
}