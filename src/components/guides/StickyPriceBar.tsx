"use client";

/**
 * StickyPriceBar — the persistent floating "Check price" bar for guide pages.
 *
 * Ported from DormGearHQ's `StickyAmazonBar` (sentinel-driven show/hide,
 * session-scoped dismiss, end-sentinel so it never sits over the footer) and
 * SmartHomeExplorer's `ReviewStickyPriceBar` (server-resolved price string,
 * 44px tap targets, SSR-rendered-then-revealed so the markup is in the built
 * HTML). Visual language is petpal's own: cream surface, navy type, coral CTA
 * — the same tokens the pick cards use.
 *
 * WHAT IT IS FOR: on a phone the picks grid scrolls away within a screen or
 * two and the buy path disappears for the rest of a 3,000-word guide. This
 * keeps the #1 pick's price and one tap to it in reach the whole read.
 *
 * WHETHER IT RENDERS AT ALL is decided server-side by `resolveStickyBarPick`
 * (src/lib/sticky-price-bar.ts) — this component never derives a price, an
 * href, or a buyability judgement. If the guide's #1 pick is unbuyable,
 * quote-based, or has no resolvable ASIN, the guide page passes nothing and
 * this component is never mounted.
 *
 * BREAKPOINT (`xl:hidden`): at xl+ (>=1280px) the guide already carries
 * `GuideSideRail` — a sticky right rail with its own rel="nofollow sponsored"
 * Amazon CTA. Two simultaneous persistent CTAs on one page is the redundant-
 * duplicate-CTA pattern the rail's own wiring warns about, and their subtags
 * would compete for the same click. Below xl there is no persistent buy
 * surface at all, which is exactly the gap this fills (and where it was
 * noticed — on a phone). SHE's variant is `md:hidden` for the same reason.
 *
 * LAYOUT SHIFT: `position: fixed` means the bar never participates in layout,
 * so it cannot shift content — it is CLS-zero by construction in both the
 * hidden and shown states. Nothing is occluded at the page end either: the end
 * sentinel retires the bar before the sources/related-guides block, so the
 * affiliate disclosure and footer are never covered.
 *
 * MOTION: a 300ms slide-up, disabled under `prefers-reduced-motion` via
 * `motion-reduce:transition-none` — the bar then simply appears in place.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
// TYPE-ONLY, deliberately. `src/lib/sticky-price-bar.ts` reaches the build-time
// price cache, which reads `fs` — a value import here would drag `fs` into the
// browser bundle and fail the build. The sentinel ids and the placement subtag
// therefore arrive as props from the server component, which owns those
// constants. The type import is erased at compile time and traces nothing.
import type { StickyBarPick } from "@/lib/sticky-price-bar";

const DISMISS_KEY = "petpal-sticky-price-bar-dismissed";

/** Fallback reveal threshold when the start sentinel is missing from the DOM. */
const FALLBACK_SCROLL_PX = 600;

export default function StickyPriceBar({
  pick,
  startSentinelId,
  endSentinelId,
  placement,
}: {
  pick: StickyBarPick;
  /** DOM id of the zero-height sentinel just below the picks grid. */
  startSentinelId: string;
  /** DOM id of the sentinel that retires the bar before the page footer. */
  endSentinelId: string;
  /** ascsubtag / link_position for this surface's click attribution. */
  placement: string;
}) {
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Scroll position is read directly from the two sentinels, rAF-throttled —
  // deliberately NOT IntersectionObserver, which the donor components use.
  //
  // IO only delivers an entry when a threshold is CROSSED. A jump-scroll never
  // crosses one: the sentinel goes from "below the viewport, not intersecting"
  // straight to "above it, not intersecting", so no callback fires and the bar
  // stays hidden for the rest of the page. That is not a hypothetical here —
  // petpal guides ship an on-page TOC and "Jump to deep dive ↓" anchors, and
  // every one of those taps jumps the reader past the picks grid in a single
  // frame. (Reproduced headless on this branch before the switch; dormgear's
  // version dodges it only because its `!isIntersecting` test also shows the
  // bar ABOVE the grid, where the cards' own CTAs already are.)
  //
  // Two getBoundingClientRect reads per animation frame, only while a guide is
  // scrolling, is a negligible cost for a surface that has to be correct.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }

    const start = document.getElementById(startSentinelId);
    const end = document.getElementById(endSentinelId);
    let frame = 0;

    const measure = () => {
      frame = 0;
      // Past the picks grid: the sentinel directly below it has left the top
      // of the viewport, so the cards' own Check-price CTAs are off screen.
      const pastPicks = start
        ? start.getBoundingClientRect().top < 0
        : // No sentinel (defensive — the template always plants one): fall
          // back to a fixed scroll distance rather than never showing.
          window.scrollY > FALLBACK_SCROLL_PX;
      // Retired at the end of the article: hide as soon as the end sentinel
      // enters the viewport, so the bar can never overlay the sources panel,
      // related guides, the affiliate disclosure, or the footer.
      const reachedEnd = end
        ? end.getBoundingClientRect().top <= window.innerHeight
        : false;
      setShown(pastPicks && !reachedEnd);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [startSentinelId, endSentinelId]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private-mode storage denial — dismiss still holds for this render */
    }
  };

  // SSR renders the bar in its hidden state so the markup ships in the built
  // HTML; the observers reveal it. `invisible` also takes the CTA out of the
  // tab order while hidden, so keyboard users never focus an offscreen link.
  return (
    <div
      data-sticky-price-bar
      aria-hidden={!shown}
      className={`fixed bottom-0 left-0 right-0 z-40 xl:hidden border-t shadow-[0_-2px_12px_rgba(30,58,110,0.10)] transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none ${
        shown ? "visible translate-y-0" : "invisible translate-y-full"
      }`}
      style={{
        backgroundColor: "var(--color-cream)",
        borderColor: "var(--color-cream-deep)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          {pick.label && (
            <p
              className="truncate text-[10px] font-semibold uppercase leading-tight tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              {pick.label}
            </p>
          )}
          <p
            className="line-clamp-2 text-sm font-semibold leading-snug"
            style={{ color: "var(--color-navy)" }}
          >
            <span className="mr-1.5" style={{ color: "var(--color-coral-deep)" }}>
              {pick.price}
            </span>
            {pick.name}
          </p>
        </div>
        <AffiliateLink
          href={pick.href}
          productName={pick.name}
          placement={placement}
          className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded px-4 text-sm font-semibold transition-colors"
          style={{ backgroundColor: "var(--color-coral)", color: "white" }}
        >
          Check price
        </AffiliateLink>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center transition-colors"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Dismiss price bar"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
