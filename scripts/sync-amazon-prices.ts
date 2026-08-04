#!/usr/bin/env npx tsx
/**
 * Weekly Amazon Price Sync — PetPalHQ
 *
 * §2.7 port of dormgearhq-next/scripts/sync-amazon-prices.ts, adapted to
 * PetPalHQ's ACTUAL data shape rather than copied verbatim:
 *
 *   - PetPalHQ already has a self-contained Amazon Creators API client
 *     (src/lib/amazon-api.ts, single-ASIN fetchAmazonPrice()) and a build-time
 *     price-cache reader (src/lib/price-cache.ts, reads data/amazon-prices.json
 *     keyed by ASIN: { price, lastChecked, availability }). dormgear's script
 *     instead vendors the full Creators API SDK and writes a productId-keyed
 *     cache — that shape does not exist here, so this script reuses the
 *     existing petpal client/schema instead of inventing a new one.
 *   - ASINs are collected from every guide's `picks[]` via getAllGuides()
 *     (src/lib/guides.ts) — the exact same source /api/cron/refresh-prices
 *     already uses, and the same concurrency/stagger budget (5 concurrent,
 *     1.1s between batch launches) that route already proves safe.
 *
 * What it does:
 *   1. Collects every unique ASIN referenced across all guides' picks[].
 *   2. Fetches current price/availability per ASIN via fetchAmazonPrice().
 *   3. Writes data/amazon-prices.json keyed by ASIN.
 *
 * Hardening — dormgear Issue #91 (this is an INTENTIONAL improvement over the
 * dormgear original, which had no retain-on-failure and could silently drop
 * ASINs on a transient API error): the PREVIOUS cached entry for an ASIN is
 * retained (marked `stale: true`) rather than dropped whenever a fresh fetch
 * doesn't yield a usable price. This covers BOTH failure shapes:
 *   1. A thrown exception (network error, auth failure, non-2xx HTTP status).
 *   2. A "successful" 200 response that resolves with no usable price —
 *      fetchAmazonPrice() only throws on `!res.ok`; an empty or degraded
 *      `itemsResult.items` (temporary delisting blip, partial API outage,
 *      marketplace-schema drift) resolves NORMALLY with `price: null`. That
 *      is not a rejection, so it must be checked explicitly — treating only
 *      thrown errors as "failure" leaves exactly the silent-data-loss gap
 *      Issue #91 exists to close, just reached through a 200 instead of a
 *      4xx/5xx. A flaky-API day must never wipe price data outright, however
 *      it manifests.
 *
 * Usage:
 *   npx tsx scripts/sync-amazon-prices.ts
 *   npx tsx scripts/sync-amazon-prices.ts --dry-run
 *   npx tsx scripts/sync-amazon-prices.ts --dry-run --limit=5
 *
 * Requires AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET in environment (or
 * .env.local for local runs). Fails fast with a clear message if either is
 * missing — dormgear's first incarnation of this ran silently for 3 weeks
 * against a missing secret before anyone noticed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAllGuides } from '../src/lib/guides';
import { fetchAmazonPrice, type AmazonPriceResult } from '../src/lib/amazon-api';

// Load .env.local if present (mirrors dormgear's script — local runs outside
// the Next.js runtime don't get .env.local loaded automatically).
const envPath = path.join(import.meta.dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

// ─── Types (mirrors src/lib/price-cache.ts CachedPriceEntry) ──────────────────

export interface CachedPriceEntry {
  price: string;
  lastChecked: string;
  availability?: string | null;
  /**
   * Issue #91 hardening marker: set when this run's fetch for the ASIN
   * failed and the entry was RETAINED from the previous sync instead of
   * being dropped. Cleared automatically (field simply absent) the next
   * time a fresh fetch for this ASIN succeeds. price-cache.ts's reader
   * ignores unknown fields, so this is additive and non-breaking.
   */
  stale?: boolean;
}

export type PriceCache = Record<string, CachedPriceEntry>;

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROOT_DIR = path.join(import.meta.dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'amazon-prices.json');
const CONCURRENCY = 5;
const STAGGER_MS = 1100; // 1.1s stagger — matches /api/cron/refresh-prices budget

// ─── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(): { dryRun: boolean; limit?: number } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '', 10) : undefined;
  return { dryRun, limit: Number.isFinite(limit) ? limit : undefined };
}

// ─── Batch fetch helper (ported from /api/cron/refresh-prices/route.ts) ───────

async function runBatched<T>(
  items: string[],
  concurrency: number,
  staggerMs: number,
  fn: (item: string) => Promise<T>,
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map(
      (item, idx) =>
        new Promise<T>((resolve, reject) =>
          setTimeout(() => fn(item).then(resolve, reject), idx * staggerMs),
        ),
    );
    results.push(...(await Promise.all(batchPromises)));
  }

  return results;
}

// ─── ASIN collection ────────────────────────────────────────────────────────────

function collectAsins(): string[] {
  const guides = getAllGuides();
  const asinSet = new Set<string>();
  for (const guide of guides) {
    if (!guide.picks) continue;
    for (const pick of guide.picks) {
      if (pick.asin) asinSet.add(pick.asin);
    }
  }
  console.log(`[sync-amazon-prices] ${guides.length} guides -> ${asinSet.size} unique ASINs`);
  return [...asinSet];
}

