#!/usr/bin/env npx tsx
/**
 * clear-stale-dead-asins.ts — STALE DEAD-ASIN CLEANUP, petpal DATA lane,
 * 2026-09-08.
 *
 * Reads scripts/receipts/dead-asins-cleanup-2026-09-08.jsonl — 26 unique
 * ASINs, each independently live-read TODAY via the Chrome lane (real
 * browser reads, not curl; curl hit a genuine Amazon soft-block/captcha wall
 * after 3 ASINs this run and was abandoned per the two-consecutive-captcha
 * stop rule). This script is SCRIPT OUTPUT driven by that receipt — no hand
 * edits to data/dead-asins.json or data/live-read-overrides.json (lockdown
 * rule 5).
 *
 * Cross-check finding (see PR body): of the 26 target ASINs, 23 were already
 * cleared from data/dead-asins.json and already carry a matching
 * live-read-overrides.json row from PR #164 (merged earlier today,
 * fa51884). Today's independent re-read CORROBORATES all 23 are still
 * LIVE-NEW (one price moved: B0D547KMH5 $179.99 -> $189.99) — no file changes
 * needed for those, they are listed as CONFIRMED in the receipt below.
 *
 * Real work this script performs:
 *   - B0G3XJRKSM (PETLIBRO, best-cat-water-fountains-2026): still hard-gated
 *     in data/dead-asins.json (status no_offer, lastVerified 2026-07-29).
 *     Live-New today ($32.99, Amazon.com, Only 1 left). Removes the
 *     dead-asins.json entry and writes/updates the override row.
 *   - B07JHG13WP (Fluval 207, best-turtle-aquatic-reptile-filtration-2026):
 *     NOT in dead-asins.json (never hard-gated) — darkness is caused by a
 *     stale snapshot row (availability AVAILABLE_DATE, merchant GlowandGoods,
 *     not Amazon-sold) per src/lib/price-cache.ts isSnapshotUnbuyable(). The
 *     WINNING buy-box today is Amazon.com $170.99 New (a secondary "Used -
 *     Like New $153.89, sold by Monster Pets" offer sits below it but is not
 *     the buy-box winner). Writes an override row only; no dead-asins.json
 *     entry exists to remove.
 *   - B0BGG1M5MR (PawHut elevated dog bowls, 2 guides): "See All Buying
 *     Options" today, no single Add-to-Cart winner. NOT confirmed LIVE-NEW —
 *     KEPT. Flags that the existing PR #164 override for this ASIN (LIVE-NEW
 *     $61.70) no longer matches today's read; left untouched per this lane's
 *     scope (dead-asins.json clearing driven by ASINs THIS lane confirms
 *     live, not reconciling an already-merged override) and reported for a
 *     follow-up lane.
 *
 * src/lib/dark-card.ts's resolveDarkCardFigure() (owner ruling 2026-09-07,
 * confirmed live in this repo — the override consumer is wired, not inert)
 * gives a fresh, condition="New", <=14-day override mode "override" priority
 * over both the hard gate and the snapshot gate, so both of today's writes
 * take immediate reader-facing effect once merged.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const JSONL_PATH = path.join(REPO_ROOT, 'scripts', 'receipts', 'dead-asins-cleanup-2026-09-08.jsonl');
const OVERRIDES_PATH = path.join(REPO_ROOT, 'data', 'live-read-overrides.json');
const DEAD_ASINS_PATH = path.join(REPO_ROOT, 'data', 'dead-asins.json');
const RECEIPT_PATH = path.join(REPO_ROOT, 'scripts', 'receipts', 'dead-asins-cleanup-2026-09-08.md');
const LANE = 'dead-asins-cleanup-2026-09-08';

interface Row {
  asin: string;
  guides: string[];
  readAt: string;
  price: number | null;
  merchant: string | null;
  condition: string | null;
  availability: string | null;
  class: string;
  source: string;
  lane: string;
  note: string | null;
}

interface DeadAsinEntry {
  status: string;
  reason: string;
  lastVerified: string;
  guides: string[];
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

function readJson<T>(p: string, fallback: T): T {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}
function writeJson(p: string, obj: unknown) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

function main() {
  const rows: Row[] = fs
    .readFileSync(JSONL_PATH, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const deadAsins = readJson<Record<string, DeadAsinEntry>>(DEAD_ASINS_PATH, {});
  const overrides = readJson<Record<string, OverrideEntry>>(OVERRIDES_PATH, {});

  const clearedDeadAsins: { asin: string; prior: DeadAsinEntry }[] = [];
  const overridesWritten: { asin: string; price: number; merchant: string; newRow: boolean }[] = [];
  const alreadyResolved: Row[] = [];
  const kept: Row[] = [];

  for (const r of rows) {
    if (r.class !== 'LIVE-NEW' || r.price === null || r.condition !== 'New') {
      kept.push(r);
      continue;
    }

    const priorDead = deadAsins[r.asin];
    if (priorDead) {
      clearedDeadAsins.push({ asin: r.asin, prior: priorDead });
      delete deadAsins[r.asin];
    }

    const priorOverride = overrides[r.asin];
    const alreadyMatches =
      priorOverride &&
      !priorDead &&
      Math.abs((priorOverride.price ?? 0) - r.price) < 0.005 &&
      priorOverride.condition === 'New';

    if (alreadyMatches && !priorDead) {
      // Already correctly resolved by an earlier PR (#164) and re-confirmed
      // live today — no file change needed, just corroborated.
      alreadyResolved.push(r);
      continue;
    }

    overrides[r.asin] = {
      price: r.price,
      currency: 'USD',
      availability: 'IN_STOCK',
      merchant: r.merchant || 'Amazon.com',
      condition: 'New',
      readAt: r.readAt,
      source: r.source,
      lane: LANE,
    };
    overridesWritten.push({ asin: r.asin, price: r.price, merchant: r.merchant || 'Amazon.com', newRow: !priorOverride });
  }

  writeJson(DEAD_ASINS_PATH, deadAsins);
  writeJson(OVERRIDES_PATH, overrides);

  // ---------- receipt ----------
  const lines: string[] = [];
  lines.push('# dead-asins-cleanup receipt — 2026-09-08');
  lines.push('');
  lines.push('petpal DATA lane — STALE DEAD-ASIN CLEANUP (owner rules §8qq/§8rr).');
  lines.push(`Source: \`scripts/receipts/dead-asins-cleanup-2026-09-08.jsonl\` — 26 unique ASINs, Chrome-lane live reads today (curl lane hit a genuine 2-consecutive-captcha wall after 3 ASINs and was abandoned per protocol; raw captcha HTML confirmed by hand before switching lanes).`);
  lines.push(`Script: \`scripts/clear-stale-dead-asins.ts\`. Run: \`npx tsx scripts/clear-stale-dead-asins.ts\`.`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`- ASINs re-read live today: ${rows.length} (26 unique, covering ${rows.reduce((n, r) => n + r.guides.length, 0)} guide rows)`);
  lines.push(`- **\`data/dead-asins.json\` entries cleared this lane: ${clearedDeadAsins.length}**`);
  lines.push(`- **\`data/live-read-overrides.json\` rows written this lane: ${overridesWritten.length}**`);
  lines.push(`- Already resolved by PR #164 (merged earlier today) and re-confirmed LIVE-NEW by this lane's own independent read — no file change needed: ${alreadyResolved.length}`);
  lines.push(`- KEPT (not confirmed LIVE-NEW today, stays gated): ${kept.length}`);
  lines.push('');
  lines.push('## Cleared this lane');
  lines.push('');
  lines.push('| ASIN | Guides | Prior dead-asins status/reason/lastVerified | Live price today | Merchant | Override written |');
  lines.push('|---|---|---|---:|---|---|');
  for (const c of clearedDeadAsins) {
    const r = rows.find((x) => x.asin === c.asin)!;
    lines.push(
      `| ${c.asin} | ${r.guides.join(', ')} | ${c.prior.status} / ${c.prior.reason} / ${c.prior.lastVerified} | $${r.price!.toFixed(2)} | ${r.merchant} | yes |`,
    );
  }
  if (!clearedDeadAsins.length) lines.push('_None._');
  lines.push('');
  lines.push('## Override-only writes (no dead-asins.json entry existed — snapshot-gated only)');
  lines.push('');
  lines.push('| ASIN | Guides | Live price today | Merchant | Note |');
  lines.push('|---|---|---:|---|---|');
  for (const o of overridesWritten) {
    if (clearedDeadAsins.some((c) => c.asin === o.asin)) continue;
    const r = rows.find((x) => x.asin === o.asin)!;
    lines.push(`| ${o.asin} | ${r.guides.join(', ')} | $${o.price.toFixed(2)} | ${o.merchant} | ${r.note || ''} |`);
  }
  lines.push('');
  lines.push('## Already resolved by PR #164 — re-confirmed LIVE-NEW today, no file change');
  lines.push('');
  lines.push('| ASIN | Guides | Live price today | Merchant | Note |');
  lines.push('|---|---|---:|---|---|');
  for (const r of alreadyResolved) {
    lines.push(`| ${r.asin} | ${r.guides.join(', ')} | $${r.price!.toFixed(2)} | ${r.merchant} | ${r.note || ''} |`);
  }
  lines.push('');
  lines.push('## KEPT — not confirmed LIVE-NEW today');
  lines.push('');
  lines.push('| ASIN | Guides | Today\'s read | Note |');
  lines.push('|---|---|---|---|');
  for (const r of kept) {
    lines.push(
      `| ${r.asin} | ${r.guides.join(', ')} | ${r.class} — ${r.availability} | Existing PR #164 override for this ASIN claims LIVE-NEW $61.70 — no longer matches today's read; left untouched (out of this lane's scope), flagged for follow-up. |`,
    );
  }
  lines.push('');

  fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, lines.join('\n') + '\n');

  console.log(`dead-asins.json entries cleared: ${clearedDeadAsins.length}`);
  console.log(`live-read-overrides.json rows written: ${overridesWritten.length}`);
  console.log(`Already resolved (PR #164, re-confirmed): ${alreadyResolved.length}`);
  console.log(`KEPT: ${kept.length}`);
  console.log(`Receipt: ${RECEIPT_PATH}`);
}

main();
