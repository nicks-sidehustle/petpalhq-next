#!/usr/bin/env npx tsx
/**
 * fix-w4-unfeatured-2026-09-08.ts — W4 fix cycle on PR #178, petpal DATA
 * lane, 2026-09-08 (owner §8qq rule 2: no featured Buy Box = UNFEATURED =
 * DARK).
 *
 * scripts/reverify-dead-asins-2026-09-08.ts cleared 9 ASINs as LIVE-NEW.
 * W4 (see PR #178 review comment) flagged 4 of those 9 as wrongly cleared:
 *
 *   - B0002DJNN0, B0078LOTV0, B00N54E9MI: the live read found only a
 *     marketplace "See All Buying Options" overlay offer -- New condition,
 *     real price, real Add-to-Cart -- but NO featured/Buy-Box offer on the
 *     product page itself. §8qq rule 2 is unambiguous: no featured buy box
 *     is UNFEATURED, and UNFEATURED is DARK, full stop, regardless of
 *     whether a marketplace fallback offer exists. This script reverts
 *     those 3 clears.
 *   - B0CZF14SWV: the /dp/ redirect lands on B0GX9ML82H, which W4 confirmed
 *     is a DIFFERENT variant (55 lb/5-port $69.99) than the guide's pick
 *     (25 lb/4-port $36.99). A redirect to a different SKU is not a live
 *     match for the gated ASIN, so this was never clearable. This script
 *     restores the gate with a note recording the redirect target so a
 *     future rule-3 content lane can re-key or replace the pick.
 *
 * Source of truth: scripts/receipts/dead-asins-reverify-w4fix-2026-09-08.jsonl
 * (4 rows). Script-driven per lockdown rule 5 -- no hand edits to
 * data/dead-asins.json or data/live-read-overrides.json. Restored
 * dead-asins.json entries reuse the ORIGINAL entry's guides array (read from
 * git history at main@83dec7e, the commit this branch forked from) so no
 * guide association is lost; status/reason/lastVerified are replaced with
 * today's corrected UNFEATURED verdict.
 *
 * Usage: npx tsx scripts/fix-w4-unfeatured-2026-09-08.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const JSONL_PATH = path.join(REPO_ROOT, 'scripts', 'receipts', 'dead-asins-reverify-w4fix-2026-09-08.jsonl');
const OVERRIDES_PATH = path.join(REPO_ROOT, 'data', 'live-read-overrides.json');
const DEAD_ASINS_PATH = path.join(REPO_ROOT, 'data', 'dead-asins.json');
const RECEIPT_MD_PATH = path.join(REPO_ROOT, 'scripts', 'receipts', 'dead-asins-reverify-w4fix-2026-09-08.md');
const LANE = 'petpal-dead-asins-w4fix-2026-09-08';
const TODAY = '2026-09-08';

interface Row {
  asin: string;
  guides: string[];
  status: 'no_offer';
  reason: string;
  merchant: string | null;
  source: string;
  note: string | null;
}

interface DeadAsinEntry {
  status: string;
  reason: string;
  lastVerified: string;
  guides: string[];
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
  note?: string;
}

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

  const reverted: { asin: string; priorOverride: OverrideRow | undefined; row: Row }[] = [];

  for (const r of rows) {
    if (deadAsins[r.asin]) {
      throw new Error(`${r.asin}: unexpectedly already present in dead-asins.json -- refusing to clobber, check state before re-running`);
    }
    reverted.push({ asin: r.asin, priorOverride: overrides[r.asin], row: r });

    deadAsins[r.asin] = {
      status: r.status,
      reason: r.reason,
      lastVerified: TODAY,
      guides: r.guides,
    };

    const overrideRow: OverrideRow = {
      price: null,
      currency: 'USD',
      availability: 'OUT_OF_STOCK',
      merchant: r.merchant,
      condition: 'unavailable',
      readAt: new Date().toISOString(),
      source: r.source,
      lane: LANE,
    };
    if (r.note) overrideRow.note = r.note;
    overrides[r.asin] = overrideRow;
  }

  writeJsonSorted(DEAD_ASINS_PATH, deadAsins as unknown as Record<string, unknown>);
  writeJsonSorted(OVERRIDES_PATH, overrides as unknown as Record<string, unknown>);

  const lines: string[] = [];
  lines.push('# dead-asins-reverify W4 fix receipt — 2026-09-08');
  lines.push('');
  lines.push('petpal DATA lane — W4 fix cycle on PR #178 (owner §8qq rule 2: no featured Buy Box = UNFEATURED = DARK).');
  lines.push(`Source: \`scripts/receipts/dead-asins-reverify-w4fix-2026-09-08.jsonl\` — 4 rows. Script: \`scripts/fix-w4-unfeatured-2026-09-08.ts\`.`);
  lines.push('');
  lines.push('| ASIN | Guide(s) | Finding | Fix |');
  lines.push('|---|---|---|---|');
  for (const r of reverted) {
    lines.push(`| ${r.asin} | ${r.row.guides.join(', ')} | ${r.row.note ?? 'marketplace-only offer, no featured Buy Box'} | dead-asins.json restored (no_offer), override row rewritten to dark (unavailable, price null) |`);
  }
  lines.push('');

  fs.mkdirSync(path.dirname(RECEIPT_MD_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_MD_PATH, lines.join('\n') + '\n');

  console.log(`Reverted to DARK (rule 2 UNFEATURED): ${reverted.length}`);
  for (const r of reverted) console.log(`  ${r.asin}  ${r.row.note ?? 'unfeatured/marketplace-only'}`);
  console.log(`Receipt: ${RECEIPT_MD_PATH}`);
}

main();
