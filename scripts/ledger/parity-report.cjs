#!/usr/bin/env node
'use strict';
/**
 * PARITY — ruling (c) shape, run locally.
 *
 * RULING (c) (decision-log/2026-09.md, 2026-09-08 ~20:50Z) governs the CUTOVER PR: byte-
 * identical built output between the two paths, with a NAMED EXCEPTION LIST, each exception
 * signed individually, verifier `VERDICT: MERGE`, owner merge. That is not this PR.
 *
 * This is the same SHAPE, one step earlier and one layer down: shadow-derived legacy files
 * (.ledger-derived/) against the live ones (data/, public/), every difference emitted as a
 * candidate exception row {path, legacyValue, ledgerValue, reason?, receipt?}. `reason` and
 * `receipt` are filled ONLY where a receipt already in the stores proves the ledger value —
 * a live-page read newer than the legacy verdict it contradicts (§8rr.1). Everything else
 * stays OPEN for the petpal site session to adjudicate. Nothing here is signed, and no row
 * here is an exception yet: the cutover's exception list is written against BUILT OUTPUT.
 *
 *   node scripts/ledger/parity-report.cjs
 */

const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const { pkg } = L.requireLedgerPackage();
const { loadLedger, successfulReads } = pkg;

const { REPLAYED } = require('./derive-legacy.cjs');

const JSON_STORES = [
  ['data/amazon-prices.json', L.LEGACY_STORES.prices, 'amazon-prices.json', 'amazon-prices'],
  ['data/dead-asins.json', L.LEGACY_STORES.dead, 'dead-asins.json', 'dead-asins'],
  ['data/live-read-overrides.json', L.LEGACY_STORES.overrides, 'live-read-overrides.json', 'live-read-overrides'],
];

const TEXT_FILES = [
  ['public/llms.txt', L.LEGACY_STORES.llms, path.join('site', 'public', 'llms.txt')],
  ['public/llms-full.txt', L.LEGACY_STORES.llmsFull, path.join('site', 'public', 'llms-full.txt')],
];

/**
 * The one auto-fillable exception class: the stores already hold a live-page read that
 * postdates and contradicts the legacy verdict. §8rr.1 — only a live-page read sets state,
 * so where one exists and is newer, the ledger value is the receipted one and the legacy
 * row is the stale claim. Every other difference is left OPEN on purpose.
 */
function receiptedException(asin, ledgerByAsin, legacyRow) {
  const record = ledgerByAsin.get(asin);
  if (!record) return null;
  const read = successfulReads(record, 'live-page')[0];
  if (!read) return null;
  const legacyAt = legacyRow && (legacyRow.lastVerified || legacyRow.lastChecked || legacyRow.readAt);
  if (legacyAt && Date.parse(read.readAt) <= Date.parse(L.toIsoDateTime(legacyAt))) return null;
  return {
    reason:
      `live-page read ${read.id} (${read.readAt}, availability ${read.availability}) postdates the legacy row's ` +
      `${legacyRow && legacyRow.lastVerified ? 'lastVerified' : 'timestamp'} ${legacyAt} — §8rr.1: only a live-page read sets state, ` +
      `so the ledger's ${record.state} is the receipted value and the legacy row is the stale claim`,
    receipt: read.receipt,
  };
}

function diffJsonStore(label, legacyFile, derivedFile, replayedKey, ledgerByAsin, rows) {
  const legacy = L.readJson(legacyFile, {});
  const derived = L.readJson(derivedFile, {});
  const replayed = new Set(REPLAYED[replayedKey] || []);
  let identical = 0;
  const keys = [...new Set([...Object.keys(legacy), ...Object.keys(derived)])].sort();

  for (const key of keys) {
    const a = legacy[key];
    const b = derived[key];
    if (a !== undefined && b === undefined) {
      const exc = receiptedException(key, ledgerByAsin, a);
      rows.push({
        path: `${label}#${key}`,
        legacyValue: a,
        ledgerValue: null,
        status: exc ? 'exception-with-receipt' : 'OPEN',
        ...(exc || {}),
        ...(exc ? {} : { note: ledgerByAsin.has(key) ? 'record exists but derives no row here' : 'no record — no guide surfaces this key' }),
      });
      continue;
    }
    if (a === undefined && b !== undefined) {
      rows.push({ path: `${label}#${key}`, legacyValue: null, ledgerValue: b, status: 'OPEN', note: 'ledger derives a row the legacy store does not have' });
      continue;
    }
    const fields = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].sort();
    for (const f of fields) {
      const av = a[f];
      const bv = b[f];
      if (JSON.stringify(av) === JSON.stringify(bv)) {
        identical++;
        continue;
      }
      // `guides` is a SET (which guides surface this ASIN), never an ordered list. Comparing
      // it as an array reports the legacy file's insertion order as a ledger difference and
      // buries the rows where the membership genuinely changed.
      if (Array.isArray(av) && Array.isArray(bv) && JSON.stringify([...av].sort()) === JSON.stringify([...bv].sort())) {
        identical++;
        continue;
      }
      const exc = f === 'status' || f === 'reason' || f === 'lastVerified' ? receiptedException(key, ledgerByAsin, a) : null;
      rows.push({
        path: `${label}#${key}.${f}`,
        legacyValue: av === undefined ? null : av,
        ledgerValue: bv === undefined ? null : bv,
        status: exc ? 'exception-with-receipt' : 'OPEN',
        ...(exc || {}),
        ...(replayed.has(f) ? { note: 'REPLAYED field (no record home) — a difference here is a derivation bug, not a ledger correction' } : {}),
      });
    }
  }
  return identical;
}

