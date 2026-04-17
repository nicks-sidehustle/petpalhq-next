'use client';

import { useEffect } from 'react';
import {
  resetEngagementState,
  initUserTypeTracking,
  initScrollTracking,
  initTimeTracking,
  initMouseTracking,
  initGuideCompletionTracking,
  initProductCardViewTracking,
  initComparisonViewTracking,
} from '@/lib/engagement';

interface UseEngagementTrackingOptions {
  /** Enable guide-specific tracking (completion, product cards, comparisons) */
  isGuide?: boolean;
}

/**
 * Hook to initialize all engagement tracking for a page.
 * Call once per page/route. Cleans up on unmount.
 *
 * Usage:
 *   useEngagementTracking()                    // basic page tracking
 *   useEngagementTracking({ isGuide: true })   // full guide tracking
 */
export function useEngagementTracking(options: UseEngagementTrackingOptions = {}) {
  const { isGuide = false } = options;

  useEffect(() => {
    // Reset state for this page load
    resetEngagementState();

    // Core tracking (all pages)
    initUserTypeTracking();
    const cleanupScroll = initScrollTracking();
    const cleanupTime = initTimeTracking();
    const cleanupMouse = initMouseTracking();

    // Guide-specific tracking
    let cleanupGuideComplete = () => {};
    let cleanupProductCards = () => {};
    let cleanupComparison = () => {};

    if (isGuide) {
      cleanupGuideComplete = initGuideCompletionTracking();
      cleanupProductCards = initProductCardViewTracking();
      cleanupComparison = initComparisonViewTracking();
    }

    return () => {
      cleanupScroll();
      cleanupTime();
      cleanupMouse();
      cleanupGuideComplete();
      cleanupProductCards();
      cleanupComparison();
    };
  }, [isGuide]);
}
