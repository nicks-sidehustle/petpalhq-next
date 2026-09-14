#!/usr/bin/env node
'use strict';
/**
 * DERIVATION — records -> the legacy files' content, into a SHADOW location.
 *
 * `npm run ledger:derive` writes .ledger-derived/ ONLY. It never touches data/*.json or
 * public/*.txt: the live files stay the renderer's sources until the cutover PR that
 * ruling (c) governs, and this lane is additive (§8oo).
 *
 * The point of the shadow tree is the parity run (scripts/ledger/parity-report.cjs): if the
 * ledger can reproduce every legacy file from the records, the cutover is a no-op for the
 * reader — and every place it CANNOT is a candidate exception row that has to be seen,
 * receipted and signed one at a time.
 *
 * DERIVED vs REPLAYED. A field the record schema owns is re-derived from record fields —
 * that is what is actually under test. A legacy column the schema has no home for
 * (merchantId, savingsPercent, the override `lane`, …) is REPLAYED from the read's receipt,
 * which holds the source row verbatim. Replayed fields are marked in the parity report so
 * nobody reads them as proof the ledger holds them.
 *
 *   node scripts/ledger/derive-legacy.cjs
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const L = require('./lib.cjs');

const { pkg } = L.requireLedgerPackage();
const { loadLedger, successfulReads } = pkg;

/** Legacy columns no record field owns. Replayed from the read receipt, never "derived". */
const REPLAYED = {
  // Shrunk by template PR #29: merchantId, the observed strike-through (listPrice /
  // listPriceBasis / savingsPercent) and the override `lane` are now RECORD FIELDS and are
  // derived, not replayed. What remains is the sync's own bookkeeping — `stale`,
  // `pendingUnbuyableSince`, `lastReadAt` — which describes the SYNC's state, not the
  // product's, and `availability`, whose legacy enum is finer than the record's.
  'amazon-prices': ['availability', 'pendingUnbuyableSince', 'lastReadAt', 'stale'],
  'live-read-overrides': [],
};

const LIVE_TO_LEGACY = {
  'in-stock': 'IN_STOCK',
  'out-of-stock': 'OUT_OF_STOCK',
  'no-buy-box': 'UNAVAILABLE',
  'not-found': 'NOT_FOUND',
};

const CONDITION_TO_LEGACY = { new: 'New', used: 'used-only', unknown: 'unavailable' };

function readOfKind(record, kind) {
  return successfulReads(record, kind)[0] || null;
}

function receiptRow(read) {
  return (read && L.parseLegacyReceipt(read.receipt)) || {};
}

/** data/amazon-prices.json — the Creators-API snapshot, keyed by ASIN. */
function deriveAmazonPrices(ledger) {
  const out = {};
  for (const record of [...ledger.values()].sort((a, b) => a.productId.localeCompare(b.productId))) {
    const asin = record.asin.current;
    const read = readOfKind(record, 'api');
    if (!asin || !read) continue;
    // Start from the REPLAYED columns (key order and key presence included — a column the
    // legacy row never had must not appear as `null` in the shadow file, or the parity run
    // reports 97 differences that are entirely the derivation's own invention), then
    // overwrite every column a record field actually owns. Those overwrites are what is
    // under test; the rest is replay.
    const row = { ...receiptRow(read) };
    row.price = read.price ? read.price.formatted : null;
    row.lastChecked = read.readAt;
    if ('merchantName' in row || read.merchant !== null) row.merchantName = read.merchant;
    if ('merchantId' in row || read.merchantId != null) row.merchantId = read.merchantId ?? null;
    // The observed strike-through round-trips out of the read's own field now, not the receipt.
    if ('listPrice' in row || read.observedListPrice) {
      row.listPrice = read.observedListPrice ? read.observedListPrice.formatted : null;
      row.listPriceBasis = read.observedListPrice ? read.observedListPrice.basis : null;
      row.savingsPercent = read.observedListPrice ? read.observedListPrice.savingsPercent : null;
    }
    out[asin] = row;
  }
  return out;
}

