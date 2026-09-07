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
 *   - ASINs are collected from every guide's `picks[]` AND `suppressedPicks[]`
 *     via getAllGuides() (src/lib/guides.ts) — the exact same source
 *     /api/cron/refresh-prices already uses, and the same concurrency/stagger
 *     budget (5 concurrent, 1.1s between batch launches) that route already
 *     proves safe. Both lists, because suppression is meant to be SELF-HEALING
 *     and this is the only script that persists the snapshot (see collectAsins).
 *
 * What it does:
 *   1. Collects every unique ASIN across all guides' picks[] + suppressedPicks[].
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
import { isDisclosableBackorder, isSnapshotUnbuyable } from '../src/lib/price-cache';

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
   * Buy-Box seller of record, captured on the same read as price and
   * availability. The 2026-08-18 backorder ruling turns on it: an
   * AVAILABLE_DATE offer sold BY AMAZON renders as a disclosed buyable pick,
   * the same state from a third-party seller stays suppressed. Written
   * together so a seller value can never be paired with a differently-aged
   * availability value.
   */
  merchantId?: string | null;
  merchantName?: string | null;
  /**
   * List/typical price + basis + savings percent, per the 2026-09-01/02
   * owner PRICE-BASIS ruling: the Creators API `price` is the buy-box price,
   * never the list price; `savingBasis` is the only field that carries a
   * list/typical price, captured on the same read as `price` above so the
   * two never desync. Written as explicit `null` (not omitted) when the
   * listing carries no savingBasis, so a builder reading this row can tell
   * "checked, no list price" from "never checked" (an absent key, on rows
   * written before this field existed).
   */
  listPrice?: string | null;
  listPriceBasis?: string | null;
  savingsPercent?: number | null;
  /**
   * Issue #91 hardening marker: set when this run's fetch for the ASIN
   * failed and the entry was RETAINED from the previous sync instead of
   * being dropped. Cleared automatically (field simply absent) the next
   * time a fresh fetch for this ASIN succeeds. price-cache.ts's reader
   * ignores unknown fields, so this is additive and non-breaking.
   */
  stale?: boolean;
  /**
   * TWO-READ HYSTERESIS marker (#649 class). ISO timestamp of the FIRST sync
   * read that contradicted a buyable row by reading back unbuyable. While this
   * is set the row still carries its last CONFIRMED price/availability/seller,
   * so every gate downstream still sees a buyable row. See applyFetchResults().
   */
  pendingUnbuyableSince?: string | null;
  /**
   * ISO timestamp of the latest read on a HELD row. `lastChecked` stays at the
   * last CONFIRMED read on such rows, so this is the only record that the row
   * was re-read at all.
   */
  lastReadAt?: string | null;
}

export type PriceCache = Record<string, CachedPriceEntry>;

/**
 * How long a first contradicting read must stand before a buyable -> unbuyable
 * flip is applied.
 *
 * CADENCE THIS IS SIZED AGAINST — there is no weekly cron. Owner ruling R-P1
 * (2026-09-01,
 * affiliate-site-template/programs/2026-09-multisite-conversion/KICKOFF-petpal.md:65,
 * under the class-wide 08-25 "no scheduled
 * writers" ruling) makes this sync MANUAL: it runs at the START of every petpal
 * session plus the Mon/Thu refresh cadence, each run proposing its own PR that
 * a human merges. `.github/workflows/weekly-price-sync.yml` is
 * `workflow_dispatch`-only for exactly that reason. So the RELEASE read is the
 * next manual run — 12h is chosen to be shorter than the shortest realistic gap
 * between two of those runs (a session start and the next day's cadence run),
 * so a genuine delisting confirms on the very next dispatch, and long enough
 * that two reads inside one flaky API window cannot both count.
 *
 * Because release depends on a human merging the marker-bearing PR, the marker
 * count is surfaced in this script's summary AND in the workflow's PR body — a
 * marker-only diff is load-bearing, not a no-op, and a reviewer has to be able
 * to see that.
 */
