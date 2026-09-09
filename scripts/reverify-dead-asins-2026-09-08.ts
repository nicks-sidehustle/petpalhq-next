#!/usr/bin/env npx tsx
/**
 * reverify-dead-asins-2026-09-08.ts — FULL DEAD-ASIN RE-VERIFY, petpal DATA
 * lane, 2026-09-08 (owner rules §8rr / §8rr.1 / §8qq).
 *
 * WHY THIS EXISTS. §8rr: an instrument opinion (a hard gate in
 * data/dead-asins.json) expires 7 days after it was last verified -- a gate
 * entry older than that is no opinion at all. §8rr.1: only a LIVE READ can
 * set DARK or GONE. Every ASIN-keyed entry in data/dead-asins.json this
 * lane found was 32-41 days stale (the newest was 2026-07-29/08-04/08-07),
 * so every one of them got a fresh Chrome-lane live read today
 * (2026-09-08/09), sequentially, one page per read.
 *
 * Source of truth: scripts/receipts/dead-asins-reverify-2026-09-08.jsonl --
 * 41 rows, one per ASIN-keyed data/dead-asins.json entry (the 3 slug#rank /
 * no-ASIN entries -- the two `best-reef-aquarium-sumps-refugiums-2026#4/#5`
 * NO-AMAZON-EQUIVALENT picks, and the already-fresh-today B00006OALW dark
 * read from the #175 W4 fix cycle -- are explicitly OUT of this receipt and
 * left untouched).
 *
 * What this script does, driven ONLY by that receipt (lockdown rule 5 --
 * no hand edits to the two data files):
 *
 *   - class LIVE-NEW  -> delete the data/dead-asins.json entry (the gate no
 *     longer describes reality) and write/replace a live-read-overrides.json
 *     row with condition "New", the live price, and the merchant read on the
 *     page today.
 *   - class UNAVAILABLE / USED-ONLY / NOT-FOUND (the three dark states) ->
 *     KEEP the data/dead-asins.json entry (still genuinely unbuyable in the
 *     read role that matters -- New/Buy-Box), but overwrite its
 *     status/reason/lastVerified with today's read so the gate is a live
 *     record again, not a 32-41-day-old opinion. Also write/replace a
 *     live-read-overrides.json row in the dark-state shape record-live-read.ts
 *     defines (condition unavailable/used-only/not-found), so the row itself
 *     is a §8rr.1 live-read record a sync lane can point to, not silence.
 *
 * status mapping for the three dark classes (validate-dead-asin-guard.mjs
 * VALID_STATUSES = dead | no_offer | used_buybox | no_listing):
 *   UNAVAILABLE -> no_offer      (OUT_OF_STOCK / unavailable)
 *   USED-ONLY   -> used_buybox   (Buy Box winner is a Used condition)
 *   NOT-FOUND   -> dead          (page does not resolve to a live listing)
 *
 * Usage: npx tsx scripts/reverify-dead-asins-2026-09-08.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const JSONL_PATH = path.join(REPO_ROOT, 'scripts', 'receipts', 'dead-asins-reverify-2026-09-08.jsonl');
const OVERRIDES_PATH = path.join(REPO_ROOT, 'data', 'live-read-overrides.json');
const DEAD_ASINS_PATH = path.join(REPO_ROOT, 'data', 'dead-asins.json');
const RECEIPT_MD_PATH = path.join(REPO_ROOT, 'scripts', 'receipts', 'dead-asins-reverify-2026-09-08.md');
const LANE = 'petpal-dead-asins-reverify-2026-09-08';
const TODAY = '2026-09-08';

interface Row {
  asin: string;
  guides: string[];
  class: 'LIVE-NEW' | 'UNAVAILABLE' | 'USED-ONLY' | 'NOT-FOUND';
  price: number | null;
  merchant: string | null;
  readAt: string;
  source: string;
  lane: string;
  note: string | null;
}

interface DeadAsinEntry {
  status: string;
  reason: string;
  lastVerified: string;
  guides: string[];
  pick?: string;
}

interface OverrideRow {
  price: number | null;
  currency: string;
  availability: string;
  merchant: string | null;
  condition: string;
  readAt: string;
  source: string;
  lane: string;
}

const DARK_FIELDS: Record<'UNAVAILABLE' | 'USED-ONLY' | 'NOT-FOUND', { availability: string; condition: string; status: string }> = {
  UNAVAILABLE: { availability: 'OUT_OF_STOCK', condition: 'unavailable', status: 'no_offer' },
  'USED-ONLY': { availability: 'USED_ONLY', condition: 'used-only', status: 'used_buybox' },
  'NOT-FOUND': { availability: 'NOT_FOUND', condition: 'not-found', status: 'dead' },
};

function readJson<T>(p: string, fallback: T): T {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}
function writeJsonSorted(p: string, obj: Record<string, unknown>) {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) sorted[key] = obj[key];
  fs.writeFileSync(p, JSON.stringify(sorted, null, 2) + '\n');
}

function main() {
  const rows: Row[] = fs
    .readFileSync(JSONL_PATH, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const deadAsins = readJson<Record<string, DeadAsinEntry>>(DEAD_ASINS_PATH, {});
  const overrides = readJson<Record<string, OverrideRow>>(OVERRIDES_PATH, {});

  const cleared: { asin: string; prior: DeadAsinEntry; row: Row }[] = [];
  const refreshed: { asin: string; prior: DeadAsinEntry; row: Row }[] = [];
  const missingFromGuard: Row[] = [];

  for (const r of rows) {
    const prior = deadAsins[r.asin];
    if (!prior) {
      missingFromGuard.push(r);
      continue;
    }

    if (r.class === 'LIVE-NEW') {
      if (typeof r.price !== 'number' || !(r.price > 0)) {
        throw new Error(`${r.asin}: class LIVE-NEW but no valid price in receipt`);
      }
      cleared.push({ asin: r.asin, prior, row: r });
      delete deadAsins[r.asin];
      overrides[r.asin] = {
        price: r.price,
        currency: 'USD',
        availability: 'IN_STOCK',
        merchant: r.merchant,
        condition: 'New',
        readAt: r.readAt,
        source: r.source,
        lane: r.lane,
      };
    } else {
      const fields = DARK_FIELDS[r.class];
      refreshed.push({ asin: r.asin, prior: { ...prior }, row: r });
      deadAsins[r.asin] = {
        ...prior,
        status: fields.status,
        reason: `${r.note ?? ''} (live read ${TODAY}: ${r.source})`.trim(),
        lastVerified: TODAY,
      };
      overrides[r.asin] = {
        price: null,
        currency: 'USD',
        availability: fields.availability,
        merchant: r.merchant,
        condition: fields.condition,
        readAt: r.readAt,
        source: r.source,
        lane: r.lane,
      };
    }
  }

  writeJsonSorted(DEAD_ASINS_PATH, deadAsins as unknown as Record<string, unknown>);
  writeJsonSorted(OVERRIDES_PATH, overrides as unknown as Record<string, unknown>);

  // ---------- receipt ----------
  const lines: string[] = [];
  lines.push('# dead-asins-reverify receipt — 2026-09-08');
  lines.push('');
  lines.push('petpal DATA lane — DEAD-ASIN RE-VERIFY (owner rules §8rr / §8rr.1 / §8qq).');
  lines.push(`Source: \`scripts/receipts/dead-asins-reverify-2026-09-08.jsonl\` — 41 ASIN-keyed entries, Chrome-lane live reads today, sequential with a 2s pause between reads.`);
  lines.push(`Script: \`scripts/reverify-dead-asins-2026-09-08.ts\`. Run: \`npx tsx scripts/reverify-dead-asins-2026-09-08.ts\`.`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`- ASINs live-read today: ${rows.length} of 41 (all ASIN-keyed dead-asins.json entries except B00006OALW, already fresh-today from the #175 W4 fix cycle)`);
  lines.push(`- **Cleared (LIVE-NEW, dead-asins.json entry removed): ${cleared.length}**`);
  lines.push(`- **Refreshed (dark state confirmed, lastVerified reset to today): ${refreshed.length}**`);
  lines.push(`- 3 slug#rank / no-ASIN entries (2 no-listing + B00006OALW dark-today) left untouched, out of this receipt's scope`);
  if (missingFromGuard.length) lines.push(`- WARNING: ${missingFromGuard.length} receipt rows had no matching dead-asins.json entry: ${missingFromGuard.map((r) => r.asin).join(', ')}`);
  lines.push('');
  lines.push('## Cleared — LIVE-NEW today, dead-asins.json entry removed');
  lines.push('');
  lines.push('| ASIN | Guides | Prior status/reason/lastVerified | Live price today | Merchant | Note |');
  lines.push('|---|---|---|---:|---|---|');
  for (const c of cleared) {
    lines.push(
      `| ${c.asin} | ${c.prior.guides.join(', ')} | ${c.prior.status} / ${c.prior.reason} / ${c.prior.lastVerified} | $${c.row.price!.toFixed(2)} | ${c.row.merchant} | ${c.row.note ?? ''} |`,
    );
  }
  lines.push('');
  lines.push('## Refreshed — dark state confirmed by live read, lastVerified reset to today');
  lines.push('');
  lines.push('| ASIN | Guides | Class | Prior status/reason/lastVerified | New status/lastVerified | Note |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of refreshed) {
    const updated = deadAsins[r.asin]; // already overwritten in memory before write? re-read structure below
    lines.push(
      `| ${r.asin} | ${r.prior.guides.join(', ')} | ${r.row.class} | ${r.prior.status} / ${r.prior.reason} / ${r.prior.lastVerified} | ${DARK_FIELDS[r.row.class as 'UNAVAILABLE' | 'USED-ONLY' | 'NOT-FOUND'].status} / ${TODAY} | ${r.row.note ?? ''} |`,
    );
    void updated;
  }
  lines.push('');

  fs.mkdirSync(path.dirname(RECEIPT_MD_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_MD_PATH, lines.join('\n') + '\n');

  console.log(`Cleared (LIVE-NEW, dead-asins.json entry removed): ${cleared.length}`);
  for (const c of cleared) console.log(`  ${c.asin}  $${c.row.price!.toFixed(2)}  ${c.row.merchant}`);
  console.log(`Refreshed (dark, lastVerified -> ${TODAY}): ${refreshed.length}`);
  for (const r of refreshed) console.log(`  ${r.asin}  ${r.row.class}  ${DARK_FIELDS[r.row.class as 'UNAVAILABLE' | 'USED-ONLY' | 'NOT-FOUND'].status}`);
  if (missingFromGuard.length) {
    console.log(`WARNING — no matching dead-asins.json entry: ${missingFromGuard.map((r) => r.asin).join(', ')}`);
  }
  console.log(`Receipt: ${RECEIPT_MD_PATH}`);
}

main();
