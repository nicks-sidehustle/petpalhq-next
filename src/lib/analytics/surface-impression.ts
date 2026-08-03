'use client';

/**
 * Sustained-visibility impression tracking for the promo rail surface.
 *
 * Ported from SmartHomeExplorer/DormGearHQ's grid side-rail pilot ("Rail
 * v2"). Fires a `promo_surface_impression` event exactly once per pageview
 * when the target surface has been >=50% visible for a continuous 1000ms — a
 * quick scroll-past does not count, and dropping below the threshold before
 * the hold period elapses resets the timer. Once fired, the observer
 * disconnects (never re-fires on scroll-away-and-back).
 *
 * ADAPTATION vs SHE/dormgear: those sites push through a shared `dataLayer`
 * module (pushCustomEvent). PetPalHQ's existing GA wrapper
 * (src/components/GoogleAnalytics.tsx) already exports `trackEvent` for this
 * exact purpose (used by AffiliateLink's click tracking) — reused directly
 * instead of introducing a second analytics-dispatch path.
 *
 * `useSurfaceImpression` is the primary export for client components that
 * already hold a ref to their root surface element. `SurfaceImpressionTracker`
 * is a thin wrapper for SERVER components (e.g. SeasonalPromoRail) that can
 * render a client child but can't call a hook themselves — it locates the
 * surface via the `data-seasonal-promo="{surface}"` marker the promo
 * component already renders on its root element.
 */

import { useEffect, useRef, type RefObject } from 'react';
import { trackEvent } from '@/components/GoogleAnalytics';

const VISIBILITY_THRESHOLD = 0.5;
const SUSTAIN_MS = 1000;

export type PromoSurface = 'rail';

export function useSurfaceImpression(
  surface: PromoSurface,
  targetRef?: RefObject<Element | null>
) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (firedRef.current) return;

    const el = targetRef?.current ?? document.querySelector(`[data-seasonal-promo="${surface}"]`);
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (timer) return; // already counting down
          timer = setTimeout(() => {
            firedRef.current = true;
            trackEvent('promo_surface_impression', { surface });
            observer.disconnect();
          }, SUSTAIN_MS);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: VISIBILITY_THRESHOLD }
    );

    observer.observe(el);

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [surface, targetRef]);
}

/** Renders nothing — mounts the observer for server-component call sites. */
export function SurfaceImpressionTracker({ surface }: { surface: PromoSurface }) {
  useSurfaceImpression(surface);
  return null;
}
