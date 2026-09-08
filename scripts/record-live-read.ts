#!/usr/bin/env npx tsx
/**
 * record-live-read.ts — write ONE live-page-read verdict into
 * data/live-read-overrides.json.
 *
 * WHY THIS EXISTS. Owner ruling 2026-09-08 (RUNBOOK §8rr.1): the two states
 * DARK and GONE are set ONLY by a live page read. scripts/sync-amazon-prices.ts
 * now HOLDS every buyable -> unbuyable API read forever, and the only thing that
 * can release a hold is a row in this file. So this file is no longer just a
 * render-layer input (src/lib/dark-card.ts rule 1) — it is the channel through
 * which a human-equivalent live read reaches the data layer, and it needs a
 * writer that always stamps `readAt` and always records the source URL.
 *
 * WHAT THIS IS NOT. It is not evidence. It records the verdict a census /
 * verifier lane reached by actually opening the page; the lane still owes the
 * receipt (screenshot / extracted DOM / JSONL row) under §8t, and this CLI
 * refuses to write a row without an amazon.com --source URL precisely so a
 * verdict can always be walked back to the page it came from.
 *
 * Usage:
 *   npx tsx scripts/record-live-read.ts \
 *     --asin B00I9A8CW6 --state used-only \
 *     --merchant "Amazon Resale" \
 *     --source https://www.amazon.com/dp/B00I9A8CW6
 *
 *   npx tsx scripts/record-live-read.ts \
 *     --asin B0002AR1A0 --state live-new --price 11.99 \
 *     --merchant "Amazon.com" --source https://www.amazon.com/dp/B0002AR1A0
 *
 * Flags:
 *   --asin      (required) 10-char ASIN.
 *   --state     (required) live-new | unavailable | used-only | not-found.
 *   --source    (required) the amazon.com URL that was actually read.
 *   --price     required for live-new (the New Buy-Box price), rejected
 *               otherwise — a dark verdict has no New price to print, and
 *               writing one would be the exact W4 #168 defect in reverse.
 *   --merchant  seller of record on the page. Optional but strongly wanted.
 *   --currency  default USD.  --lane  provenance label.  --at  ISO override for
 *               readAt (tests/backfill only; defaults to now).
 *   --file      target JSON file (default data/live-read-overrides.json).
 *   --dry-run   print the row that WOULD be written, write nothing.
 *
 * Exit codes: 0 written (or dry run), 1 bad input / write failure.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { LiveReadOverride } from '../src/lib/dark-card';
import { getAllGuides } from '../src/lib/guides';

const ROOT_DIR = path.join(import.meta.dirname, '..');
const DEFAULT_PATH = path.join(ROOT_DIR, 'data', 'live-read-overrides.json');

/** The four verdicts a live read can reach, and the row each one writes. */
export const LIVE_READ_STATES = ['live-new', 'unavailable', 'used-only', 'not-found'] as const;
export type LiveReadState = (typeof LIVE_READ_STATES)[number];

/**
 * state -> the (availability, condition) pair written to the row.
 *
 * `condition` is the field both consumers read: src/lib/dark-card.ts renders a
 * figure only from "New", and scripts/sync-amazon-prices.ts confirms a dark row
 * only from "unavailable" / "used-only" / "not-found". `availability` carries
 * the same verdict in the snapshot's own vocabulary so a reader of the raw file
 * never has to infer one from the other.
 */
const STATE_FIELDS: Record<LiveReadState, { availability: string; condition: string }> = {
  'live-new': { availability: 'IN_STOCK', condition: 'New' },
  unavailable: { availability: 'OUT_OF_STOCK', condition: 'unavailable' },
  'used-only': { availability: 'USED_ONLY', condition: 'used-only' },
  'not-found': { availability: 'NOT_FOUND', condition: 'not-found' },
};

export interface RecordLiveReadInput {
  asin: string;
  state: LiveReadState;
  source: string;
  price?: number | null;
  merchant?: string | null;
  currency?: string;
  lane?: string;
  readAt?: string;
}

/**
 * Builds the row, or throws with the reason. Pure — no filesystem — so the
 * validation rules are testable and the CLI is a thin shell around them.
 */
