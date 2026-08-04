/**
 * rail-promo.ts — resolves the seasonal RAIL CARD's content for a guide page.
 *
 * Ported from SmartHomeExplorer/DormGearHQ's "Rail v2" seasonal-promo
 * resolver (getContextualPromo), adapted to PetPalHQ's existing data model.
 *
 * ADAPTATION vs SHE/dormgear: those sites resolve a category-contextual pool
 * of live consensus-data products for every guide (contextual-promo-pools.ts
 * + getContextualPromo()). PetPalHQ has no such pool infrastructure and no
 * populated consensus-data registry (consensusReviews is an empty v2
 * scaffold — see src/lib/content/consensus-data.ts) to draw one from. Rather
 * than fabricate a new pool of products, this resolver reuses PetPalHQ's own
 * existing, real, owner-curated back-to-school judgment set
 * (src/config/b2s-rail.ts, B2S_RAIL) — the same honest 4-guide roster that
 * already powers the in-flow SeasonalB2SRail block. The rail card is
 * therefore a second SURFACE for the same real data, not a new roster: no
 * invented ASINs, products, or cohorts.
 *
 * Gating (rail card only — never SeasonalB2SRail, the in-flow surface):
 *   1. NEXT_PUBLIC_SEASONAL_PROMO === '1' kill-switch (defaults off).
 *   2. rail-holdout.ts's ~10% deterministic holdout.
 *   3. The page slug must have a B2S_RAIL entry (the same honest judgment
 *      set — the rail never appears on a page the in-flow block wouldn't
 *      also have covered).
 *
 * ATTRIBUTION: the rail card carries its own `rail_v2_{key}` subtag/position,
 * distinct from SeasonalB2SRail's `rail_b2s_{key}`, even though both surfaces
 * resolve the same B2S_RAIL entry. Reusing the in-flow subtag would collide
 * the two surfaces' revenue attribution into one bucket. page.tsx also hides
 * the in-flow block at xl+ so the two CTAs are never both visible in the same
 * viewport at once.
 *
 * "Prices checked" freshness: B2S_RAIL cards borrow a pick FROM another
 * guide (`fromGuide`); that source guide's own `lastProductCheck` frontmatter
 * date is reused rather than inventing a rail-specific timestamp. Gated to a
 * 30-day freshness window — stale or unparseable dates render nothing
 * (fail closed), per the dormgear review-hardened fix.
 */

import { B2S_RAIL } from "@/config/b2s-rail";
import { getGuideBySlug } from "@/lib/guides";
import { isRailHoldout } from "./rail-holdout";

export interface RailPromo {
  heading: string;
  productName: string;
  note: string;
  cta: string;
  asin: string;
  /**
   * ascsubtag for /go/ attribution. Deliberately distinct from
   * SeasonalB2SRail's `rail_b2s_{key}` scheme (`rail_v2_{key}`) even though
   * both surfaces borrow the same B2S_RAIL entry — the in-flow block and the
   * rail card are separate CTAs with separate placements, and sharing a
   * subtag would collide their revenue attribution into one bucket, making
   * it impossible to measure the rail's incremental lift. See also: the
   * in-flow block hides at xl+ (page.tsx) so the two CTAs are never both
   * live in the same viewport, but the subtag stays distinct regardless
   * since both render in SSR HTML.
   */
  subtag: string;
  fromGuideSlug: string;
  fromGuideTitle: string;
  /** ISO date string, only when the source guide's lastProductCheck is on
   * record and within the 30-day freshness window. Undefined otherwise. */
  pricesCheckedDate?: string;
}

const FRESHNESS_WINDOW_DAYS = 30;

/** True when `iso` parses to a real date within [now - 30d, now] (UTC calendar). */
function isFreshDate(iso: string | undefined, now: Date): boolean {
  if (!iso) return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  const diffDays = (now.getTime() - parsed.getTime()) / 86_400_000;
  return diffDays >= 0 && diffDays <= FRESHNESS_WINDOW_DAYS;
}

/**
 * Resolve the seasonal rail card for a page, or null when the card should not
 * render (kill-switch off, held out, or no B2S_RAIL entry for this slug).
 */
export function getRailPromo(pageSlug: string, now: Date = new Date()): RailPromo | null {
  if (process.env.NEXT_PUBLIC_SEASONAL_PROMO?.trim() !== "1") return null;

  // Rail-only gate — SeasonalB2SRail (the in-flow surface) is never checked
  // against this holdout, so held-out pages keep their in-flow block.
  if (isRailHoldout(pageSlug)) return null;

  const entry = B2S_RAIL[pageSlug];
  if (!entry) return null;
  const card = entry.cards[0];
  if (!card) return null;

  const fromGuide = getGuideBySlug(card.fromGuide.slug);
  const pricesCheckedDate = isFreshDate(fromGuide?.lastProductCheck, now)
    ? fromGuide!.lastProductCheck
    : undefined;

  return {
    heading: entry.heading,
    productName: card.name,
    note: card.note,
    cta: card.cta,
    asin: card.asin,
    subtag: `rail_v2_${entry.key}`,
    fromGuideSlug: card.fromGuide.slug,
    fromGuideTitle: card.fromGuide.title,
    pricesCheckedDate,
  };
}
