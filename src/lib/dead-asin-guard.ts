import deadAsinsRaw from '../../data/dead-asins.json';

/**
 * §8m dead-ASIN guard (2026-07-29 full-corpus liveness sweep).
 *
 * data/dead-asins.json is the generator-input source of truth: every ASIN a
 * live Amazon Creators API check found delisted, out-of-stock/unavailable, or
 * resolving to a used Buy Box behind a new-titled pick. This module is the
 * ONE place that consults that file. parseGuide()/parsePicks() in guides.ts
 * call getDeadAsinEntry() while hydrating every pick from frontmatter and
 * force `available: false` on a match — so the existing #61 honest-state
 * rendering (FeaturedPicksGrid, PickDeepDive, GuideComparisonTable,
 * PickAuthoritySources, buildPickProductReviewGraph, the auto-linker
 * safety net) applies automatically, site-wide, without editing every guide's
 * frontmatter by hand. See ASIN-LIVENESS-SWEEP-2026-07-29.md for the sweep
 * methodology and full findings.
 */

export type DeadAsinStatus = 'dead' | 'no_offer' | 'used_buybox';

export interface DeadAsinEntry {
  status: DeadAsinStatus;
  reason: string;
  lastVerified: string;
  guides: string[];
}

const DEAD_ASINS: Record<string, DeadAsinEntry> = deadAsinsRaw as Record<string, DeadAsinEntry>;

/** Looks up an ASIN in the guard payload. Returns undefined if it's clean. */
export function getDeadAsinEntry(asin?: string): DeadAsinEntry | undefined {
  if (!asin) return undefined;
  return DEAD_ASINS[asin];
}

/** True if this ASIN must never render as a live, buyable link anywhere. */
export function isGuardedAsin(asin?: string): boolean {
  return getDeadAsinEntry(asin) !== undefined;
}

/**
 * Honest-state CTA label for a guarded pick, mirroring the copy #61
 * established for manually-set `available: false` picks but distinguishing
 * DEAD (delisted — never coming back) from NO-OFFER (temporarily out of
 * stock) from USED-BUYBOX (listing resolves, but the live Buy Box winner is a
 * used-condition seller behind a new-titled pick — the §8l mirror defect).
 */
export function guardUnavailableLabel(entry: DeadAsinEntry): string {
  switch (entry.status) {
    case 'dead':
      return `No longer available on Amazon — delisted (checked ${entry.lastVerified})`;
    case 'used_buybox':
      return `Currently unavailable — active listing shows used condition (checked ${entry.lastVerified})`;
    case 'no_offer':
    default:
      return `Currently unavailable on Amazon — checked ${entry.lastVerified}`;
  }
}

/** All ASINs the guard currently covers (used by the CI regression check). */
export function allGuardedAsins(): string[] {
  return Object.keys(DEAD_ASINS);
}

export { DEAD_ASINS };