/**
 * data/dead-asins.json — the hard guard list.
 *
 * A record the ledger calls LIVE on a live-page read does NOT appear here even if the legacy
 * store lists it: that is the whole §8rr.1 correction, and every such row surfaces in the
 * parity report as a candidate exception with the live read as its receipt.
 *
 * `guides` is DERIVED from frontmatter on every run — slot membership is never stored on a
 * record (the schema refuses the key by name).
 */
function deriveDeadAsins(ledger, guidesByAsin) {
  const out = {};
  for (const record of [...ledger.values()].sort((a, b) => a.productId.localeCompare(b.productId))) {
    const asin = record.asin.current;
    // A not-sold-on-amazon record has no ASIN, so it has no key in an ASIN-keyed store. Its
    // legacy counterpart is the `<slug>#<rank>` row, which RULING 2 retires at cutover — slot
    // membership derives from frontmatter, so nothing here reproduces it.
    if (!asin) continue;
    const live = readOfKind(record, 'live-page');
    const legacyHold = record.decisions.find((d) => d.action === 'held' && /legacy dead-asin entry/.test(d.reason));

    if (record.state === 'DARK' || record.state === 'GONE') {
      // Legacy columns this store carries that no record field owns (`pick`, a free-text
      // product name) are replayed from the row's own decision receipt when there is one.
      const row = { ...(legacyHold ? L.parseLegacyReceipt(legacyHold.receipt) || {} : {}) };
      // `used_buybox` is a claim about the WINNING OFFER'S CONDITION, not about the absence
      // of a buy box: the legacy store uses it for "Buy Box winner condition=Used". A live
      // read that saw no featured offer at all is `no_offer`. The first pass conflated the
      // two and the parity run caught it — the shadow llms-full.txt un-suppressed a pick
      // (B00006OALW) because the generator gates on `no_offer` and not on `used_buybox`.
      row.status =
        record.state === 'GONE' ? 'dead' : live && live.condition === 'used' ? 'used_buybox' : 'no_offer';
      row.reason = `live-page read ${live.id}: availability ${live.availability}${live.merchant ? `, merchant ${live.merchant}` : ''}`;
      row.lastVerified = live.readAt.slice(0, 10);
      row.guides = guidesByAsin.get(asin) || [];
      out[asin] = row;
      continue;
    }
    // No live-page verdict. The legacy row is provenance only; it is replayed so the parity
    // run compares like with like, and its unconfirmed status is the finding, not the row.
    if (legacyHold && record.state === 'UNKNOWN') {
      const row = { ...(L.parseLegacyReceipt(legacyHold.receipt) || {}) };
      row.guides = guidesByAsin.get(asin) || [];
      out[asin] = row;
    }
  }
  return out;
}

/** data/live-read-overrides.json — every live-page read the ledger holds. */
function deriveOverrides(ledger) {
  const out = {};
  for (const record of [...ledger.values()].sort((a, b) => a.productId.localeCompare(b.productId))) {
    const asin = record.asin.current;
    const read = readOfKind(record, 'live-page');
    if (!asin || !read) continue;
    const row = { ...receiptRow(read) }; // nothing replayed: every column is a record field
    row.price = read.price ? read.price.amount : null;
    row.lane = read.lane ?? null;
    row.currency = read.price ? read.price.currency : 'USD';
    row.availability = LIVE_TO_LEGACY[read.availability] || 'UNKNOWN';
    row.merchant = read.merchant;
    row.condition = CONDITION_TO_LEGACY[read.condition] || 'unavailable';
    row.readAt = read.readAt;
    row.source = read.source;
    out[asin] = row;
  }
  return out;
}

/**
 * Every ASIN's guide list, recomputed from frontmatter. This is the DERIVED half of
 * dead-asins.json and the reason `guides` is a forbidden record key.
 */
function guideMembership() {
  const map = new Map();
  const { rows } = L.loadPicks();
  for (const row of rows) {
    if (!row.asin) continue;
    if (!map.has(row.asin)) map.set(row.asin, []);
    const list = map.get(row.asin);
    if (!list.includes(row.guide)) list.push(row.guide);
  }
  return map;
}

