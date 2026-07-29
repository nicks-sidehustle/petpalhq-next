import deadAsinsRaw from '../../data/dead-asins.json';

/**
 * §8m dead-ASIN guard (2026-07-29 full-corpus liveness sweep).
 *
 * data/dead-asins.json is the generator-input source of truth: every ASIN a
 * live Amazon Creators API check found delisted, out-of-stock/unavailable, or
 * resolving to a used Buy Box behind a new-titled pick. This module is the
 * ONE place that consults that file. parseGuide()/parsePicks() in guides.ts
 * call getDeadAsinEntry() while hydrating every pick from frontmatter.
 *
 * Two distinct treatments, NOT one:
 *  - DEAD / NO-OFFER (73 ASINs) are a hard gate: `available` is forced false,
 *    which activates the #61 honest-state rendering (FeaturedPicksGrid,
 *    PickDeepDive, GuideComparisonTable, PickAuthoritySources,
 *    buildPickProductReviewGraph, the auto-linker safety net) site-wide,
 *    without editing every guide's frontmatter by hand.
 *  - USED-BUYBOX (7 ASINs) is NOT a gate — those ASINs are live/purchasable
 *    per the sweep (the API's `condition` field is truthful, the guide copy
 *    just doesn't disclose it). Gating them would fabricate an
 *    OutOfStock/CTA-removed claim on a real, working conversion path. They
 *    keep `available` untouched and get a non-blocking guardDisclosure
 *    caption instead (see guardDisclosureLabel below) — CTA, InStock, and
 *    citations all stay live.
 *
 * See ASIN-LIVENESS-SWEEP-2026-07-29.md for the sweep methodology and full
 * findings.
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

/** True if this ASIN has ANY guard entry (dead, no_offer, OR used_buybox). */
export function isGuardedAsin(asin?: string): boolean {
  return getDeadAsinEntry(asin) !== undefined;
}

/** True only for the hard-gate statuses — used_buybox stays buyable. */
export function isHardGateStatus(status: DeadAsinStatus): boolean {
  return status === 'dead' || status === 'no_offer';
}

/**
 * Honest-state CTA-REPLACEMENT label for a hard-gated pick (status "dead" or
 * "no_offer" only — never call this for "used_buybox", which isn't gated).
 * Mirrors the copy #61 established for manually-set `available: false`
 * picks, distinguishing DEAD (delisted — never coming back) from NO-OFFER
 * (temporarily out of stock).
 */
export function guardUnavailableLabel(entry: DeadAsinEntry): string {
  return entry.status === 'dead'
    ? `No longer available on Amazon — delisted (checked ${entry.lastVerified})`
    : `Currently unavailable on Amazon — checked ${entry.lastVerified}`;
}

/**
 * Non-blocking disclosure caption for a "used_buybox" pick (status
 * "used_buybox" only). Rendered ALONGSIDE the still-live CTA, not instead of
 * it — the §8l mirror defect: the API's condition field truthfully says
 * "Used" on the current Buy Box winner, but the guide presents the pick as
 * new-condition with no disclosure. This surfaces that honestly without
 * killing the conversion path.
 */
export function guardDisclosureLabel(entry: DeadAsinEntry): string {
  return `May ship from a used-condition listing — verify condition before buying (checked ${entry.lastVerified})`;
}

/** All ASINs the guard currently covers (used by the CI regression check). */
export function allGuardedAsins(): string[] {
  return Object.keys(DEAD_ASINS);
}

export { DEAD_ASINS };
