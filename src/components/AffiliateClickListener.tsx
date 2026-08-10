'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  trackAffiliateLinkClick,
  resetEngagementState,
  initScrollDepthTracking,
} from '@/lib/analytics/affiliate-telemetry';

/**
 * ONE document-level delegated click listener covering every money link that
 * React does not already instrument.
 *
 * WHY DELEGATION: the majority of PetPal's money links by volume live inside
 * markdown guide prose. `injectAffiliateLinks()` + the global `marked` link
 * renderer in src/lib/guides.ts emit them as plain `<a href="/go/{id}?s=&p=">`
 * strings that reach the DOM through `dangerouslySetInnerHTML` (GuideBody,
 * PickDeepDive, ForSpeciesSection, WhenNotToBuy, BottomLine). They never pass
 * through AffiliateLink, so no React onClick can see them. A single delegated
 * listener instruments all of them without editing one line of authored content.
 *
 * The anchor's own href supplies everything the event needs — `/go/{ASIN}`
 * gives the ASIN and the product-vs-search link type, `?s=` the guide slug,
 * `?p=` the placement — which is why no data-* attributes had to be injected
 * into the markdown pipeline.
 *
 * DE-DUPLICATION: AffiliateLink stamps `data-affiliate-tracked="1"` on its
 * anchors and fires its own event; those are skipped here. Every other `/go/`
 * anchor is caught, so a new money surface is instrumented by default rather
 * than silently untracked (fail-open coverage).
 *
 * OBSERVE-ONLY: no preventDefault, no href rewriting, no awaiting. The click
 * proceeds to /go/[id] exactly as it would with this component absent.
 */
export default function AffiliateClickListener() {
  const pathname = usePathname();

  // Engagement metrics describe THIS pageview (time-on-page, scroll depth,
  // click index), so they reset per route — not once per mount. App-router
  // navigations keep this component mounted, so keying on pathname is what
  // stops page 3's first click from reporting page 1's dwell time.
  useEffect(() => {
    resetEngagementState();
    return initScrollDepthTracking();
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest) return;

      const anchor = target.closest('a[href^="/go/"]') as HTMLAnchorElement | null;
      if (!anchor) return;

      // Already counted by AffiliateLink's own onClick.
      if (anchor.dataset.affiliateTracked) return;

      // getAttribute (not .href) keeps the relative form the renderer emitted,
      // so link_url reports the authored href rather than an absolutized one.
      const href = anchor.getAttribute('href') || anchor.href;

      // Prose anchors have no product metadata beyond their visible label; the
      // link text IS the product name (injectAffiliateLinks wraps pick names).
      const productName = anchor.textContent?.trim().slice(0, 100) || undefined;

      trackAffiliateLinkClick({
        href,
        productName,
        // link_position comes from the href's `?p=` param (currently 'inline'
        // for all prose fields). Not overridden here — the renderer is the
        // authority on which surface emitted the link.
      });
    };

    // Bubble phase: the handler never calls preventDefault, so navigation and
    // any other click handling on the page are unaffected.
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return null;
}
