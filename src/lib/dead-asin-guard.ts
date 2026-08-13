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
 *  - DEAD / NO-OFFER / NO-LISTING are a hard gate. As of the owner ruling of
 *    2026-08-12 that gate SUPPRESSES: parseGuide() moves the pick off the
 *    rendered roster entirely, exactly as the snapshot gate already did.
 *    Before that ruling the hard gate merely forced `available: false` and
 *    swapped the CTA for an honest "Currently unavailable on Amazon" label —
 *    which is the labelling the suppression law forbids ("an honest label
 *    where a top pick should be is worth nothing to a buyer"). The label
 *    helpers below are retained for reporting and for the AI-surface
 *    generator; nothing reader-facing renders them any more.
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

/**
 * `no_listing` (added 2026-08-12) covers picks that never had a resolvable
 * Amazon listing to check in the first place: their `asin` field carries a
 * SEARCH PHRASE, or is empty. Both §8m gates are keyed by ASIN and are
 * therefore structurally blind to them — a search phrase matches nothing in
 * the snapshot and nothing in this file — so they kept rendering as picks
 * while announcing their own unavailability in prose (the "7 unresolvable
 * picks" carried since 2026-08-10, plus the two fish-feeder picks with no
 * `asin` at all). They are keyed by PICK REFERENCE (`<slug>#<rank>`, see
 * pickRefKey) rather than by ASIN, because there is no ASIN to key by.
 */
export type DeadAsinStatus = 'dead' | 'no_offer' | 'used_buybox' | 'no_listing';

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

/**
 * Key for a pick that has no ASIN to key by. Deliberately NOT ASIN-shaped so
 * it can never collide with a real ASIN in the same object, and so
 * `isRealAsinKey` below can split the two namespaces cleanly.
 *
 * `rank` is authored in frontmatter and is stable across suppression (nothing
 * is deleted or renumbered), so it is a safe join key. validate-dead-asin-guard
 * asserts every pick-reference key still resolves to a real pick, so a roster
 * edit that invalidates one fails CI instead of silently un-suppressing.
 */
export function pickRefKey(slug: string, rank: number): string {
  return `${slug}#${rank}`;
}

/** True when a guard key names an ASIN rather than a pick reference. */
export function isRealAsinKey(key: string): boolean {
  return /^[A-Z0-9]{10}$/.test(key);
}

/**
 * Guard lookup for a pick: ASIN first, then the pick reference. The pick
 * reference is the escape hatch for picks with no resolvable ASIN — see the
 * `no_listing` note on DeadAsinStatus.
 */
export function getPickGuardEntry(
  asin: string | undefined,
  slug: string,
  rank: number,
): DeadAsinEntry | undefined {
  return getDeadAsinEntry(asin) ?? DEAD_ASINS[pickRefKey(slug, rank)];
}

/** True only for the hard-gate statuses — used_buybox stays buyable. */
export function isHardGateStatus(status: DeadAsinStatus): boolean {
  return status === 'dead' || status === 'no_offer' || status === 'no_listing';
}

/**
 * Honest-state CTA-REPLACEMENT label for a hard-gated pick (status "dead" or
 * "no_offer" only — never call this for "used_buybox", which isn't gated).
 * Mirrors the copy #61 established for manually-set `available: false`
 * picks, distinguishing DEAD (delisted — never coming back) from NO-OFFER
 * (temporarily out of stock).
 */
export function guardUnavailableLabel(entry: DeadAsinEntry): string {
  if (entry.status === 'dead') {
    return `No longer available on Amazon — delisted (checked ${entry.lastVerified})`;
  }
  if (entry.status === 'no_listing') {
    return `No identified Amazon listing (checked ${entry.lastVerified})`;
  }
  return `Currently unavailable on Amazon — checked ${entry.lastVerified}`;
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

/**
 * All ASINs the guard currently covers (used by the CI regression check).
 * Pick-reference keys are excluded — they are not ASINs and callers of this
 * function are all ASIN-keyed.
 */
export function allGuardedAsins(): string[] {
  return Object.keys(DEAD_ASINS).filter(isRealAsinKey);
}

export { DEAD_ASINS };
