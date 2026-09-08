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
import { fetchAmazonPrice, nonNewOfferReason, type AmazonPriceResult } from '../src/lib/amazon-api';
import { isSnapshotUnbuyable } from '../src/lib/price-cache';
import { OVERRIDE_MAX_AGE_DAYS, type LiveReadOverride } from '../src/lib/dark-card';

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
 * HOLD-ONLY — owner ruling 2026-09-08, RUNBOOK §8rr.1 ("the two states DARK and
 * GONE are set ONLY by a live page read") and §8mm ("the API is a hint").
 *
 * WHAT CHANGED AND WHY. #160 gave a buyable -> unbuyable API read a HOLD and
 * then let a SECOND API read (>=12h later, or a 7d marker ceiling) CONFIRM the
 * flip. W4 on #168 measured what those confirmations actually were: the Creators
 * API returns a NON-FEATURED backorder offer for some ASINs while the live
 * page's featured offer is New and in stock, so a second read agrees with the
 * first for a reason that has nothing to do with the listing — 6 of 6 sampled
 * "two-read confirmed" flips were FALSE, and 16 flips in that PR were false
 * negatives against a live page. Two reads of the same wrong instrument are not
 * two pieces of evidence. So the API can no longer confirm anything:
 *
 *   buyable -> unbuyable API read   HELD, always, with no expiry. The row keeps
 *                                   its last CONFIRMED price/availability/seller
 *                                   and gains `pendingUnbuyableSince` +
 *                                   `lastReadAt`. The marker no longer means
 *                                   "a clock is running"; it means THIS ROW
 *                                   NEEDS A LIVE READ.
 *   unbuyable -> buyable API read   applied on the first read, unchanged.
 *                                   Positive evidence restores a conversion
 *                                   path; §8rr's "instruments never remove page
 *                                   elements" is one-directional by design.
 *   a LIVE PAGE READ                the only thing that applies a flip. See
 *                                   liveReadVerdict() below and
 *                                   scripts/record-live-read.ts, which is how a
 *                                   census/verifier lane feeds one in.
 *
 * The 12h window and the 7d marker ceiling are GONE, not lengthened. Both were
 * time-based releases on API evidence, and no amount of waiting makes an API
 * read a live read (memory: creators-api-not-found-is-not-delisted).
 */

/**
 * How long a live-read verdict stays authoritative: §8rr.3 — instrument
 * opinions, live reads included, expire at 7 days. Past that the override stops
 * confirming anything and the row simply stays held until someone reads the page
 * again. Same number as src/lib/dark-card.ts's OVERRIDE_MAX_AGE_DAYS, imported
 * rather than re-declared so the render layer and the sync can never disagree
 * about how old "too old" is.
 */
export const LIVE_READ_MAX_AGE_MS = OVERRIDE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * The live-read states that CONFIRM a dark card, in both fields the override
 * shape carries. `condition` is the field the record-live-read CLI writes;
 * `availability` is accepted too so a lane that only captured availability
 * still counts. Everything else — including "new" — is not a confirmation.
 */
const LIVE_READ_DARK_CONDITIONS = new Set(['unavailable', 'used-only', 'not-found']);
const LIVE_READ_DARK_AVAILABILITY = new Set(['OUT_OF_STOCK', 'UNAVAILABLE', 'USED_ONLY', 'NOT_FOUND']);

export type LiveReadVerdict = 'dark' | 'live-new' | 'none';

/**
 * What a live-read override says about an ASIN right now — the ONLY input in
 * this file that can make a row unbuyable.
 *
 * Returns 'none' for an absent, unparseable, future-dated or >7d-old override,
 * and 'none' is the safe answer: it leaves the row HELD, which keeps the card
 * and the /go/{ASIN} link exactly where they are (§8rr). An override can only
 * ever resolve a hold; it can never create one.
 */
export function liveReadVerdict(
  override: LiveReadOverride | null | undefined,
  runAtMs: number,
): { verdict: LiveReadVerdict; readAt: string | null; reason: string | null } {
  if (!override) return { verdict: 'none', readAt: null, reason: null };
  const readAt = override.readAt || null;
  const readAtMs = readAt ? Date.parse(readAt) : NaN;
  if (!Number.isFinite(readAtMs)) return { verdict: 'none', readAt, reason: 'unparseable readAt' };
  const ageMs = runAtMs - readAtMs;
  // A future-dated read is clock skew or a bad write, never fresher evidence.
  if (ageMs < 0) return { verdict: 'none', readAt, reason: 'readAt is in the future' };
  if (ageMs > LIVE_READ_MAX_AGE_MS) {
    return { verdict: 'none', readAt, reason: `live read is older than ${OVERRIDE_MAX_AGE_DAYS}d (§8rr.3)` };
  }

  const condition = (override.condition || '').trim().toLowerCase();
  const availability = (override.availability || '').trim().toUpperCase();
  if (LIVE_READ_DARK_CONDITIONS.has(condition) || LIVE_READ_DARK_AVAILABILITY.has(availability)) {
    return { verdict: 'dark', readAt, reason: condition || availability };
  }
  if (condition === 'new' || condition === 'live-new') {
    return { verdict: 'live-new', readAt, reason: condition };
  }
  return { verdict: 'none', readAt, reason: condition || availability || 'no state' };
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROOT_DIR = path.join(import.meta.dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'amazon-prices.json');
const LIVE_READ_OVERRIDES_PATH = path.join(ROOT_DIR, 'data', 'live-read-overrides.json');
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
  /**
   * Buyable -> unbuyable flips NOT applied this run, awaiting a LIVE PAGE READ.
   * No clock releases these — only scripts/record-live-read.ts output does.
   */
  held: number;
  /** Held flips applied this run because a live read <=7d old confirmed them. */
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
  /**
   * Reads withheld by the USED-PRICE GUARD — an offer whose condition, seller
   * or §8l title marker says it is not New. Counted separately from the plain
   * availability holds because the failure they prevent is different: not a
   * darkened card, but a USED price written into a New card's figure
   * (W4 #168, B00I9A8CW6 -> $45.99). Every one of these is also in `held`.
   */
  usedOnly: number;
  usedOnlyAsins: string[];
  /**
   * Held rows whose live-read override says LIVE-NEW: the API read is rejected
   * as a false negative, the confirmed buyable row is kept and the marker
   * dropped. Its own bucket so the run's arithmetic stays exact — every result
   * lands in exactly one of {succeeded, held, liveNewRejected, retained,
   * dropped}.
   */
  liveNewRejected: number;
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
 * HOLD-ONLY (2026-09-08 ruling, §8rr.1). Issue #91 above covers the failure
 * shapes where a read yields NO price. It does not cover the shape that
 * suppressed 11 petpal picks in #649 and produced 16 false flips in #168: a
 * perfectly well-formed 200 that carries a price and an availability of
 * OUT_OF_STOCK / UNAVAILABLE / third-party AVAILABLE_DATE — or a price off a
 * USED offer — for a listing whose live page shows a New, in-stock featured
 * offer. #160 answered that with a second API read; W4 showed the second read
 * repeats the first read's error (the API returns a non-featured backorder
 * offer for these ASINs, so it "agrees" for a reason unrelated to the listing:
 * 6/6 sampled confirmations were false). So:
 *
 *   API read, buyable -> unbuyable   HELD, with NO time-based release. The row
 *                                    keeps its last CONFIRMED price,
 *                                    availability, seller and lastChecked, and
 *                                    gains `pendingUnbuyableSince` +
 *                                    `lastReadAt`. Every gate downstream still
 *                                    reads a buyable row, because every field a
 *                                    gate reads is unchanged. The marker means
 *                                    "needs a live read", not "a clock is
 *                                    running".
 *   LIVE READ says unavailable /     the flip is APPLIED and the marker
 *   used-only / not-found, <=7d      dropped, logged `confirmed by live read
 *                                    <readAt>`. This is the ONLY path to an
 *                                    unbuyable row.
 *   LIVE READ says live-new, <=7d    the marker is dropped and the prior
 *                                    buyable row kept — positive live evidence
 *                                    ends a hold too.
 *   any buyable API read             the marker is dropped — positive evidence
 *                                    wins, unchanged from #160.
 *   NOT-NEW offer (used-price guard) the price is NOT written at any age. See
 *                                    nonNewOfferReason() in amazon-api.ts.
 *
 * Asymmetric on purpose. Unbuyable -> BUYABLE applies on the first read: that
 * direction restores a conversion path on positive evidence, and the cost of
 * being wrong is a reader seeing a live CTA on a product Amazon just sold out
 * of, not a cited page silently losing its buy path. Rows with no prior entry
 * keep the pre-hysteresis behavior — there is no buyable state to protect.
 *
 * `runAt` is injected rather than read from the clock so live-read expiry is
 * testable; it defaults to now for the real sync. `liveReads` is injected for
 * the same reason — main() loads data/live-read-overrides.json and passes it.
 */
/**
 * Is this row one a READER CURRENTLY SEES as a live, clickable card?
 *
 * Two states qualify, and W4 fix cycle 1 (2026-09-08) is why it is two and not
 * one:
 *   - a plain priced, in-stock row; and
 *   - a DISCLOSABLE BACKORDER — an Amazon-sold, priced AVAILABLE_DATE row,
 *     which the 2026-08-18 ruling renders as a buyable pick with a disclosure
 *     (isDisclosableBackorder, src/lib/price-cache.ts).
 *
 * The first cut of this file held only the first class, inheriting the earlier
 * M1 argument that holding a backorder row preserves an affirmative "you can
 * order it now at Amazon" claim the freshest read contradicts. That argument
 * does not survive §8rr.1: the "freshest read" contradicting it is an API read,
 * and an API read is a hint (§8mm) — the same hint that was wrong 16 times in
 * #168. Under the old branch a single API OUT_OF_STOCK darkened a rendering
 * backorder card with no live read at all, which is exactly the outcome this
 * change exists to make impossible. §8rr.1 has no backorder carve-out.
 *
 * So a backorder row is HELD like any other rendering row, and the live read
 * that resolves the hold is also what resolves the disclosure: if the page says
 * unavailable/used-only/not-found the flip applies and the disclosure goes with
 * it; if the page says live-new the disclosure was right all along.
 *
 * The price requirement is the same one isDisclosableBackorder() uses: a row
 * with nothing to render has no buy path worth protecting.
 */
function isRenderingRow(entry: CachedPriceEntry): boolean {
  return !!entry.price && !isSnapshotUnbuyable(entry);
}

export function applyFetchResults(
  previousCache: PriceCache,
  results: FetchOutcome[],
  runAt: string = new Date().toISOString(),
  liveReads: Record<string, LiveReadOverride> = {},
): ApplyFetchResultsSummary {
  const output: PriceCache = { ...previousCache };
  const runAtMs = Date.parse(runAt);
  // FAIL LOUDLY. Live-read expiry below is arithmetic on this timestamp; a NaN
  // here would silently make every override look unusable, freezing every held
  // row permanently. Refusing to run is strictly better than running with the
  // one release path disabled.
  if (!Number.isFinite(runAtMs)) {
    throw new Error(
      `[sync-amazon-prices] applyFetchResults: runAt is not a parseable ISO timestamp: ${JSON.stringify(runAt)}. ` +
        'Refusing to run — a held row cannot be released against a live read without a usable clock.',
    );
  }
  let succeeded = 0;
  let retained = 0;
  let dropped = 0;
  let held = 0;
  let confirmedUnbuyable = 0;
  let cleared = 0;
  let usedOnly = 0;
  let liveNewRejected = 0;
  const heldAsins: string[] = [];
  const usedOnlyAsins: string[] = [];

  /**
   * The marker no longer gates a release, but it is still the record of WHEN a
   * row first needed a live read — a queue timestamp a human reads. Keep it a
   * real timestamp: a garbage or future-dated value gets re-seeded to this run
   * and warned about, rather than propagated silently.
   */
  const sanitizeMarker = (asin: string, marker: string | null): string | null => {
    if (!marker) return null;
    const ms = Date.parse(marker);
    if (!Number.isFinite(ms)) {
      console.warn(
        `[sync-amazon-prices] ${asin} -> pendingUnbuyableSince is not a parseable timestamp (${JSON.stringify(marker)}); ` +
          're-seeding it to this run so the held-since date stays readable.',
      );
      return null;
    }
    if (ms > runAtMs) {
      console.warn(
        `[sync-amazon-prices] ${asin} -> pendingUnbuyableSince ${marker} is in the FUTURE relative to this run (${runAt}); ` +
          'clamping to this run — a held-since date must not be later than the read that set it.',
      );
      return null;
    }
    return marker;
  };

  /** Writes the HOLD row: prior values kept verbatim, marker + read stamp added. */
  const holdRow = (asin: string, prior: CachedPriceEntry, rawMarker: string | null): void => {
    const priorMarker = sanitizeMarker(asin, rawMarker);
    held++;
    heldAsins.push(asin);
    // `stale` RULE on a held row: neither set nor cleared — `{...prior}`
    // carries it if and only if the prior row already had it. Setting it
    // would double-count the row against the workflow's `stale` tally (a
    // held row's fetch SUCCEEDED; only its verdict was rejected), and
    // clearing it would erase the Issue #91 record that the retained PRICE
    // itself came from an earlier failed fetch. The two markers describe
    // different things and are tracked separately.
    output[asin] = {
      ...prior,
      pendingUnbuyableSince: priorMarker ?? runAt,
      lastReadAt: runAt,
    };
  };

  for (const r of results) {
    if (r.ok && r.result.price) {
      const prior = previousCache[r.asin];
      const priorMarker = prior?.pendingUnbuyableSince ?? null;

      // ---- USED-PRICE GUARD (W4 #168). Before anything else, because this
      // read's PRICE is the thing at issue: an offer that is not New must never
      // become the row price, at any age, whatever its availability says. §8l.
      const notNew = nonNewOfferReason(r.result);
      if (notNew) {
        usedOnly++;
        usedOnlyAsins.push(r.asin);
        if (prior) {
          console.warn(
            `[sync-amazon-prices] ${r.asin} -> used-only offer, held (${notNew}; price ${r.result.price} NOT written). ` +
              'Keeping the last confirmed row; a live page read decides this one.',
          );
          holdRow(r.asin, prior, priorMarker);
        } else {
          // No prior row to keep, and writing this price would put a used
          // figure on a New card. Leave the ASIN unset — same outcome the
          // Issue #91 path gives an unfetchable ASIN with no history.
          dropped++;
          console.warn(
            `[sync-amazon-prices] ${r.asin} -> used-only offer (${notNew}) and no prior entry to retain; ` +
              'leaving unset rather than writing a not-New price as the row price.',
          );
        }
        continue;
      }

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

      const freshUnbuyable = isSnapshotUnbuyable(fresh);

      // Positive evidence, or no PLAINLY-BUYABLE prior state to protect: apply
      // as-is. The fresh object carries no `pendingUnbuyableSince`, so writing
      // it is also how a marker gets dropped.
      if (!prior || !freshUnbuyable || !isRenderingRow(prior)) {
        if (priorMarker) {
          cleared++;
          console.log(
            `[sync-amazon-prices] ${r.asin} -> clearing pending-unbuyable marker set ${priorMarker} ` +
              `(${!freshUnbuyable ? 'reads BUYABLE again' : 'prior row no longer renders as a live card, so there is nothing left to protect'})`,
          );
        }
        succeeded++;
        output[r.asin] = fresh;
        continue;
      }

      // ---- prior RENDERS as a live card, this API read says unbuyable.
      // §8rr.1: an API read never applies this flip. Only a live page read can.
      const live = liveReadVerdict(liveReads[r.asin], runAtMs);

      if (live.verdict === 'dark') {
        confirmedUnbuyable++;
        console.warn(
          `[sync-amazon-prices] ${r.asin} -> UNBUYABLE confirmed by live read ${live.readAt} ` +
            `(state=${live.reason}; API availability=${fresh.availability ?? 'null'}) — applying the flip and clearing the marker`,
        );
        succeeded++;
        output[r.asin] = fresh;
        continue;
      }

      if (live.verdict === 'live-new') {
        // The live page shows a New offer; the API is simply wrong about this
        // ASIN (the #168 non-featured-backorder shape). Keep the confirmed
        // buyable row and END the hold — nothing is pending any more.
        liveNewRejected++;
        if (priorMarker) cleared++;
        console.log(
          `[sync-amazon-prices] ${r.asin} -> live read ${live.readAt} says LIVE-NEW; API read (availability=${fresh.availability ?? 'null'}) ` +
            'is rejected as a false negative. Keeping the confirmed buyable row and clearing the marker.',
        );
        const kept: CachedPriceEntry = { ...prior };
        delete kept.pendingUnbuyableSince;
        delete kept.lastReadAt;
        output[r.asin] = kept;
        continue;
      }

      console.warn(
        `[sync-amazon-prices] ${r.asin} -> HELD pending live read: was buyable, API read back unbuyable ` +
          `(availability=${fresh.availability ?? 'null'})${priorMarker ? `, pending since ${priorMarker}` : ' on this run\'s read'}` +
          `${live.reason ? ` [live-read override present but unusable: ${live.reason}]` : ''}. ` +
          'Keeping the last confirmed row; only a live page read can apply this flip (§8rr.1).',
      );
      holdRow(r.asin, prior, priorMarker);
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

  return {
    output,
    succeeded,
    retained,
    dropped,
    held,
    confirmedUnbuyable,
    cleared,
    heldAsins,
    usedOnly,
    usedOnlyAsins,
    liveNewRejected,
  };
}

/**
 * data/live-read-overrides.json — the live-read verdicts a census/verifier lane
 * recorded (scripts/record-live-read.ts writes it; src/lib/dark-card.ts renders
 * from it). Optional and non-fatal: an absent or malformed file means no
 * override is available, every contradicted row simply stays HELD, and nothing
 * darkens. A missing instrument may never be the reason a card goes dark.
 */
export function loadLiveReadOverrides(
  filePath: string = LIVE_READ_OVERRIDES_PATH,
): Record<string, LiveReadOverride> {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[sync-amazon-prices] no live-read overrides at ${filePath} — every contradicted row will be HELD.`);
      return {};
    }
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const rows = parsed as Record<string, LiveReadOverride>;
    const count = Object.keys(rows).filter((k) => !k.startsWith('_')).length;
    console.log(`[sync-amazon-prices] loaded ${count} live-read override(s) from ${filePath}`);
    return rows;
  } catch (err) {
    console.warn(
      `[sync-amazon-prices] could not read ${filePath} (${err instanceof Error ? err.message : String(err)}) — ` +
        'continuing with no overrides; rows stay held rather than dark.',
    );
    return {};
  }
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

  const liveReads = loadLiveReadOverrides();
  const {
    output,
    succeeded,
    retained,
    dropped,
    held,
    confirmedUnbuyable,
    cleared,
    heldAsins,
    usedOnly,
    usedOnlyAsins,
    liveNewRejected,
  } = applyFetchResults(previousCache, results, new Date().toISOString(), liveReads);
  // `succeeded` counts rows actually WRITTEN FRESH, so a held row is neither a
  // success nor a failure — it is its own outcome. Every result lands in
  // exactly one of {succeeded, held, liveNewRejected, retained, dropped}, which
  // is what makes this arithmetic exact rather than a subtraction that quietly
  // absorbs a category into "failed" (W4 m4).
  const failed = retained + dropped;
  console.log(
    `[sync-amazon-prices] Done. ${succeeded} written, ${held} held pending live read, ` +
      `${liveNewRejected} API reads rejected by a live read, ${failed} failed ` +
      `(${retained} retained from previous sync, ${dropped} had no prior entry). ` +
      `${Object.keys(output).length} total entries.`,
  );
  console.log(
    `[sync-amazon-prices] Hold-only (§8rr.1): ${held} held pending live read, ` +
      `${confirmedUnbuyable} confirmed unbuyable by a live read <=${OVERRIDE_MAX_AGE_DAYS}d, ${cleared} markers cleared, ` +
      `${usedOnly} withheld by the used-price guard (§8l).`,
  );
  if (usedOnlyAsins.length) {
    console.log(`[sync-amazon-prices] USED-ONLY offers (price NOT written): ${usedOnlyAsins.join(', ')}`);
  }
  if (heldAsins.length) {
    console.log(`[sync-amazon-prices] ${held} held pending live read: ${heldAsins.join(', ')}`);
    // These rows are not waiting on a timer any more — nothing releases them
    // but a live page read. Say exactly what to do with them, because the
    // list IS the work queue for the next census/verifier lane.
    console.log(
      '[sync-amazon-prices] NOTE: no clock releases those. Read each page and record the verdict — ' +
        'npx tsx scripts/record-live-read.ts --asin <ASIN> --state live-new|unavailable|used-only|not-found ' +
        '--price <n> --merchant "<name>" --source https://www.amazon.com/dp/<ASIN> — then re-run this sync.',
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
