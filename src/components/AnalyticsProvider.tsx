'use client';

import { Suspense } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

function AnalyticsTracker() {
  useAnalytics();
  return null;
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}