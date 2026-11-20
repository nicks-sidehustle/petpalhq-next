/**
 * rail-promo.ts — resolves the seasonal RAIL CARD's content for a guide page.
 *
 * Ported from SmartHomeExplorer/DormGearHQ's "Rail v2" seasonal-promo
 * resolver, adapted to PetPalHQ's data model. PetPalHQ has no contextual
 * product-pool infrastructure, so the card never introduces a product: it
 * shows a current pick from one of PetPalHQ's own guides (no invented ASINs).
 *
 * SEASONS (owner 2026-11-19): the card is data-driven by
 * src/config/seasonal-rail.ts — label, `rail_v2_<key>` subtag, a UTC date
 * window checked at BUILD time, and a generated page → {fromGuide, asin} map.
 *
 * Gating (rail card only — never the in-flow SeasonalB2SRail block):
 *   1. NEXT_PUBLIC_SEASONAL_PROMO === '1' kill-switch (unchanged; set "0" or
 *      unset it to turn every seasonal rail card off).
 *   2. A season whose window contains the build time.
 *   3. rail-holdout.ts's ~10% deterministic holdout.
 *   4. The page slug has an entry in that season's map.
 *   5. FAIL CLOSED: the entry's pick must still be a current, eligible pick
 *      of its source guide (seasonal-rail-eligibility.ts) with a usable
 *      verdict sentence. A pick that went dark, was replaced or changed its
 *      verdict since the map was generated drops the card.
 *
 * CONTENT (owner 2026-11-19): no price figure, no price positioning, no
 * availability language, so no "Prices checked" line either. Product name and
 * note (the verdict's first sentence, verbatim) come from current frontmatter.
 *
 * ATTRIBUTION: `rail_v2_<season key>` subtag + CLL position `rail_v2`,
 * distinct from SeasonalB2SRail's `rail_b2s_{key}`.
 */

import { getActiveRailSeason } from "@/config/seasonal-rail";
import { getGuideBySlug, slugifyHeading } from "@/lib/guides";
import { isRailHoldout } from "./rail-holdout";
import { isCleanCardText, isEligibleSeasonalPick, seasonalNoteFromVerdict } from "./seasonal-rail-eligibility";

export interface RailPromo {
  /** Season eyebrow, e.g. "Black Friday week". */
  label: string;
  productName: string;
  note: string;
  cta: string;
  asin: string;
  /** ascsubtag for /go/ attribution: `rail_v2_<season key>`. */
  subtag: string;
  fromGuideSlug: string;
  fromGuideTitle: string;
  /** Anchor of the pick's deep dive on the source guide. */
  fromGuideAnchor: string;
}

/**
 * Resolve the seasonal rail card for a page, or null when the card should not
 * render (kill-switch off, no active season, held out, no map entry, or the
 * mapped pick is no longer eligible).
 */
export function getRailPromo(pageSlug: string, now: Date = new Date()): RailPromo | null {
  if (process.env.NEXT_PUBLIC_SEASONAL_PROMO?.trim() !== "1") return null;

  const season = getActiveRailSeason(now);
  if (!season) return null;

  if (isRailHoldout(pageSlug)) return null;

  const card = season.cards[pageSlug];
  if (!card) return null;

  const fromGuide = getGuideBySlug(card.fromGuide);
  const pick = fromGuide?.picks?.find((p) => p.asin === card.asin);
  if (!fromGuide || !isCleanCardText(fromGuide.title) || !isEligibleSeasonalPick(pick)) return null;
  const note = seasonalNoteFromVerdict(pick.verdict);
  if (!note) return null;

  return {
    label: season.label,
    productName: pick.name,
    note,
    cta: season.cta,
    asin: pick.asin!,
    subtag: `rail_v2_${season.key}`,
    fromGuideSlug: fromGuide.slug,
    fromGuideTitle: fromGuide.title,
    fromGuideAnchor: slugifyHeading(pick.name),
  };
}
