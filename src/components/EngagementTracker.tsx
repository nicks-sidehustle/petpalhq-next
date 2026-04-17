'use client';

import { useEngagementTracking } from '@/hooks/useEngagementTracking';

interface EngagementTrackerProps {
  isGuide?: boolean;
}

/**
 * Drop-in client component that activates engagement tracking.
 * Renders nothing — purely a side-effect component.
 *
 * Usage in server components:
 *   <EngagementTracker isGuide />
 */
export function EngagementTracker({ isGuide = false }: EngagementTrackerProps) {
  useEngagementTracking({ isGuide });
  return null;
}
