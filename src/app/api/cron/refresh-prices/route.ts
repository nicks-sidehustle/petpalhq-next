/**
 * POST /api/cron/refresh-prices
 *
 * Vercel Cron endpoint (schedule: every 6 hours).
 * Fetches current prices from Amazon Creators API for every ASIN across all
 * guides and returns a price-cache payload.
 *
 * Auth: CRON_SECRET env var checked via ?secret=... query param OR
 *       Authorization: Bearer <token> header.
 *
 * Persistence approach (v1):
 *   This endpoint fetches and returns prices but does NOT write to disk — Vercel
 *   serverless instances have ephemeral filesystems that do not persist between
 *   invocations. The returned JSON is the source of truth. To update rendered
 *   prices, save the response body to data/amazon-prices.json, commit, and redeploy.
 *
 *   The cron's value is fresh-price monitoring and on-demand price snapshots.
 *   Static renders fall back to frontmatter prices until a redeploy with updated
 *   data/amazon-prices.json occurs.
 *
 * Concurrency: 5 parallel requests, 1.1s stagger between launches to stay within
 *   Amazon's rate limits while keeping total wall-clock time to ~60s for ~270 picks.
 *   maxDuration: 300s is set in vercel.json as a safety margin.
 */

import { NextResponse } from 'next/server';
import { getAllGuides } from '@/lib/guides';
import { fetchAmazonPrice } from '@/lib/amazon-api';
import type { AmazonPriceResult } from '@/lib/amazon-api';

const CONCURRENCY = 5;
const STAGGER_MS = 1100; // 1.1s stagger between batch launches

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  // Check query param
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') === secret) return true;

  return false;
}

/** Run tasks in batches of `concurrency`, staggering launches by `staggerMs`. */
async function runBatched<T>(
  items: string[],
  concurrency: number,
  staggerMs: number,
  fn: (item: string) => Promise<T>,
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map((item, idx) =>
      new Promise<T>((resolve, reject) =>
        setTimeout(() => fn(item).then(resolve, reject), idx * staggerMs),
      ),
    );
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startMs = Date.now();

  // Collect all unique non-empty ASINs across all guides
  const guides = getAllGuides();
  const asinSet = new Set<string>();
  for (const guide of guides) {
    if (!guide.picks) continue;
    for (const pick of guide.picks) {
      if (pick.asin) asinSet.add(pick.asin);
    }
  }
  const asins = [...asinSet];

  console.log(`[refresh-prices] Found ${asins.length} unique ASINs across ${guides.length} guides`);

  let refreshed = 0;
  let failed = 0;
  const priceCache: Record<string, { price: string | null; lastChecked: string; availability: string | null }> = {};

  const results = await runBatched<AmazonPriceResult | { asin: string; error: string }>(
    asins,
    CONCURRENCY,
    STAGGER_MS,
    async (asin) => {
      try {
        const result = await fetchAmazonPrice(asin);
        console.log(
          `[refresh-prices] ${asin} → price=${result.price ?? 'null'} availability=${result.availability ?? 'null'}`,
        );
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[refresh-prices] ${asin} → ERROR: ${message}`);
        return { asin, error: message };
      }
    },
  );

  for (const result of results) {
    if ('error' in result) {
      failed++;
    } else {
      refreshed++;
      priceCache[result.asin] = {
        price: result.price,
        lastChecked: result.lastChecked,
        availability: result.availability,
      };
    }
  }

  const durationMs = Date.now() - startMs;
  console.log(`[refresh-prices] Done — refreshed=${refreshed} failed=${failed} durationMs=${durationMs}`);

  return NextResponse.json({
    refreshed,
    failed,
    durationMs,
    prices: priceCache,
  });
}