/**
 * public/llms.txt + public/llms-full.txt.
 *
 * These are GENERATED FILES, not stores: the repo's own generators build them from guide
 * frontmatter plus the two ASIN stores. So the derivation runs THE SAME generators, in a
 * shadow root whose data/ is the ledger-derived stores and whose src/content/guides is the
 * real corpus. Anything that differs from public/*.txt is therefore a difference the
 * LEDGER caused, not a difference in the generator.
 */
function deriveLlms(shadowData, outDir) {
  const site = path.join(outDir, 'site');
  fs.rmSync(site, { recursive: true, force: true });
  fs.mkdirSync(path.join(site, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(site, 'data'), { recursive: true });
  fs.mkdirSync(path.join(site, 'public'), { recursive: true });
  fs.mkdirSync(path.join(site, 'src', 'content'), { recursive: true });
  fs.symlinkSync(L.GUIDES_DIR, path.join(site, 'src', 'content', 'guides'));
  for (const name of ['amazon-prices.json', 'dead-asins.json', 'live-read-overrides.json']) {
    const from = path.join(shadowData, name);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(site, 'data', name));
  }
  const results = {};
  for (const [script, outfile] of [
    ['generate-llms-txt.mjs', 'llms.txt'],
    ['generate-llms-full-txt.mjs', 'llms-full.txt'],
  ]) {
    fs.copyFileSync(path.join(L.ROOT, 'scripts', script), path.join(site, 'scripts', script));
    try {
      execFileSync(process.execPath, [path.join(site, 'scripts', script)], { cwd: site, stdio: 'pipe' });
      results[outfile] = path.join(site, 'public', outfile);
    } catch (e) {
      results[outfile] = { error: String(e.stderr || e.message).slice(0, 400) };
    }
  }
  return results;
}

function main() {
  const ledger = loadLedger(L.LEDGER_DIR, { idIsAsin: true });
  const guidesByAsin = guideMembership();
  const outData = path.join(L.SHADOW_DIR, 'data');
  fs.mkdirSync(outData, { recursive: true });

  const files = {
    'amazon-prices.json': deriveAmazonPrices(ledger),
    'dead-asins.json': deriveDeadAsins(ledger, guidesByAsin),
    'live-read-overrides.json': deriveOverrides(ledger),
  };
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(outData, name), JSON.stringify(body, null, 2) + '\n');
  }

  // unbuyable-prose-baseline.json is NOT product truth — it is a prose-debt baseline whose
  // rows are guide occurrences, not products. Nothing in a product record derives it, so it
  // is not derivable and must not be listed among the stores the ledger retires at cutover.
  fs.writeFileSync(
    path.join(outData, 'unbuyable-prose-baseline.NOT-DERIVABLE.txt'),
    'data/unbuyable-prose-baseline.json holds accepted PROSE debt (guide text occurrences), not product truth.\n' +
      'No product-record field derives it. It stays a standalone gate baseline after cutover.\n'
  );

  const llms = deriveLlms(outData, L.SHADOW_DIR);
  const summary = {
    records: ledger.size,
    rows: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, Object.keys(v).length])),
    replayedFields: REPLAYED,
    llms,
  };
  fs.writeFileSync(path.join(L.SHADOW_DIR, 'derive-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  process.stdout.write(
    `ledger:derive -> ${L.SHADOW_DIR}\n` +
      `  records: ${ledger.size}\n` +
      Object.entries(summary.rows).map(([k, v]) => `  ${k}: ${v} rows\n`).join('') +
      Object.entries(llms).map(([k, v]) => `  ${k}: ${typeof v === 'string' ? 'generated' : 'FAILED ' + v.error}\n`).join('')
  );
  return 0;
}

if (require.main === module) process.exit(main());
module.exports = { deriveAmazonPrices, deriveDeadAsins, deriveOverrides, guideMembership, REPLAYED };