export const PENDING_UNBUYABLE_HOLD_MS = 12 * 60 * 60 * 1000;

/**
 * HARD CEILING on a hold: once `pendingUnbuyableSince` is this old, an
 * unbuyable read is applied. MARKER AGE IS THE ONLY CLOCK — see below.
 *
 * WHAT THIS DELIBERATELY IS NOT (W4 fix cycle 2, 2026-09-07). Cycle 1 added a
 * second limb that released on the age of the last CONFIRMED read
 * (`lastChecked`) with no marker required, meaning to break the loop M2
 * describes. It was REMOVED as a regression, and the reasoning is worth keeping
 * because the same idea will look attractive again:
 *
 *   `lastChecked` in `main` advances only when a sync PR is MERGED, so its age
 *   measures OUR MERGE CADENCE, not anything about the listing. Replayed
 *   against the committed snapshot, 992 of 1,039 rows share
 *   `lastChecked: 2026-09-03` and cross 7d together on 2026-09-10 — so a single
 *   dispatch two days late turned the guard off for the entire corpus at once
 *   (901 plainly-buyable rows suppressed on ONE read, reported as confirmed
 *   flips). Worse, a row's `lastChecked` goes stale precisely BECAUSE its reads
 *   keep failing (`stale: true` rows are the oldest), so the limb stripped
 *   two-read protection from exactly the high-noise rows the hold exists for.
 *   Freshness debt is an argument for re-reading a row, never for trusting one
 *   contradicting read of it.
 *
 * So a row that has never been held still gets its first hold no matter how old
 * its data is; only a hold ALREADY RUNNING is bounded.
 *
 * THE RESIDUAL EXPOSURE, STATED PLAINLY: because this sync is manual and
 * PR-gated (R-P1), a marker only reaches the next run if a human merged the PR
 * carrying it. If those PRs are never merged, every run holds from read one and
 * this ceiling — which measures marker age — never fires. That is a PROCESS
 * exposure, not a code one, and the fix for it is process: the `held` count and
 * the held ASIN list now appear in this script's summary and in the workflow's
 * PR body (M2.ii) precisely so an unmerged marker diff is visible rather than
 * silent. It is deliberately NOT patched with another time-based release; every
 * such release re-opens the single-read suppression this whole change exists to
 * close.
 */
