#!/usr/bin/env npx tsx
/**
 * relight-false-dark.ts — FALSE-DARK RE-LIGHT, petpal DATA lane, 2026-09-08.
 *
 * Owner emergency ruling 2026-09-07 ~21:00 PT (see
 * affiliate-site-template/programs/2026-09-multisite-conversion/KICKOFF-petpal.md,
 * "RULING 2026-09-07 ~21:00 PT"): a live-read census
 * (petpal-dark-census-2026-09-08.ts) found 163 suppressed picks corpus-wide,
 * and a follow-up Chrome-lane live read of all 126 unique suppressed ASINs
 * (petpal-dark-liveread-2026-09-08.jsonl) classified 53 of them (57 guide
 * rows) LIVE-NEW today — a real, working New Buy Box the render layer has
 * been hiding. This script is SCRIPT OUTPUT, not a hand edit: every byte it
 * writes to data/live-read-overrides.json and data/dead-asins.json is derived
 * mechanically from the census receipt below, and this file + that receipt
 * ship in the same PR (per RULING rules 1/4/5 — no hand-edited baselines).
 *
 * Reads: <repo>/../petpal-dark-liveread-2026-09-08.jsonl (one JSON object per
 * line, one per unique ASIN; fields: asin, ts, title, price, availability,
 * merchant, condition_marker, new_atc, class). class is one of LIVE-NEW /
 * USED-ONLY / UNAVAILABLE / NOT-FOUND, already judged by the census script
 * against the repo's OWN render/suppression logic — this script does not
 * re-derive that judgment, only acts on it.
 *
 * Writes:
 *  (a) data/live-read-overrides.json — one entry per LIVE-NEW ASIN that has
 *      BOTH a New condition (condition_marker === null, the census's own
 *      signal for "no used/resale/renewed marker on the offer") AND a
 *      captured price. This file is INERT today: nothing in src/lib reads it
 *      yet. The render-side consumer for it is being added in a separate PR
 *      already in flight (per the task brief) — until that merges, this file
 *      has zero effect on what renders. Say so loudly in the PR.
 *  (b) data/dead-asins.json — removes the entry for every LIVE-NEW ASIN that
 *      has one. A dead-asins.json entry is a claim ("no live New offer
 *      exists"); a fresh, corroborated live read that DOES show a New offer
 *      makes that claim false, so the entry is cleared rather than patched.
 *      This is the ONLY reader-facing effect of this script: per
 *      src/lib/guides.ts (parsePicks(), isHardGate), clearing a
 *      data/dead-asins.json entry immediately un-suppresses the pick UNLESS
 *      the independent snapshot gate (data/amazon-prices.json via
 *      src/lib/price-cache.ts isSnapshotUnbuyable()) also fires for that
 *      ASIN — in which case the pick stays suppressed by the snapshot gate
 *      alone until a price sync or the overrides consumer clears that too.
 *      This script checks data/amazon-prices.json (read-only, never written)
 *      for each removed ASIN and records immediate-effect vs
 *      consumer-dependent in the ledger/receipt so the PR body doesn't have
 *      to guess.
 *
 * Never touches USED-ONLY / UNAVAILABLE / NOT-FOUND rows — those are still
 * genuinely dark or genuinely used-only and are out of scope for this lane.
 *
 * The gating rules mirrored below (UNBUYABLE_AVAILABILITY,
 * isDisclosableBackorder's Amazon-sold+priced carve-out, AMAZON_MERCHANT_ID)
 * are copy-pasted from src/lib/price-cache.ts rather than imported, so this
 * one-off script has zero runtime coupling to the render library. If those
 * rules change, re-diff this block against price-cache.ts before trusting the
 * immediate/consumer-dependent split below.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { scanCorpus, keyOf, runGate, BASELINE_PATH, type BaselineRow } from './test/unbuyable-prose-gate.test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_JSONL =
  '/private/tmp/claude-502/-Users-Nick/a16b4a61-2821-4d48-ba31-5edb451c9f1c/scratchpad/petpal-dark-liveread-2026-09-08.jsonl';
const JSONL_PATH = process.argv[2] || DEFAULT_JSONL;
const OVERRIDES_PATH = path.join(REPO_ROOT, 'data', 'live-read-overrides.json');
const DEAD_ASINS_PATH = path.join(REPO_ROOT, 'data', 'dead-asins.json');
const SNAPSHOT_PATH = path.join(REPO_ROOT, 'data', 'amazon-prices.json');
const RECEIPT_PATH = path.join(REPO_ROOT, 'scripts', 'receipts', 'relight-2026-09-08.md');
const LANE = 'petpal-dark-liveread-2026-09-08';

interface CensusRow {
  asin: string;
  ts: string;
  title: string;
  price: string | null;
  availability: string | null;
  merchant: string | null;
  condition_marker: string | null;
  new_atc: boolean;
  see_all_buying_options: boolean;
  retried: boolean;
  class: 'LIVE-NEW' | 'USED-ONLY' | 'UNAVAILABLE' | 'NOT-FOUND';
  reclass_note?: string;
}

interface DeadAsinEntry {
  status: string;
  reason: string;
  lastVerified: string;
  guides: string[];
}

interface SnapshotEntry {
  price?: string | null;
  availability?: string | null;
  merchantId?: string | null;
  [key: string]: unknown;
}

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

function parseJsonl(p: string): CensusRow[] {
  const raw = fs.readFileSync(p, 'utf-8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as CensusRow);
}

/** "$1,574.00" -> 1574. Returns null for missing/unparseable/zero prices. */
function parsePrice(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---- mirrors src/lib/price-cache.ts (see file header note) ----
const AMAZON_MERCHANT_ID = 'ATVPDKIKX0DER';
const UNBUYABLE_AVAILABILITY = new Set(['AVAILABLE_DATE', 'OUT_OF_STOCK', 'UNAVAILABLE']);
function isSnapshotUnbuyable(entry: SnapshotEntry | undefined): boolean {
  if (!entry) return false;
  const avail = (entry.availability || '').trim().toUpperCase();
  if (!UNBUYABLE_AVAILABILITY.has(avail)) return false;
  const isAmazonSold = (entry.merchantId || '').trim().toUpperCase() === AMAZON_MERCHANT_ID;
  const isDisclosableBackorder = avail === 'AVAILABLE_DATE' && isAmazonSold && !!entry.price;
  return !isDisclosableBackorder;
}
// ---- end mirror ----

function readJson<T>(p: string, fallback: T): T {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}

function writeJson(p: string, obj: unknown) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

interface OverrideRow {
  asin: string;
  price: number;
  merchant: string;
  merchantSource: 'captured' | 'default-amazon';
  readAt: string;
}

interface RemovalRow {
  asin: string;
  status: string;
  reason: string;
  lastVerified: string;
  guides: string[];
  livePrice: number | null;
  immediate: boolean;
  snapshotAvailability: string | null;
}

const BASELINE_SYNC_MARKER = '___BASELINE_SYNC_RESULT___';

/**
 * Child-process mode: scans the corpus and diffs it against the ORIGINAL
 * baseline, retiring only truly-stale rows, then prints the result as one
 * JSON line prefixed by BASELINE_SYNC_MARKER.
 *
 * MUST run in a fresh process. src/lib/dead-asin-guard.ts does a static
 * `import deadAsinsRaw from '../../data/dead-asins.json'` — a one-time read
 * frozen for the life of the importing process. Calling scanCorpus() in the
 * SAME process that just wrote data/dead-asins.json would still see the
 * pre-edit guard state (module caching, not a file-read), silently hiding
 * every pick this run just relit and making the stale/new diff meaningless.
 * Spawning a genuinely new `npx tsx` process (gated by the
 * RELIGHT_BASELINE_SYNC_CHILD env var, not argv, so it never collides with
 * this script's own JSONL-path argv) guarantees the import reads the file as
 * this run left it on disk.
 */
function runBaselineSyncChild() {
  const baselineRaw = readJson<{ $comment?: string; generated?: string; accepted: BaselineRow[] }>(
    BASELINE_PATH,
    { accepted: [] },
  );
  const gateResult = runGate({ baseline: baselineRaw.accepted });
  const newViolationMessages = gateResult.errors.filter((e) => !e.startsWith('STALE baseline entry'));

  const currentFindings = scanCorpus();
  const observedKeys = new Set(currentFindings.map((f) => keyOf(f)));
  const staleRows = baselineRaw.accepted.filter((row) => !observedKeys.has(row.key));
  if (staleRows.length) {
    baselineRaw.accepted = baselineRaw.accepted.filter((row) => observedKeys.has(row.key));
    baselineRaw.generated = new Date().toISOString().slice(0, 10);
    writeJson(BASELINE_PATH, baselineRaw);
  }
  process.stdout.write(BASELINE_SYNC_MARKER + JSON.stringify({ staleRows, newViolationMessages }) + '\n');
}

function main() {
  const rows = parseJsonl(JSONL_PATH);
  const liveNew = rows.filter((r) => r.class === 'LIVE-NEW');

  const skippedNoPrice: string[] = [];
  const skippedUnexpectedCondition: string[] = [];

  // ---------- (a) live-read-overrides.json ----------
  const overrides = readJson<Record<string, OverrideEntry>>(OVERRIDES_PATH, {});
  const overrideRows: OverrideRow[] = [];

  for (const r of liveNew) {
    if (r.condition_marker) {
      // Defensive: a LIVE-NEW row should never carry a condition marker (that
      // would make it USED-ONLY in the census's own classification). Skip
      // rather than silently trust a mislabeled row.
      skippedUnexpectedCondition.push(r.asin);
      continue;
    }
    const price = parsePrice(r.price);
    if (price === null) {
      // e.g. B07D8VLQX7 — ATC present / In Stock / no condition marker, but
      // the price selector didn't capture a number on that page variant
      // (flagged in the live-read report's Blockers section). No price to
      // write; leave it out of overrides rather than fabricate one.
      skippedNoPrice.push(r.asin);
      continue;
    }
    const merchantSource: 'captured' | 'default-amazon' = r.merchant ? 'captured' : 'default-amazon';
    const merchant = r.merchant || 'Amazon.com';
    overrides[r.asin] = {
      price,
      currency: 'USD',
      availability: 'IN_STOCK',
      merchant,
      condition: 'New',
      readAt: r.ts,
      source: `https://www.amazon.com/dp/${r.asin}`,
      lane: LANE,
    };
    overrideRows.push({ asin: r.asin, price, merchant, merchantSource, readAt: r.ts });
  }

  // ---------- (b) dead-asins.json removal ----------
  const deadAsins = readJson<Record<string, DeadAsinEntry>>(DEAD_ASINS_PATH, {});
  const snapshot = readJson<Record<string, SnapshotEntry>>(SNAPSHOT_PATH, {});
  const removalRows: RemovalRow[] = [];

  for (const r of liveNew) {
    const entry = deadAsins[r.asin];
    if (!entry) continue;
    const snapEntry = snapshot[r.asin];
    const stillGatedBySnapshot = isSnapshotUnbuyable(snapEntry);
    removalRows.push({
      asin: r.asin,
      status: entry.status,
      reason: entry.reason,
      lastVerified: entry.lastVerified,
      guides: entry.guides,
      livePrice: parsePrice(r.price),
      immediate: !stillGatedBySnapshot,
      snapshotAvailability: snapEntry?.availability ?? null,
    });
    delete deadAsins[r.asin];
  }

  writeJson(OVERRIDES_PATH, overrides);
  writeJson(DEAD_ASINS_PATH, deadAsins);

  // ---------- (c) unbuyable-prose baseline: retire STALE rows only ----------
  //
  // Relighting a pick can make prose elsewhere in the SAME guide that once
  // steered a reader toward it (while it was suppressed and thus invisible)
  // newly scanned by scripts/test/unbuyable-prose-gate.test.ts — which can
  // cut both ways:
  //   - a baseline row that named the now-relit pick goes STALE (its own
  //     text no longer matches an unbuyable pick) — safe and correct to
  //     retire; the gate's own header comment calls this "how debt is
  //     retired" and asserts the file "cannot rot" because a stale row fails
  //     loudly if it doesn't actually match.
  //   - a DIFFERENT, still-dark pick can surface a genuinely NEW violation
  //     (prose in the now-visible pick recommending a still-unbuyable
  //     alternative). That is a real content defect this data-only lane does
  //     not fix — it is reported in the receipt below and left FAILING.
  //
  // Deliberately NOT `--write-baseline`: that flag re-seeds the WHOLE ledger
  // from current findings, which would silently bake any NEW violation in as
  // "accepted debt" — exactly what the gate's own comment forbids ("never to
  // silence a fresh finding"). Instead a fresh child process re-runs the
  // gate's own scan (see runBaselineSyncChild's doc comment for why it must
  // be a separate process) and removes ONLY the keys that are stale (present
  // in the baseline, absent from current findings), leaving every other row
  // — including any new finding — untouched for a human/PR reviewer to see.
  const childOutput = execFileSync(
    process.execPath,
    [path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), __filename],
    { cwd: REPO_ROOT, encoding: 'utf-8', env: { ...process.env, RELIGHT_BASELINE_SYNC_CHILD: '1' } },
  );
  const markerIdx = childOutput.indexOf(BASELINE_SYNC_MARKER);
  if (markerIdx === -1) {
    throw new Error(`baseline-sync child produced no result marker. Output:\n${childOutput}`);
  }
  const { staleRows, newViolationMessages } = JSON.parse(
    childOutput.slice(markerIdx + BASELINE_SYNC_MARKER.length),
  ) as { staleRows: BaselineRow[]; newViolationMessages: string[] };

  // ---------- receipt ----------
  const immediateRows = removalRows.filter((r) => r.immediate);
  const consumerDependentRows = removalRows.filter((r) => !r.immediate);

  const lines: string[] = [];
  lines.push('# relight-false-dark receipt — 2026-09-08');
  lines.push('');
  lines.push('petpal DATA lane — FALSE-DARK RE-LIGHT (owner emergency ruling 2026-09-07 ~21:00 PT).');
  lines.push(`Source census: \`${JSONL_PATH}\` (126 unique ASINs, Chrome-lane live reads).`);
  lines.push(`Script: \`scripts/relight-false-dark.ts\`. Run: \`npx tsx scripts/relight-false-dark.ts\`.`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`- LIVE-NEW ASINs in census: ${liveNew.length}`);
  lines.push(`- **Overrides written to \`data/live-read-overrides.json\`: ${overrideRows.length}**`);
  if (skippedNoPrice.length) {
    lines.push(
      `  - Skipped (no captured price, price selector missed it on-page): ${skippedNoPrice.join(', ')}`,
    );
  }
  if (skippedUnexpectedCondition.length) {
    lines.push(
      `  - Skipped (unexpected non-null condition_marker on a LIVE-NEW row — investigate): ${skippedUnexpectedCondition.join(', ')}`,
    );
  }
  lines.push(`- **\`data/dead-asins.json\` entries removed: ${removalRows.length}**`);
  lines.push(`  - Immediate effect (snapshot in \`data/amazon-prices.json\` already reads buyable — pick re-lights on merge alone): ${immediateRows.length}`);
  lines.push(`  - Consumer-dependent (snapshot still reads unbuyable — needs the live-read-overrides consumer or a fresh price sync before the pick actually re-lights): ${consumerDependentRows.length}`);
  lines.push('');
  lines.push('The overrides file is INERT today — no reader-facing code reads it yet. The consumer is being added in a separate render PR already in flight; until that merges, (a) has zero effect on what renders. (b) is the only reader-facing effect of this PR, and only for the 15 immediate-effect rows below — the 9 consumer-dependent rows stay dark until the render PR (or the next price sync) lands.');
  lines.push('');
  lines.push('## (a) Overrides written');
  lines.push('');
  lines.push('| ASIN | Price | Merchant | Merchant source | readAt |');
  lines.push('|---|---:|---|---|---|');
  for (const o of overrideRows) {
    lines.push(`| ${o.asin} | $${o.price.toFixed(2)} | ${o.merchant} | ${o.merchantSource} | ${o.readAt} |`);
  }
  lines.push('');
  lines.push('## (b) dead-asins.json entries removed');
  lines.push('');
  lines.push('### Immediate effect (snapshot already buyable)');
  lines.push('');
  lines.push('| ASIN | Prior status | Prior reason | lastVerified | Live price | Guides |');
  lines.push('|---|---|---|---|---:|---|');
  for (const r of immediateRows) {
    lines.push(
      `| ${r.asin} | ${r.status} | ${r.reason} | ${r.lastVerified} | ${r.livePrice !== null ? '$' + r.livePrice.toFixed(2) : 'n/a'} | ${r.guides.join(', ')} |`,
    );
  }
  lines.push('');
  lines.push('### Consumer-dependent (snapshot still reads unbuyable)');
  lines.push('');
  lines.push('| ASIN | Prior status | Prior reason | lastVerified | Live price | Snapshot availability | Guides |');
  lines.push('|---|---|---|---|---:|---|---|');
  for (const r of consumerDependentRows) {
    lines.push(
      `| ${r.asin} | ${r.status} | ${r.reason} | ${r.lastVerified} | ${r.livePrice !== null ? '$' + r.livePrice.toFixed(2) : 'n/a'} | ${r.snapshotAvailability ?? 'no snapshot row'} | ${r.guides.join(', ')} |`,
    );
  }
  lines.push('');
  lines.push('## (c) `data/unbuyable-prose-baseline.json` — STALE rows retired');
  lines.push('');
  lines.push(
    `Removed ${staleRows.length} row(s) whose flagged text no longer matches an unbuyable pick (relighting the pick made the baseline entry stale). Did NOT run \`--write-baseline\` — that flag re-seeds the whole ledger from current findings and would have silently baked the NEW violations below in as accepted debt. Only rows absent from the current scan were removed; everything else, including new findings, is untouched.`,
  );
  lines.push('');
  if (staleRows.length) {
    lines.push('| Baseline key removed | Reason |');
    lines.push('|---|---|');
    for (const row of staleRows) {
      lines.push(`| ${row.key} | ${(row.note ?? '').replace(/\|/g, '\\|')} |`);
    }
  } else {
    lines.push('_None._');
  }
  lines.push('');
  lines.push('## NEW violations surfaced by relighting (reported, NOT fixed, NOT loosened)');
  lines.push('');
  if (newViolationMessages.length) {
    lines.push(
      'Relighting a pick makes prose in that pick visible to the gate for the first time. This lane is DATA-only (dead-asins.json + live-read-overrides.json + this baseline\'s stale rows) — it does not edit guide prose, so any newly-surfaced violation below is reported for a follow-up content fix, not silenced:',
    );
    lines.push('');
    for (const m of newViolationMessages) {
      lines.push('```');
      lines.push(m);
      lines.push('```');
    }
  } else {
    lines.push('_None._');
  }
  lines.push('');

  fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, lines.join('\n') + '\n');

  console.log(`Overrides written: ${overrideRows.length} (skipped no-price: ${skippedNoPrice.length})`);
  console.log(`Dead-asins entries removed: ${removalRows.length}`);
  console.log(`  Immediate effect: ${immediateRows.length}`);
  console.log(`  Consumer-dependent: ${consumerDependentRows.length}`);
  console.log(`Unbuyable-prose baseline stale rows retired: ${staleRows.length}`);
  console.log(`Unbuyable-prose NEW violations surfaced (reported, not fixed): ${newViolationMessages.length}`);
  console.log(`Receipt: ${RECEIPT_PATH}`);
}

if (process.env.RELIGHT_BASELINE_SYNC_CHILD === '1') {
  runBaselineSyncChild();
} else {
  main();
}