// ─── Retain-on-failure aggregation (pure, unit-testable — no network) ─────────

export type FetchOutcome =
  | { asin: string; ok: true; result: AmazonPriceResult }
  | { asin: string; ok: false; error: string };

export interface ApplyFetchResultsSummary {
  output: PriceCache;
  succeeded: number;
  retained: number;
  dropped: number;
}

/**
 * Merges a batch of fetch outcomes into the previous price cache.
 *
 * A result only counts as a success — and overwrites the cached entry — when
 * it resolved AND carries a non-empty price. Everything else (a thrown
 * exception, or an `ok: true` result whose `price` is null/empty because
 * Amazon returned a 200 with no usable item data) falls into the SAME
 * retain-on-failure branch: the previous entry is kept and marked
 * `stale: true` rather than being overwritten with an empty price. This is
 * the dormgear Issue #91 guarantee — extended to cover the empty-200 case a
 * plain try/catch around the fetch cannot see.
 */
export function applyFetchResults(
  previousCache: PriceCache,
  results: FetchOutcome[],
): ApplyFetchResultsSummary {
  const output: PriceCache = { ...previousCache };
  let succeeded = 0;
  let retained = 0;
  let dropped = 0;

  for (const r of results) {
    if (r.ok && r.result.price) {
      succeeded++;
      output[r.asin] = {
        price: r.result.price,
        lastChecked: r.result.lastChecked,
        availability: r.result.availability,
      };
      continue;
    }

    if (!r.ok) {
      console.error(`[sync-amazon-prices] ${r.asin} -> ERROR (retaining existing entry if any): ${r.error}`);
    } else {
      console.warn(
        `[sync-amazon-prices] ${r.asin} -> resolved with no usable price (200 response, empty/degraded item data) — retaining existing entry if any`,
      );
    }

    // Issue #91 hardening: RETAIN the previous entry (marked stale) instead
    // of overwriting it with an empty price. A transient failure — thrown or
    // silently-empty-but-200 — must never wipe that product's price data.
    const existing = previousCache[r.asin];
    if (existing) {
      output[r.asin] = { ...existing, stale: true };
      retained++;
    } else {
      dropped++;
      console.warn(`[sync-amazon-prices] ${r.asin} -> no prior entry to retain; leaving unset`);
    }
  }

  return { output, succeeded, retained, dropped };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs();

  console.log('[sync-amazon-prices] Starting weekly price sync...');
  if (dryRun) console.log('[sync-amazon-prices] DRY RUN — no file will be written');

  // Fail fast on missing credentials — never silently no-op. This exact
  // failure mode (missing secret, no error, no output) is what broke
  // dormgear's sync for 3 weeks before it was noticed.
  if (!process.env.AMAZON_CLIENT_ID || !process.env.AMAZON_CLIENT_SECRET) {
    console.error(
      '[sync-amazon-prices] ERROR: AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET must be set.\n' +
        'Set them in .env.local for local runs, or as repo secrets ' +
        '(Settings -> Secrets and variables -> Actions) for the GitHub Action.',
    );
    process.exit(1);
  }

  let asins = collectAsins();
  if (limit !== undefined && limit > 0) {
    asins = asins.slice(0, limit);
    console.log(`[sync-amazon-prices] --limit=${limit}: syncing first ${asins.length} ASIN(s) only`);
  }

  if (asins.length === 0) {
    console.log('[sync-amazon-prices] No ASINs found across guides. Exiting.');
    process.exit(0);
  }

  const previousCache: PriceCache = fs.existsSync(OUTPUT_PATH)
    ? (JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) as PriceCache)
    : {};

  const results = await runBatched<FetchOutcome>(asins, CONCURRENCY, STAGGER_MS, async (asin) => {
    try {
      const result = await fetchAmazonPrice(asin);
      console.log(
        `[sync-amazon-prices] ${asin} -> price=${result.price ?? 'null'} availability=${result.availability ?? 'null'}`,
      );
      return { asin, ok: true, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { asin, ok: false, error: message };
    }
  });

  const { output, succeeded, retained, dropped } = applyFetchResults(previousCache, results);
  const failed = results.length - succeeded;
  console.log(
    `[sync-amazon-prices] Done. ${succeeded} succeeded, ${failed} failed ` +
      `(${retained} retained from previous sync, ${dropped} had no prior entry). ` +
      `${Object.keys(output).length} total entries.`,
  );

  if (dryRun) {
    console.log('[sync-amazon-prices] DRY RUN — not writing to disk.');
    const preview = Object.entries(output).slice(0, 5);
    for (const [asin, entry] of preview) {
      console.log(`  ${asin}: ${entry.price || '(no price)'} (${entry.availability ?? 'unknown'})${entry.stale ? ' [STALE]' : ''}`);
    }
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`[sync-amazon-prices] Written to ${OUTPUT_PATH}`);
}

// Only run main() when this file is executed directly (npx tsx
// scripts/sync-amazon-prices.ts), not when it's imported for testing (e.g.
// importing applyFetchResults in a verification harness) — otherwise every
// import would trigger a live sync as a side effect.
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main().catch((err) => {
    console.error('[sync-amazon-prices] Fatal error:', err);
    process.exit(1);
  });
}