export const PENDING_UNBUYABLE_MAX_HOLD_MS = 7 * 24 * 60 * 60 * 1000;

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
  // MUST walk suppressedPicks too, and this is the load-bearing reason:
  //
  // Suppression is designed to be self-healing — nothing is deleted from
  // frontmatter, so a pick returns by itself "on the next sync that shows
  // Amazon restocked it". That promise is only true if the sync still ASKS
  // about the ASIN. This script is the ONLY thing that writes
  // data/amazon-prices.json (/api/cron/refresh-prices deliberately returns
  // JSON without persisting), so an ASIN missing here is an ASIN whose
  // availability is frozen forever — and a suppressed pick whose availability
  // never refreshes is suppressed permanently, which is exactly the outcome
  // suppression was chosen over deletion to avoid.
  //
  // Measured: reading picks[] alone dropped 63 ASINs out of the weekly sync
  // the moment the dead-asins hard gate started suppressing (973 -> 910).
  // parseGuide() hands us the split, so this file had to change even though
  // the gate lives elsewhere.
  const guides = getAllGuides();
  const asinSet = new Set<string>();
  let suppressedAsins = 0;
  for (const guide of guides) {
    for (const pick of guide.picks ?? []) {
      if (pick.asin) asinSet.add(pick.asin);
    }
    for (const pick of guide.suppressedPicks ?? []) {
      if (!pick.asin) continue;
      if (!asinSet.has(pick.asin)) suppressedAsins++;
      asinSet.add(pick.asin);
    }
  }
  console.log(
    `[sync-amazon-prices] ${guides.length} guides -> ${asinSet.size} unique ASINs ` +
      `(${suppressedAsins} of them reachable only via suppressedPicks — kept so suppression can self-heal)`,
  );
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
  /** Buyable -> unbuyable flips NOT applied this run, awaiting a second read. */
  held: number;
  /** Held flips applied this run because the first read is >= 12h old. */
  confirmedUnbuyable: number;
  /**
   * Pending markers dropped this run WITHOUT the flip being confirmed —
   * because the row read back buyable, or because the prior row was no longer
   * the plainly-buyable state the marker was protecting. A confirmed flip
   * drops its marker too but counts under `confirmedUnbuyable`, so every
   * marker that disappears is accounted for under exactly one of the two.
   */
  cleared: number;
  /** ASINs in the `held` bucket, for the run log. */
  heldAsins: string[];
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
 *
 * TWO-READ HYSTERESIS — #649 class (2026-09-07). Issue #91 above covers the
 * failure shapes where a read yields NO price. It does not cover the shape
 * that actually suppressed 11 petpal picks in #649: a perfectly well-formed
 * 200 that carries a price and an availability of OUT_OF_STOCK / UNAVAILABLE /
 * third-party AVAILABLE_DATE for a listing that is, in fact, still buyable.
 * That single read used to remove the buy path from every guide citing the
 * ASIN outright (today's session-start sync produced 18 such buyable ->
 * unbuyable flips from single reads).
 *
 * So a buyable -> unbuyable flip now needs TWO reads that agree:
 *
 *   1st contradicting read  the flip is HELD. The row keeps its last CONFIRMED
 *                           price, availability, seller and lastChecked, and
 *                           gains `pendingUnbuyableSince` = this run's ISO
 *                           stamp plus `lastReadAt`. Every gate downstream
 *                           still reads a buyable row, because every field a
 *                           gate reads is unchanged.
 *   2nd, >= 12h later       the flip is APPLIED and the marker dropped. A real
 *                           delisting persists; a transient API miss does not.
 *   any buyable read        the marker is dropped — positive evidence wins.
 *
 * Asymmetric on purpose. Unbuyable -> BUYABLE applies on the first read: that
 * direction restores a conversion path on positive evidence, and the cost of
 * being wrong is a reader seeing a live CTA on a product Amazon just sold out
 * of, not a cited page silently losing its buy path. Rows with no prior entry
 * keep the pre-hysteresis behavior — there is no buyable state to protect.
 *
 * `runAt` is injected rather than read from the clock so the hold window is
 * testable; it defaults to now for the real sync.
 */
/**
 * Is this row the state the hold exists to protect — a priced, in-stock-now
 * listing a reader can buy today with no caveat attached?
 *
 * W4 M1 (2026-09-07) narrowed the hold to exactly this. The first cut held any
 * row `isSnapshotUnbuyable()` called buyable, and that set includes the
 * DISCLOSABLE BACKORDER carved out by the 2026-08-18 ruling: an Amazon-sold,
 * priced AVAILABLE_DATE row. Holding one of those retains
 * `availability: AVAILABLE_DATE` and `merchantId: ATVPDKIKX0DER`, which keeps
 * backorderDisclosureLabel() (src/lib/price-cache.ts:257, rendered from
 * src/lib/guides.ts:764) telling the reader "On backorder at Amazon — you can
 * order it now" for the whole window, after the freshest read said the offer
 * is gone or the buy box moved to a third party. That is an AFFIRMATIVE
 * orderability-and-seller claim the current evidence contradicts, and WHO is
 * selling is precisely what the backorder ruling turns on.
 *
 * A plain IN_STOCK hold does not have that problem: retaining the last
 * confirmed price alongside its own `lastChecked` is internally honest and
 * asserts nothing beyond "this is what we last saw". So the hold covers that
 * case and only that case. A prior backorder-class row reading unbuyable is
 * applied IMMEDIATELY — it was already a degraded state, and suppression is
 * the honest answer for it, not a preserved disclosure.
 *
 * The price requirement is the same one isDisclosableBackorder() uses: a row
 * with nothing to render has no buy path worth protecting.
 */
