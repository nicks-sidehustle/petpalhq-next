/**
 * Build-time price cache loader.
 *
 * Reads data/amazon-prices.json once at module init. For static/ISR pages this
 * means at `next build` time — prices are frozen in the bundle until next build.
 *
 * The cron endpoint (/api/cron/refresh-prices) fetches fresh prices and returns
 * them as JSON. To update rendered prices: save the cron output to
 * data/amazon-prices.json, commit, and redeploy.
 *
 * Graceful degradation: if the file is missing or malformed, all lookups return
 * null and pages render using frontmatter prices as fallback.
 */

import fs from 'fs';
import path from 'path';

export interface CachedPriceEntry {
  price: string;
  lastChecked: string;
  availability?: string | null;
}

type PriceCache = Record<string, CachedPriceEntry>;

let _cache: PriceCache | null = null;

function loadCache(): PriceCache {
  if (_cache !== null) return _cache;

  const filePath = path.join(process.cwd(), 'data', 'amazon-prices.json');

  try {
    if (!fs.existsSync(filePath)) {
      _cache = {};
      return _cache;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    _cache = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      ? (parsed as PriceCache)
      : {};
  } catch {
    // Malformed JSON or read error — degrade gracefully
    _cache = {};
  }

  return _cache;
}

/**
 * Returns the cached price for an ASIN, or null if not found.
 * Safe to call with undefined (e.g. picks without an ASIN).
 */
export function getCachedPrice(asin: string | undefined): CachedPriceEntry | null {
  if (!asin) return null;
  const cache = loadCache();
  const entry = cache[asin];
  if (!entry || !entry.price) return null;
  return entry;
}

/**
 * §8m snapshot availability gate (2026-08-10 price-desync triage).
 *
 * The dead-ASIN guard (src/lib/dead-asin-guard.ts) only knows the statuses
 * hand-recorded in data/dead-asins.json. The PRICE SNAPSHOT carries a second,
 * fresher liveness signal — the Creators API `availability` string captured on
 * every sync — and nothing consulted it. Result (measured 2026-08-10): 61 guide
 * pick rows across 53 distinct ASINs whose snapshot said "no buyable offer
 * today" were still sold as current picks with a live Buy CTA — plus a
 * cross-guide auto-link leak on top of that (see getSiteWideProductMap in
 * guide-links.ts). This predicate is the one place that decides, from the
 * snapshot
 * alone, whether an ASIN has a buyable offer right now.
 *
 * GATED (no buyable offer today):
 *  - AVAILABLE_DATE — Amazon has a future availability date, not an offer now.
 *  - OUT_OF_STOCK   — explicit.
 *  - UNAVAILABLE    — explicit (not currently present in the snapshot, gated
 *                     defensively so a future sync can't reopen the hole).
 *
 * NOT GATED (genuinely purchasable, just imperfect):
 *  - IN_STOCK         — obvious.
 *  - IN_STOCK_SCARCE  — low stock, but the Buy Box is live and converts today.
 *  - LEADTIME         — ships slowly, but the order is placeable today.
 *  - null / undefined / missing — the sync didn't report availability; absence
 *                     of evidence is not evidence of unavailability.
 * Gating scarce/leadtime would fabricate an OutOfStock claim and strip the CTA
 * off a real, working conversion path — the exact reasoning dead-asin-guard.ts
 * already documents for `used_buybox`. Do not "tighten" this list without a
 * live check proving the offer is actually gone.
 *
 * Case-insensitive and null-safe by design: the field is free-form API text.
 */
const UNBUYABLE_AVAILABILITY = new Set(['AVAILABLE_DATE', 'OUT_OF_STOCK', 'UNAVAILABLE']);

export function isUnbuyableAvailability(availability?: string | null): boolean {
  if (!availability) return false;
  return UNBUYABLE_AVAILABILITY.has(availability.trim().toUpperCase());
}

/**
 * Honest-state CTA-replacement label for a snapshot-gated pick.
 *
 * Deliberately worded from the snapshot facts only: "not buyable today, as of
 * the last sync". AVAILABLE_DATE/OUT_OF_STOCK say nothing about delisting, so
 * this must NEVER claim the product is gone for good — that's the dead-ASIN
 * guard's `dead` status, which has a live check behind it. Mirrors the wording
 * of guardUnavailableLabel()'s no_offer branch so the two gates read as one
 * consistent honest state.
 */
export function snapshotUnavailableLabel(entry: CachedPriceEntry): string {
  const date = (entry.lastChecked || '').slice(0, 10);
  return date
    ? `Currently unavailable on Amazon — checked ${date}`
    : 'Currently unavailable on Amazon';
}