export function buildLiveReadRow(input: RecordLiveReadInput): LiveReadOverride {
  if (!/^[A-Z0-9]{10}$/.test(input.asin || '')) {
    throw new Error(`--asin must be a 10-character ASIN, got ${JSON.stringify(input.asin)}`);
  }
  if (!LIVE_READ_STATES.includes(input.state)) {
    throw new Error(`--state must be one of ${LIVE_READ_STATES.join(' | ')}, got ${JSON.stringify(input.state)}`);
  }
  // §8t: a verdict that can darken a card must carry the page it came from.
  let host = '';
  try {
    host = new URL(input.source || '').hostname.toLowerCase();
  } catch {
    throw new Error(`--source must be the amazon.com URL that was read, got ${JSON.stringify(input.source)}`);
  }
  if (!/(^|\.)amazon\.[a-z.]+$/.test(host)) {
    throw new Error(`--source must be an amazon.com listing URL (got host ${host}) — the live read IS the source (rule 4)`);
  }

  const price = input.price ?? null;
  if (input.state === 'live-new') {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new Error('--price is required for --state live-new (the New Buy-Box price you just read)');
    }
  } else if (price !== null) {
    throw new Error(
      `--price is not accepted for --state ${input.state}: a dark verdict has no New price to print, and recording ` +
        'a used/other-condition figure as the price is the W4 #168 defect this guard exists to prevent (§8l).',
    );
  }

  const readAt = input.readAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(readAt))) {
    throw new Error(`--at must be a parseable ISO timestamp, got ${JSON.stringify(readAt)}`);
  }

  const fields = STATE_FIELDS[input.state];
  return {
    price,
    currency: (input.currency || 'USD').toUpperCase(),
    availability: fields.availability,
    merchant: input.merchant ?? null,
    condition: fields.condition,
    readAt,
    source: input.source,
    lane: input.lane || 'petpal-live-read',
  };
}

/** Warns (never throws) when the ASIN appears in no guide's picks. */
function warnIfNotInCorpus(asin: string): void {
  try {
    const guides = getAllGuides();
    const hit = guides.some(
      (g) =>
        (g.picks ?? []).some((p) => p.asin === asin) ||
        (g.suppressedPicks ?? []).some((p) => p.asin === asin),
    );
    if (!hit) {
      console.warn(
        `[record-live-read] WARNING: ${asin} appears in no guide's picks[] or suppressedPicks[]. ` +
          'Writing the row anyway (a replacement pick may not have landed yet), but nothing will read it until it does.',
      );
    }
  } catch (err) {
    console.warn(
      `[record-live-read] could not scan the corpus to check ${asin} ` +
        `(${err instanceof Error ? err.message : String(err)}) — continuing.`,
    );
  }
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      out[arg.slice(2)] = argv[++i];
    } else {
      out[arg.slice(2)] = true;
    }
  }
  return out;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const filePath = typeof args.file === 'string' ? args.file : DEFAULT_PATH;
  const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';

  let row: LiveReadOverride;
  const asin = String(args.asin ?? '');
  try {
    row = buildLiveReadRow({
      asin,
      state: String(args.state ?? '') as LiveReadState,
      source: String(args.source ?? ''),
      price: args.price === undefined ? null : Number(args.price),
      merchant: typeof args.merchant === 'string' ? args.merchant : null,
      currency: typeof args.currency === 'string' ? args.currency : undefined,
      lane: typeof args.lane === 'string' ? args.lane : undefined,
      readAt: typeof args.at === 'string' ? args.at : undefined,
    });
  } catch (err) {
    console.error(`[record-live-read] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
    return;
  }

  let existing: Record<string, LiveReadOverride> = {};
  if (fs.existsSync(filePath)) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        existing = parsed as Record<string, LiveReadOverride>;
      }
    } catch (err) {
      // REFUSE rather than overwrite. This file is other lanes' work; a parse
      // failure here means something is wrong with it, not that it is empty.
      console.error(
        `[record-live-read] ${filePath} exists but does not parse (${err instanceof Error ? err.message : String(err)}). ` +
          'Refusing to overwrite it — fix or move the file first.',
      );
      process.exit(1);
      return;
    }
  }

  // CORPUS CHECK — WARN, never fail (W4 fix cycle 1 minor; choosing warn).
  // A typo'd ASIN writes a row nothing will ever read, which is worth saying
  // out loud. But refusing would also block the legitimate case: recording a
  // live read for an ASIN that is about to be added as a replacement pick, or
  // one whose guide is on another branch. A recording tool must never be the
  // reason a receipt goes unwritten, so this reports and continues.
  warnIfNotInCorpus(asin);

  const prior = existing[asin];
  if (prior) {
    console.log(
      `[record-live-read] ${asin}: replacing prior row (condition=${prior.condition ?? 'null'}, readAt=${prior.readAt ?? 'null'})`,
    );
  }
  existing[asin] = row;

  if (dryRun) {
    console.log(`[record-live-read] DRY RUN — would write to ${filePath}:`);
    console.log(JSON.stringify({ [asin]: row }, null, 2));
    return;
  }

  // Key order is stable so the diff of this file stays reviewable: ASINs sort,
  // and any `_comment`-style key keeps its place at the top.
  const sorted: Record<string, LiveReadOverride> = {};
  for (const key of Object.keys(existing).sort()) sorted[key] = existing[key];
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n');
  console.log(
    `[record-live-read] ${asin} -> ${row.condition} (${row.availability}) readAt=${row.readAt} written to ${filePath}. ` +
      'Re-run `npm run sync:prices` for the sync to act on it.',
  );
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) main();
