/**
 * Sticky check-price bar — Gate-Zero resolver (SERVER-SAFE, no `fs`).
 *
 * Ports the persistent floating buy bar that DormGearHQ (StickyAmazonBar) and
 * SmartHomeExplorer (ReviewStickyPriceBar) already run on their guide/review
 * templates. This module is the single place that decides WHETHER a guide gets
 * a bar at all, and what it says — kept out of the component so the gate is
 * unit-testable and so the component never derives a price itself.
 *
 * THE GATE (Gate-Zero discipline — no bar over an unbuyable page):
 * the bar renders only when the guide's #1 pick is genuinely purchasable today:
 *
 *   1. There is a rank-1 pick (petpal's "top pick" — the first card in
 *      FeaturedPicksGrid). Only the #1 pick is ever considered: promoting #2
 *      into a page-wide persistent CTA would contradict the page's own ranking.
 *   2. `available !== false` — the honest-state gates in parseGuide()
 *      (dead-asins.json + the price-snapshot availability gate) have not
 *      flagged it. Automatically-suppressed picks never reach `guide.picks` at
 *      all, so they are excluded by construction.
 *   3. `isResolvableAsin(asin)` — a real 10-char ASIN, i.e. a /go/-able id that
 *      resolves to a product listing. A pick whose `asin` field holds a search
 *      phrase (or nothing) has no verified listing behind it; a quote-based or
 *      direct-sale pick has no Amazon destination at all. Neither earns a
 *      persistent CTA.
 *   4. A non-empty `price` WITH its dated "checked" stamp (owner rulings
 *      2026-09-24; the bar renders the card's stamp verbatim). `parsePicks()` already resolves this as
 *      `getCachedPrice(asin)?.price || frontmatterPrice`, blanking placeholder
 *      strings like "Check price" — so the bar shows EXACTLY the string the
 *      picks grid shows for the same pick. One price story, one source; this
 *      module reads the resolved `GuidePick`, never the cache.
 *
 * Any gate failing → `null` → the guide page renders no bar, no markup, no
 * sentinels.
 */

import { appendGoParams } from './affiliate-href';
import { isResolvableAsin } from './price-cache';
import type { GuidePick } from './guides';

/**
 * ascsubtag carried to Amazon (`?st=`) and the CLL first-party position tag
 * (`?p=`). Deliberately distinct from every other surface's subtag
 * (`rail_v2_*`, `rail_b2s_*`, pick-rank positions) so sticky-bar revenue is
 * attributable on its own rather than collapsing into the picks-grid bucket.
 */
export const STICKY_BAR_SUBTAG = 'sticky_bar';

/** DOM ids the guide template plants for the bar's scroll observers. */
export const STICKY_BAR_START_SENTINEL = 'sticky-bar-sentinel';
export const STICKY_BAR_END_SENTINEL = 'sticky-bar-end-sentinel';

export interface StickyBarPick {
  /** Product name, as shown on the pick card. */
  name: string;
  /** Contextual overline, e.g. "Best overall". Empty when the pick has no label. */
  label?: string;
  /** Resolved price string — identical to the picks-grid card's price. */
  price: string;
  /**
   * The card's dated "checked" stamp, verbatim ("Current price · checked Sep 8,
   * 2026") — owner rulings 2026-09-24: every displayed price carries one, and
   * the bar's figure + stamp must equal the card's.
   */
  stamp: string;
  /** YYYY-MM-DD in the stamp — the card's `priceCheckedAt`. */
  checkedAt: string;
  /** "list" | "current" — the card's `priceBasis`. */
  basis: string;
  /** Internal `/go/{ASIN}?st=sticky_bar&s={slug}&p=sticky_bar` href. */
  href: string;
}

/**
 * Resolves the sticky bar's content for a guide, or null when the guide's #1
 * pick does not clear the gate above.
 */
export function resolveStickyBarPick(
  picks: GuidePick[] | undefined,
  guideSlug: string,
): StickyBarPick | null {
  if (!picks?.length) return null;

  // The #1 pick specifically — by explicit rank when the guide numbers its
  // picks, else the first in document order.
  //
  // The `picks[0]` fallback is not a "try the runner-up" escape hatch: a pick
  // rank-1 that parseGuide() automatically SUPPRESSED is already gone from
  // this array, and in that case the guide's first rendered card genuinely is
  // the rank-2 pick. Matching picks[0] keeps the bar showing the same product
  // as the top card. When rank 1 is present but fails a gate below, the
  // function returns null — it never walks down the roster looking for a
  // buyable substitute.
  const top = picks.find((p) => p.rank === 1) ?? picks[0];
  if (!top) return null;

  if (top.available === false) return null;
  // Owner ruling 2026-09-24: "Dark cards show no figure — only the Amazon buy
  // path." A gated top pick (figure-less dark card) never gets a price bar,
  // even if some price string reached it. Explicit, not just via `price: ''`.
  if (top.suppressionReason || top.snapshotSuppressed) return null;
  if (!isResolvableAsin(top.asin)) return null;

  const price = top.price?.trim();
  if (!price) return null;
  // Owner rulings 2026-09-24: every displayed price carries a dated "checked"
  // stamp. parsePicks never sets a price without one; a price that somehow
  // arrives undated gets no bar rather than an undated figure.
  const stamp = top.priceStamp?.trim();
  if (!stamp || !top.priceCheckedAt || !top.priceBasis) return null;

  return {
    name: top.name,
    label: top.label || undefined,
    price,
    stamp,
    checkedAt: top.priceCheckedAt,
    basis: top.priceBasis,
    href: appendGoParams(
      `/go/${top.asin}?st=${STICKY_BAR_SUBTAG}`,
      guideSlug,
      STICKY_BAR_SUBTAG,
    ),
  };
}
