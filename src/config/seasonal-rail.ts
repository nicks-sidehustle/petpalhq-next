/**
 * Seasonal rail card — season registry (owner 2026-11-19).
 *
 * The guide side rail's seasonal card (src/components/rail/SeasonalPromoRail.tsx)
 * is data-driven: each season carries its eyebrow label, the key used in the
 * `rail_v2_<key>` click subtag, a UTC date window and a page → card map.
 *
 * WINDOW = BUILD TIME. Guide pages are fully static (generateStaticParams, no
 * revalidate) and there is no runtime revalidation or cron (CLAUDE.md §4), so
 * the window is checked when `next build` runs. The card appears on the first
 * deploy built inside the window and DISAPPEARS ONLY AT THE FIRST DEPLOY BUILT
 * AFTER `endExclusiveUtc` — not automatically at midnight.
 *
 * CARD MAP = GENERATED. A season's `cards` come from a JSON file written by
 * scripts/generate-seasonal-rail.ts (the generator is the source; never hand-
 * edit the JSON). Each entry names only the source guide and the pick ASIN; the
 * product name, note and guide title are read from that guide's current
 * frontmatter at render, and a pick that has gone dark since generation drops
 * its card (fail closed) — see src/lib/content/rail-promo.ts.
 *
 * Back-to-school 2026 (src/config/b2s-rail.ts) is no longer a rail season: its
 * data stays intact and powers only the in-flow SeasonalB2SRail block, which is
 * gated on its own window (B2S_SEASON_END_UTC, ended after Labor Day 2026).
 */

import blackFriday2026Cards from "./seasonal-rail-black-friday-2026.json";

export type SeasonalRailCard = {
  /** Slug of the guide the pick comes from (today always the page's own guide). */
  fromGuide: string;
  /** A current, non-dark pick ASIN of `fromGuide` (gated in rail-promo.ts and the postbuild test). */
  asin: string;
};

export type SeasonalRailSeason = {
  /** Short key → click subtag `rail_v2_<key>`. */
  key: string;
  /** Card eyebrow. */
  label: string;
  /** Inclusive window start, ISO UTC. */
  startUtc: string;
  /** Exclusive window end, ISO UTC. */
  endExclusiveUtc: string;
  /** CTA button text. */
  cta: string;
  /** page slug → card. */
  cards: Record<string, SeasonalRailCard>;
};

export const BLACK_FRIDAY_WEEK_2026: SeasonalRailSeason = {
  key: "bfw26",
  label: "Black Friday week",
  // 2026-11-19 through 2026-12-01 (UTC), inclusive.
  startUtc: "2026-11-19T00:00:00Z",
  endExclusiveUtc: "2026-12-02T00:00:00Z",
  cta: "See it on Amazon",
  cards: blackFriday2026Cards as Record<string, SeasonalRailCard>,
};

export const SEASONAL_RAIL_SEASONS: readonly SeasonalRailSeason[] = [BLACK_FRIDAY_WEEK_2026];

/** The season whose window contains `now`, or null. */
export function getActiveRailSeason(now: Date = new Date()): SeasonalRailSeason | null {
  const t = now.getTime();
  for (const s of SEASONAL_RAIL_SEASONS) {
    if (t >= Date.parse(s.startUtc) && t < Date.parse(s.endExclusiveUtc)) return s;
  }
  return null;
}