function isPlainlyBuyable(entry: CachedPriceEntry): boolean {
  return !!entry.price && !isSnapshotUnbuyable(entry) && !isDisclosableBackorder(entry);
}

export function applyFetchResults(
  previousCache: PriceCache,
  results: FetchOutcome[],
  runAt: string = new Date().toISOString(),
): ApplyFetchResultsSummary {
  const output: PriceCache = { ...previousCache };
  const runAtMs = Date.parse(runAt);
  // FAIL LOUDLY. Every release decision below is arithmetic on this timestamp;
  // a NaN here would silently turn the hold into a permanent one (the worst
  // failure this function has, since it keeps a dead listing's buy path alive).
  // Refusing to run is strictly better than running with release disabled.
  if (!Number.isFinite(runAtMs)) {
    throw new Error(
      `[sync-amazon-prices] applyFetchResults: runAt is not a parseable ISO timestamp: ${JSON.stringify(runAt)}. ` +
        'Refusing to run — the two-read hysteresis cannot release a held row without a usable clock.',
    );
  }
  let succeeded = 0;
  let retained = 0;
  let dropped = 0;
  let held = 0;
  let confirmedUnbuyable = 0;
  let cleared = 0;
  const heldAsins: string[] = [];

  for (const r of results) {
    if (r.ok && r.result.price) {
      const fresh: CachedPriceEntry = {
        price: r.result.price,
        lastChecked: r.result.lastChecked,
        availability: r.result.availability,
        merchantId: r.result.merchantId,
        merchantName: r.result.merchantName,
        listPrice: r.result.listPrice,
        listPriceBasis: r.result.listPriceBasis,
        savingsPercent: r.result.savingsPercent,
      };

      const prior = previousCache[r.asin];
      const freshUnbuyable = isSnapshotUnbuyable(fresh);
      const priorMarker = prior?.pendingUnbuyableSince ?? null;

      // Positive evidence, or no PLAINLY-BUYABLE prior state to protect: apply
      // as-is. The fresh object carries no `pendingUnbuyableSince`, so writing
      // it is also how a marker gets dropped.
      if (!prior || !freshUnbuyable || !isPlainlyBuyable(prior)) {
        if (priorMarker) {
          cleared++;
          console.log(
            `[sync-amazon-prices] ${r.asin} -> clearing pending-unbuyable marker set ${priorMarker} ` +
              `(${!freshUnbuyable ? 'reads BUYABLE again' : 'prior row is no longer the plainly-buyable state the marker protected'})`,
          );
        }
        succeeded++;
        output[r.asin] = fresh;
        continue;
      }

      // prior was PLAINLY buyable, fresh read says unbuyable.
      let pendingSince = priorMarker;
      let pendingSinceMs = pendingSince ? Date.parse(pendingSince) : NaN;

      // A marker we cannot read is not evidence of anything, and must never be
      // evidence of a hold that outlives the window. Both bad shapes re-seed to
      // this run, so the row gets a full — but bounded — fresh window instead
      // of an unbounded one.
      if (pendingSince && !Number.isFinite(pendingSinceMs)) {
        console.warn(
          `[sync-amazon-prices] ${r.asin} -> pendingUnbuyableSince is not a parseable timestamp (${JSON.stringify(pendingSince)}); ` +
            're-seeding it to this run so the 12h window can actually expire.',
        );
        pendingSince = null;
        pendingSinceMs = NaN;
      } else if (pendingSince && pendingSinceMs > runAtMs) {
        console.warn(
          `[sync-amazon-prices] ${r.asin} -> pendingUnbuyableSince ${pendingSince} is in the FUTURE relative to this run ` +
            `(${runAt}); clamping to this run — clock skew must not extend a hold past its window.`,
        );
        pendingSince = null;
        pendingSinceMs = NaN;
      }

      const ageMs = Number.isFinite(pendingSinceMs) ? runAtMs - pendingSinceMs : 0;
      const confirmed = Number.isFinite(pendingSinceMs) && ageMs >= PENDING_UNBUYABLE_HOLD_MS;

      // Hard ceiling — MARKER AGE ONLY. `prior.lastChecked` is deliberately not
      // consulted here: its age measures our merge cadence, not the listing.
      // See PENDING_UNBUYABLE_MAX_HOLD_MS for the corpus replay that removed it.
      const ceilingHit = Number.isFinite(pendingSinceMs) && ageMs >= PENDING_UNBUYABLE_MAX_HOLD_MS;

      if (confirmed || ceilingHit) {
        confirmedUnbuyable++;
        const ceilingHours = PENDING_UNBUYABLE_MAX_HOLD_MS / 3_600_000;
        const reason = ceilingHit
          ? `marker ${pendingSince} is past the ${ceilingHours}h hard ceiling`
          : `second read >=${PENDING_UNBUYABLE_HOLD_MS / 3_600_000}h after ${pendingSince}`;
        console.warn(
          `[sync-amazon-prices] ${r.asin} -> CONFIRMED unbuyable (availability=${fresh.availability ?? 'null'}); ` +
            `${reason} — applying the flip and clearing the marker`,
        );
        succeeded++;
        output[r.asin] = fresh;
        continue;
      }

      held++;
      heldAsins.push(r.asin);
      console.warn(
        `[sync-amazon-prices] ${r.asin} -> HELD: was buyable, read back unbuyable ` +
          `(availability=${fresh.availability ?? 'null'})${pendingSince ? ` and pending since ${pendingSince}` : ' on a single read'}. ` +
          `Keeping the last confirmed row; the flip needs a second read >=${PENDING_UNBUYABLE_HOLD_MS / 3_600_000}h later.`,
      );
      // `stale` RULE on a held row: neither set nor cleared — `{...prior}`
      // carries it if and only if the prior row already had it. Setting it
      // would double-count the row against the workflow's `stale` tally (a
      // held row's fetch SUCCEEDED; only its verdict was rejected), and
      // clearing it would erase the Issue #91 record that the retained PRICE
      // itself came from an earlier failed fetch. The two markers describe
      // different things and are tracked separately.
      output[r.asin] = {
        ...prior,
        pendingUnbuyableSince: pendingSince ?? runAt,
        lastReadAt: runAt,
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

  return { output, succeeded, retained, dropped, held, confirmedUnbuyable, cleared, heldAsins };
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

  const { output, succeeded, retained, dropped, held, confirmedUnbuyable, cleared, heldAsins } =
    applyFetchResults(previousCache, results);
  // `succeeded` counts rows actually WRITTEN, so a held row is neither a
  // success nor a failure — it is its own outcome. Every result lands in
  // exactly one of {succeeded, held, retained, dropped}, which is what makes
  // this arithmetic exact rather than a subtraction that quietly absorbs a
  // fourth category into "failed" (W4 m4).
  const failed = retained + dropped;
  console.log(
    `[sync-amazon-prices] Done. ${succeeded} written, ${held} held, ${failed} failed ` +
      `(${retained} retained from previous sync, ${dropped} had no prior entry). ` +
      `${Object.keys(output).length} total entries.`,
  );
  console.log(
    `[sync-amazon-prices] Two-read hysteresis: ${held} held pending-unbuyable (first read), ` +
      `${confirmedUnbuyable} confirmed unbuyable (second read >=12h), ${cleared} cleared.`,
  );
  if (heldAsins.length) {
    console.log(`[sync-amazon-prices] HELD ASINs (buy path preserved this run): ${heldAsins.join(', ')}`);
    // The marker-bearing PR is LOAD-BEARING. Release depends on the NEXT manual
    // run reading a marker that is actually in main (owner ruling R-P1 — this
    // sync is manual, PR-gated, human-merged), so a marker-only diff that gets
    // waved off as a no-op resets every hold to read one, forever.
    console.log(
      '[sync-amazon-prices] NOTE: those held rows exist ONLY in this run\'s diff. ' +
        'If this PR is not merged, their holds restart from scratch on the next run and no flip can ever confirm.',
    );
  }

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
