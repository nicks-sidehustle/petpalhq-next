/**
 * rail-holdout.ts — deterministic ~10% seasonal-rail HOLDOUT.
 *
 * Ported from SmartHomeExplorer's rail-holdout.ts (grid side-rail pilot /
 * "Rail v2"), via DormGearHQ's review-hardened port (PR #86). The seasonal
 * RAIL CARD (SeasonalPromoRail only — gated by NEXT_PUBLIC_SEASONAL_PROMO)
 * rolls out to every rail-eligible guide EXCEPT a stable ~10% holdout, so the
 * rail's lift can be measured against a clean control if/when an owner
 * declares a formal experiment. `isRailHoldout` is checked ONLY inside
 * SeasonalPromoRail.tsx (via rail-promo.ts's getRailPromo) — PetPalHQ's
 * existing in-flow surface, SeasonalB2SRail.tsx (src/components/guides/), is
 * NOT gated by this holdout and keeps rendering on its judgment-set slugs
 * regardless of a page's rail arm, so mobile/tablet readers always see it.
 *
 * ADAPTATION vs SHE/dormgear: this file carries ONLY the general broad-
 * rollout holdout mechanism — no nested treatment/control cohort layer.
 * Neither SHE's pre-declared E-001 experiment nor dormgear's are PetPalHQ
 * experiments; porting fabricated cohort slugs would be dishonest. If the
 * owner later wants a formal PetPalHQ rail experiment, add a cohort layer on
 * top of this file rather than editing the holdout logic in place.
 *
 * DETERMINISM: the hash is a pure function of the slug string — identical on
 * every machine and every deploy, so a page's arm never flips between builds.
 */

/**
 * FNV-1a 32-bit hash — deterministic, dependency-free, stable across machines
 * and deploys. Used only for bucketing (not security).
 */
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Rollout holdout fraction — bucket 0 of {@link HOLDOUT_MODULO} (~10%). */
export const HOLDOUT_MODULO = 10;

/**
 * True when a page slug is in the seasonal-rail HOLDOUT (no rail card
 * renders). Stable across deploys.
 */
export function isRailHoldout(slug: string): boolean {
  return fnv1a32(slug) % HOLDOUT_MODULO === 0; // broad ~10% rollout holdout
}