function diffText(label, legacyFile, derivedFile, rows) {
  if (!fs.existsSync(derivedFile)) {
    rows.push({ path: label, legacyValue: '<file>', ledgerValue: null, status: 'OPEN', note: 'shadow generator produced no file' });
    return { identical: 0, bytesIdentical: false };
  }
  const a = fs.readFileSync(legacyFile, 'utf8');
  const b = fs.readFileSync(derivedFile, 'utf8');
  if (a === b) return { identical: 1, bytesIdentical: true };
  const al = a.split('\n');
  const bl = b.split('\n');
  const aSet = new Set(al);
  const bSet = new Set(bl);
  const onlyLegacy = al.filter((l) => l.trim() && !bSet.has(l));
  const onlyLedger = bl.filter((l) => l.trim() && !aSet.has(l));
  rows.push({
    path: label,
    legacyValue: `${al.length} lines, ${onlyLegacy.length} not reproduced`,
    ledgerValue: `${bl.length} lines, ${onlyLedger.length} new`,
    status: 'OPEN',
    note: 'not byte-identical; first differing lines below',
    sampleLegacyOnly: onlyLegacy.slice(0, 8),
    sampleLedgerOnly: onlyLedger.slice(0, 8),
  });
  return { identical: 0, bytesIdentical: false };
}

function main() {
  const ledger = loadLedger(L.LEDGER_DIR, { idIsAsin: true });
  const ledgerByAsin = new Map();
  for (const rec of ledger.values()) if (rec.asin.current) ledgerByAsin.set(rec.asin.current, rec);

  const rows = [];
  let identicalFields = 0;
  const perFile = {};
  for (const [label, legacyFile, derivedName, replayedKey] of JSON_STORES) {
    const before = rows.length;
    const n = diffJsonStore(label, legacyFile, path.join(L.SHADOW_DIR, 'data', derivedName), replayedKey, ledgerByAsin, rows);
    identicalFields += n;
    perFile[label] = { identicalFields: n, differingRows: rows.length - before };
  }
  const textStatus = {};
  for (const [label, legacyFile, derivedRel] of TEXT_FILES) {
    const before = rows.length;
    const r = diffText(label, legacyFile, path.join(L.SHADOW_DIR, derivedRel), rows);
    textStatus[label] = { bytesIdentical: r.bytesIdentical, differingRows: rows.length - before };
  }

  const counts = {
    identicalFields,
    exceptionWithReceipt: rows.filter((r) => r.status === 'exception-with-receipt').length,
    open: rows.filter((r) => r.status === 'OPEN').length,
  };
  const report = {
    ruling: 'RULING (c) shape, one layer down: shadow-derived legacy files vs the live ones. NOT the cutover exception list (that one is written against BUILT OUTPUT and is signed row by row).',
    notDerivable: {
      'data/unbuyable-prose-baseline.json':
        'prose-debt baseline (guide text occurrences), not product truth — no record field derives it; it must not be listed among the stores the ledger retires at cutover',
    },
    replayedFields: REPLAYED,
    counts,
    perFile,
    textStatus,
    rows,
  };
  fs.writeFileSync(path.join(L.SHADOW_DIR, 'parity-report.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(L.SHADOW_DIR, 'parity-report.md'), render(report));
  process.stdout.write(render(report));
  return 0;
}

function render(r) {
  const out = [];
  out.push('# petpal product-ledger PARITY REPORT (ruling (c) shape, local)');
  out.push('');
  out.push(r.ruling);
  out.push('');
  out.push('## Counts');
  out.push(`- identical fields: ${r.counts.identicalFields}`);
  out.push(`- exception-with-receipt: ${r.counts.exceptionWithReceipt}`);
  out.push(`- OPEN (for the petpal site session): ${r.counts.open}`);
  out.push('');
  out.push('## Per file');
  for (const [file, v] of Object.entries(r.perFile)) out.push(`- ${file}: ${v.identicalFields} identical fields, ${v.differingRows} candidate rows`);
  for (const [file, v] of Object.entries(r.textStatus)) out.push(`- ${file}: byte-identical ${v.bytesIdentical ? 'YES' : 'NO'} (${v.differingRows} row(s))`);
  out.push('');
  out.push('## Not derivable');
  for (const [file, why] of Object.entries(r.notDerivable)) out.push(`- ${file}: ${why}`);
  out.push('');
  out.push('## Exception rows WITH a receipt (auto-filled: a live-page read postdates the legacy verdict)');
  const exc = r.rows.filter((x) => x.status === 'exception-with-receipt');
  if (!exc.length) out.push('- none');
  for (const x of exc.slice(0, 30)) {
    out.push(`- \`${x.path}\` legacy=${JSON.stringify(x.legacyValue)} ledger=${JSON.stringify(x.ledgerValue)}`);
    out.push(`  - reason: ${x.reason}`);
  }
  if (exc.length > 30) out.push(`- … ${exc.length - 30} more (parity-report.json)`);
  out.push('');
  out.push('## OPEN rows (grouped)');
  const open = r.rows.filter((x) => x.status === 'OPEN');
  const byNote = {};
  for (const x of open) {
    const k = `${x.path.split('#')[0]} — ${x.note || x.path.split('.').pop()}`;
    (byNote[k] = byNote[k] || []).push(x);
  }
  for (const [k, list] of Object.entries(byNote).sort()) {
    out.push(`- ${k}: ${list.length}`);
    for (const x of list.slice(0, 3)) out.push(`  - e.g. \`${x.path}\` legacy=${JSON.stringify(x.legacyValue)} ledger=${JSON.stringify(x.ledgerValue)}`);
  }
  out.push('');
  return out.join('\n');
}

if (require.main === module) process.exit(main());
module.exports = { main };
