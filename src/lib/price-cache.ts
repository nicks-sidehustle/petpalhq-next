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
