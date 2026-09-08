#!/usr/bin/env npx tsx
/**
 * hold-flips-pending-live-read.ts — W4 #168 HOLD fix cycle 1 (split-ship), petpal DATA lane, 2026-09-08.
 *
 * Context: PR #168 (data/price-sync-2026-09-08-am, 58d8334) flipped 16 rows
 * in data/amazon-prices.json from buyable to "CONFIRMED unbuyable"
 * (AVAILABLE_DATE) after two Amazon Creators API reads >=12h apart agreed.
 * The w4-verify pass (PR #168 review comment,
 * https://github.com/nicks-sidehustle/petpalhq-next/pull/168#issuecomment-5590014856)
 * found the flips FALSE: 6 of 6 sampled ASINs have a live New buy box on
 * amazon.com/dp/<ASIN> (two independent reads ~1h apart each), and the
 * merchant changed on 12 of the 16 flipped rows — the Creators API is
 * surfacing a non-featured backorder offer while the page's actual featured
 * offer is New and in stock. Owner law: the API is a hint (RUNBOOK §8mm);
 * instruments never remove page elements (§8rr); only a live page read may
 * set a row DARK/GONE (§8rr.1). Two 12h-apart API reads of the SAME wrong
 * offer are not a live read, so the hysteresis gate cannot catch this class.
 *
 * This script is the SCRIPT OUTPUT for that fix (lockdown rule 5 — no hand
 * edits to data/amazon-prices.json or data/live-read-overrides.json):
 *
 * (1) HOLD, don't confirm. For the 16 rows that flipped buyable -> unbuyable
 *     in this run (derived by diffing this branch's data/amazon-prices.json
 *     against origin/main (77c4310) using the SAME isSnapshotUnbuyable()
 *     gate src/lib/price-cache.ts uses to decide what a reader sees — not a
 *     hand-picked list), restore price/availability/merchant/merchantId/
 *     lastChecked (and, for full-row consistency, listPrice/listPriceBasis/
 *     savingsPercent) from origin/main's version of that row, then set
 *     pendingUnbuyableSince and lastReadAt to THIS run's timestamp. That
 *     restarts the two-read hysteresis clock instead of confirming an
 *     unbuyable state from API reads alone — the next sync run gets a fresh
 *     first read under the (still-open) instrument fix.
 *
 * (2) Upsert live-read overrides for the ASINs the verifier actually read
 *     LIVE-NEW with a price. Source: scripts/receipts/
 *     petpal-w4-pr168--live-reread-2026-09-08.jsonl. NOTE ON THAT JSONL: the
 *     verifier's PR comment names 6 ASINs and prices in a markdown table,
 *     backed by raw /dp/ HTML captures under (session scratchpad)/w4-168/
 *     live/<ASIN>_r2.html — but no single discrete jsonl file was ever
 *     written under a "petpal-w4-pr168--live-reread-2026-09-08.jsonl" name
 *     (unlike the pr161/pr162/pr163 lanes, which do have one). This script's
 *     jsonl was RECONSTRUCTED from those two sources (the comment's table +
 *     a second-pass regex parse of the raw _r2.html captures for price/
 *     availability/ATC/merchant) rather than copied verbatim from an
 *     existing file. Three of the six ASINs (B0002ARQ78, B01M6Z59E9,
 *     B08KZT7SMQ) have a confirmed live ATC + price but the verifier's table
 *     did not name the live seller for those three, so merchant is written
 *     as "unknown" for them rather than guessed.
 *
 * (3) Ledger: prints one line per restored ASIN and one line per override,
 *     to stdout, for the PR body / comment.
 *
 * Never touches B00I9A8CW6 — that ASIN is not one of the 16 flips (it is
 * gated separately by data/dead-asins.json, lastVerified 2026-07-29) and its
 * live read shows a USED-only offer ($45.99, shouldUseNatcUsed:true, no New
 * ATC). Left untouched per the task brief; flagged in the PR body as a §8l
 * used-price item for a separate follow-up, not fixed here.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const PRICES_PATH = path.join(REPO_ROOT, 'data', 'amazon-prices.json');
const OVERRIDES_PATH = path.join(REPO_ROOT, 'data', 'live-read-overrides.json');
const RECEIPT_JSONL_PATH = path.join(
  REPO_ROOT,
  'scripts',
  'receipts',
  'petpal-w4-pr168--live-reread-2026-09-08.jsonl',
);
const MAIN_REF = 'origin/main';
const LANE = 'petpal-w4-pr168--live-reread-2026-09-08';

// ---- mirrors src/lib/price-cache.ts isSnapshotUnbuyable() (kept in sync by
// hand; this one-off script has zero runtime coupling to that module) ----
const AMAZON_MERCHANT_ID = 'ATVPDKIKX0DER';
const UNBUYABLE_AVAILABILITY = new Set(['AVAILABLE_DATE', 'OUT_OF_STOCK', 'UNAVAILABLE']);
interface SnapshotEntry {
  price?: string | null;
  availability?: string | null;
  merchantId?: string | null;
  merchantName?: string | null;
  lastChecked?: string | null;
  listPrice?: string | null;
  listPriceBasis?: string | null;
  savingsPercent?: number | null;
  pendingUnbuyableSince?: string | null;
  lastReadAt?: string | null;
  stale?: boolean;
  [key: string]: unknown;
}
function isSnapshotUnbuyable(entry: SnapshotEntry | undefined): boolean {
  if (!entry) return false;
  const avail = (entry.availability || '').trim().toUpperCase();
  if (!UNBUYABLE_AVAILABILITY.has(avail)) return false;
  const isAmazonSold = (entry.merchantId || '').trim().toUpperCase() === AMAZON_MERCHANT_ID;
  const isDisclosableBackorder = avail === 'AVAILABLE_DATE' && isAmazonSold && !!entry.price;
  return !isDisclosableBackorder;
}
// ---- end mirror ----

interface OverrideEntry {
  price: number;
  currency: 'USD';
  availability: 'IN_STOCK';
  merchant: string;
  condition: 'New';
  readAt: string;
  source: string;
  lane: string;
}

interface ReceiptRow {
  asin: string;
  readAt: string;
  price: number;
  currency?: string;
  availability?: string;
  merchant: string;
  condition?: string;
  new_atc?: boolean;
  source: string;
  class: string;
  note?: string;
}

function readJson<T>(p: string, fallback: T): T {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}

function writeJson(p: string, obj: unknown) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

function readMainPrices(): Record<string, SnapshotEntry> {
  const raw = execFileSync('git', ['show', `${MAIN_REF}:data/amazon-prices.json`], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(raw) as Record<string, SnapshotEntry>;
}

function parseReceiptJsonl(p: string): ReceiptRow[] {
  const raw = fs.readFileSync(p, 'utf-8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as ReceiptRow);
}

function main() {
  const runAt = new Date().toISOString();

  const branchPrices = readJson<Record<string, SnapshotEntry>>(PRICES_PATH, {});
  const mainPrices = readMainPrices();

  // ---------- (1) derive the flip set: buyable on main, unbuyable on branch ----------
  const flipAsins = Object.keys(branchPrices)
    .filter((asin) => {
      const m = mainPrices[asin];
      const b = branchPrices[asin];
      return !isSnapshotUnbuyable(m) && isSnapshotUnbuyable(b);
    })
    .sort();

  const restoreLedger: string[] = [];
  for (const asin of flipAsins) {
    const mainRow = mainPrices[asin];
    const branchRow = branchPrices[asin];
    if (!mainRow || !branchRow) {
      restoreLedger.push(`SKIP ${asin} — missing on ${mainRow ? 'branch' : 'main'}, cannot restore`);
      continue;
    }
    const priorAvailability = branchRow.availability;
    const priorPrice = branchRow.price;

    const restored: SnapshotEntry = {
      ...branchRow,
      price: mainRow.price,
      availability: mainRow.availability,
      merchantId: mainRow.merchantId,
      merchantName: mainRow.merchantName,
      lastChecked: mainRow.lastChecked,
      listPrice: mainRow.listPrice ?? null,
      listPriceBasis: mainRow.listPriceBasis ?? null,
      savingsPercent: mainRow.savingsPercent ?? null,
      pendingUnbuyableSince: runAt,
      lastReadAt: runAt,
    };
    branchPrices[asin] = restored;

    restoreLedger.push(
      `RESTORE ${asin} — flip-availability=${priorAvailability} flip-price=${priorPrice} -> ` +
        `restored ${restored.availability} ${restored.price} (${restored.merchantName}); ` +
        `pendingUnbuyableSince/lastReadAt reset to ${runAt}`,
    );
  }

  writeJson(PRICES_PATH, branchPrices);

  // ---------- (2) upsert live-read overrides from the reconstructed receipt jsonl ----------
  const receiptRows = parseReceiptJsonl(RECEIPT_JSONL_PATH);
  const overrides = readJson<Record<string, OverrideEntry>>(OVERRIDES_PATH, {});
  const overrideLedger: string[] = [];

  for (const row of receiptRows) {
    if (row.class !== 'LIVE-NEW' || !(row.price > 0)) {
      overrideLedger.push(`SKIP ${row.asin} — class=${row.class} price=${row.price}`);
      continue;
    }
    overrides[row.asin] = {
      price: row.price,
      currency: 'USD',
      availability: 'IN_STOCK',
      merchant: row.merchant || 'unknown',
      condition: 'New',
      readAt: row.readAt,
      source: row.source,
      lane: LANE,
    };
    overrideLedger.push(`OVERRIDE ${row.asin} — $${row.price} ${row.merchant || 'unknown'} readAt=${row.readAt}`);
  }

  writeJson(OVERRIDES_PATH, overrides);

  // ---------- (3) ledger ----------
  console.log(`hold-flips-pending-live-read.ts — run ${runAt}`);
  console.log(`flips derived (buyable-on-main -> unbuyable-on-branch): ${flipAsins.length}`);
  for (const line of restoreLedger) console.log('  ' + line);
  console.log(`overrides upserted from ${path.relative(REPO_ROOT, RECEIPT_JSONL_PATH)}: ${overrideLedger.filter((l) => l.startsWith('OVERRIDE')).length}`);
  for (const line of overrideLedger) console.log('  ' + line);
}

main();
