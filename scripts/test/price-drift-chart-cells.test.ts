/**
 * Regression test for the chart-cell pass of the price-drift detector
 * (W4 #156 H1, 2026-09): `scripts/audit/price-drift-detector.ts` compared
 * frontmatter `picks[].price` to the live buy-box snapshot but never looked
 * at `comparison.rows` — the chart table rendered beside the pick cards.
 * #156's W4 caught a "3-Year Cost" chart cell reading $29 against a $24
 * snapshot buy-box on best-gps-trackers-for-cats-2026 (the AirTag column,
 * fixed to $24 on merge). More guides are converting to chart rows, so this
 * pass and its test exist to see that class BEFORE it merges again.
 *
 * `analyzeGuideChartCells` and `chartCellExitCode` are extracted as pure
 * functions in the detector precisely so this suite runs on small fixtures
 * instead of the live corpus (whose drift count changes as guides get
 * fixed, which would make a corpus-coupled test flaky by construction — the
 * repo's own instrument-defect lesson on pinning fixtures to live data).
 *
 * Uses Node's native test runner (node:test / node:assert), matching this
 * repo's `scripts/test/placeholder-price.test.ts` convention:
 *
 *   npx tsx --test scripts/test/price-drift-chart-cells.test.ts
 *   (or `npm run test:price-drift-charts`)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeGuideChartCells,
  chartCellExitCode,
  type RawGuideChart,
  type SnapshotEntry,
} from '../audit/price-drift-detector';

/** A guide with one price-shaped row and N picks, all wired to distinct
 *  fake ASINs (never real ones — dead-asins.json is a live file and a real
 *  ASIN colliding with it would make this fixture flaky). */
function guide(opts: {
  slug?: string;
  rowLabel: string;
  values: unknown[];
  asins?: (string | undefined)[];
}): RawGuideChart {
  const asins = opts.asins ?? opts.values.map((_, i) => `FAKEASIN0${i}`);
  return {
    slug: opts.slug ?? 'fixture-guide',
    picks: opts.values.map((_, i) => ({
      id: `${opts.slug ?? 'fixture-guide'}#rank${i + 1}`,
      name: `Fixture Pick ${i + 1}`,
      asin: asins[i],
    })),
    comparisonRows: [{ label: opts.rowLabel, values: opts.values }],
  };
}

/** Only the STRICT kind (values.length > picks.length) counts toward
 *  --strict-charts — column-short is informational. Mirrors the filter
 *  main() applies before calling chartCellExitCode. */
const strictMismatchCount = (columnMismatches: { kind: 'column-mismatch' | 'column-short' }[]) =>
  columnMismatches.filter((m) => m.kind === 'column-mismatch').length;

function snapshotOf(entries: Record<string, Partial<SnapshotEntry>>): Record<string, SnapshotEntry> {
  const out: Record<string, SnapshotEntry> = {};
  for (const [asin, e] of Object.entries(entries)) {
    out[asin] = { price: '$0', lastChecked: '2026-09-03T00:00:00.000Z', ...e };
  }
  return out;
}

test('exact match: chart cell equals the buy-box exactly', () => {
  const g = guide({ rowLabel: 'Price', values: ['$79.00'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$79.00' } });
  const { compared, excluded } = analyzeGuideChartCells(g, snap);
  assert.equal(excluded.length, 0);
  assert.equal(compared.length, 1);
  assert.equal(compared[0].status, 'exact-match');
  assert.equal(compared[0].deltaPct, 0);
  assert.equal(compared[0].listPriceCell, false);
});

test('drift: chart cell disagrees with the buy-box past the 5% band', () => {
  const g = guide({ rowLabel: 'Price (verified 2026-08-10)', values: ['$79.00'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$55.30' } });
  const { compared } = analyzeGuideChartCells(g, snap);
  assert.equal(compared.length, 1);
  assert.equal(compared[0].status, 'drift');
  assert.ok(compared[0].deltaPct > 5);
});

test('list-price-cell: chart cell equals the snapshot listPrice, not the buy-box (D1 class)', () => {
  // The pinned real-corpus shape: a DIRECT price label (not a derived
  // multi-year total) whose frozen cell equals the list price the H1 fix
  // moved away from, while the live buy-box has since dropped.
  const g = guide({ rowLabel: 'Price (verified 2026-08-10)', values: ['$29.00'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$24.00', listPrice: '$29.00' } });
  const { compared } = analyzeGuideChartCells(g, snap);
  assert.equal(compared.length, 1);
  assert.equal(compared[0].listPriceCell, true);
  assert.equal(compared[0].status, 'drift');
});

test('list-price-cell is NOT flagged when the cell equals the buy-box even though a listPrice exists', () => {
  const g = guide({ rowLabel: 'Price', values: ['$24.00'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$24.00', listPrice: '$29.00' } });
  const { compared } = analyzeGuideChartCells(g, snap);
  assert.equal(compared[0].listPriceCell, false);
  assert.equal(compared[0].status, 'exact-match');
});

// --- multi-$ cell handling (fix round, PR #157 review) ---------------------
// parsePriceToNumber itself is untouched (still averages every $ it finds —
// correct for a genuine range). These three cases exercise the chart-cell-
// local wrapper (parseChartCellPrice) that sits in front of it.

test('multi-price-first: reference-price language takes the FIRST $ amount, not the average', () => {
  // Pinned real-corpus false-positive (PR #157 review): this cell used to
  // average $169.96 and $189.99 to $179.98 -> reported 5.6% drift against a
  // $169.96 buy-box. The current price is $169.96; $189.99 is a reference
  // (list) figure, not a second real price.
  const g = guide({
    rowLabel: 'Price (checked September 2, 2026)',
    values: ['$169.96, against a $189.99 list price'],
  });
  const snap = snapshotOf({ FAKEASIN00: { price: '$169.96' } });
  const { compared, excluded } = analyzeGuideChartCells(g, snap);
  assert.equal(excluded.length, 0);
  assert.equal(compared.length, 1);
  assert.equal(compared[0].cellPrice, 169.96);
  assert.equal(compared[0].note, 'multi-price-first');
  assert.equal(compared[0].status, 'exact-match');
});

test('multi-price-first also recognizes "was"/"MSRP"/"reg"/"retail"/"down from"/"vs" markers', () => {
  const cases: Array<[string, number]> = [
    ['$197.89 (was $210.00)', 197.89],
    ['$20.99 (list $27.98)', 20.99],
    ['$149.99 MSRP $189.99', 149.99],
    ['$59.99, reg $79.99', 59.99],
    ['$44.00 retail $60.00', 44.0],
    ['$99.00, down from $129.00', 99.0],
    ['$25.00 vs $40.00 elsewhere', 25.0],
  ];
  for (const [cellRaw, expected] of cases) {
    const g = guide({ rowLabel: 'Price', values: [cellRaw] });
    const snap = snapshotOf({ FAKEASIN00: { price: `$${expected.toFixed(2)}` } });
    const { compared } = analyzeGuideChartCells(g, snap);
    assert.equal(compared.length, 1, `expected a compared row for ${JSON.stringify(cellRaw)}`);
    assert.equal(compared[0].cellPrice, expected, `wrong parsed price for ${JSON.stringify(cellRaw)}`);
    assert.equal(compared[0].note, 'multi-price-first');
  }
});

test('a genuine range with 2+ $ amounts keeps the existing midpoint-averaging behavior (parsePriceToNumber unchanged)', () => {
  // "$X-$Y" — the exact shape parsePriceToNumber has always midpoint-averaged.
  // Must NOT be excluded as multi-price and must NOT carry the
  // multi-price-first note (it's genuinely two ends of one range, not a
  // current-price-plus-reference-figure cell).
  const g = guide({ rowLabel: 'Price', values: ['$200.00-$300.00', '$100.00 to $200.00'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$250.00' }, FAKEASIN01: { price: '$150.00' } });
  const { compared, excluded } = analyzeGuideChartCells(g, snap);
  assert.equal(excluded.length, 0);
  assert.equal(compared.length, 2);
  assert.equal(compared[0].cellPrice, 250); // midpoint of 200/300
  assert.equal(compared[0].note, undefined);
  assert.equal(compared[0].status, 'exact-match');
  assert.equal(compared[1].cellPrice, 150); // midpoint of 100/200
  assert.equal(compared[1].note, undefined);
  assert.equal(compared[1].status, 'exact-match');
});

test('multi-price: 2+ $ amounts that are neither a range nor reference-price prose are excluded, never guessed at', () => {
  // Pinned real-corpus shape: three unrelated $ figures in one sentence,
  // no range dash/"to", no list/was/MSRP/reg/retail/vs marker.
  const g = guide({
    rowLabel: '1-year total cost',
    values: ['$718.88 at Bronze ($643.88 at the $524.00 promotional price)'],
  });
  const snap = snapshotOf({ FAKEASIN00: { price: '$718.88' } });
  const { compared, excluded } = analyzeGuideChartCells(g, snap);
  assert.equal(compared.length, 0);
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].reason, 'multi-price');
});

test('column-short: values.length < picks.length is informational (an intentionally scoped table), not a defect', () => {
  // Pinned real-corpus shape: how-to-set-up-gps-dog-fence-boundary-training-
  // 2026 scopes every comparison row to its 3 GPS-fence picks out of 7 total
  // (4 unrelated accessories never belonged in the table). The render layer
  // falls back to "–" for the missing columns by design.
  const g = guide({ rowLabel: 'Price', values: ['$10.00', '$20.00'] });
  // Force a 3rd pick with no corresponding value.
  g.picks.push({ id: 'fixture-guide#rank3', name: 'Fixture Pick 3', asin: 'FAKEASIN02' });
  const snap = snapshotOf({ FAKEASIN00: { price: '$10.00' }, FAKEASIN01: { price: '$20.00' } });
  const { compared, excluded, columnMismatches } = analyzeGuideChartCells(g, snap);
  assert.equal(columnMismatches.length, 1);
  assert.equal(columnMismatches[0].kind, 'column-short');
  assert.equal(columnMismatches[0].valuesLength, 2);
  assert.equal(columnMismatches[0].picksLength, 3);
  // The whole row is still unusable for per-cell comparison once columns
  // can't be mapped 1:1 — no per-cell output either way.
  assert.equal(compared.length, 0);
  assert.equal(excluded.length, 0);
  // Informational only: never counts toward --strict-charts.
  assert.equal(
    chartCellExitCode(true, {
      drift: 0,
      columnMismatch: columnMismatches.filter((m) => m.kind === 'column-mismatch').length,
    }),
    0,
    'column-short must NOT trip --strict-charts'
  );
});

test('column-mismatch (strict): values.length > picks.length has no legitimate reading and is a real defect', () => {
  const g = guide({ rowLabel: 'Price', values: ['$10.00', '$20.00', '$30.00'] });
  // Only 2 picks for 3 chart values — a column points at nothing.
  g.picks.pop();
  const snap = snapshotOf({ FAKEASIN00: { price: '$10.00' }, FAKEASIN01: { price: '$20.00' } });
  const { compared, excluded, columnMismatches } = analyzeGuideChartCells(g, snap);
  assert.equal(columnMismatches.length, 1);
  assert.equal(columnMismatches[0].kind, 'column-mismatch');
  assert.equal(columnMismatches[0].valuesLength, 3);
  assert.equal(columnMismatches[0].picksLength, 2);
  assert.equal(compared.length, 0);
  assert.equal(excluded.length, 0);
  // Strict, unlike column-short: trips --strict-charts.
  assert.equal(
    chartCellExitCode(true, {
      drift: 0,
      columnMismatch: columnMismatches.filter((m) => m.kind === 'column-mismatch').length,
    }),
    1,
    'column-mismatch (values > picks) MUST trip --strict-charts'
  );
});

test('derived-cost excluded: a multi-year cost row is not compared unless the subscription is $0', () => {
  const g = guide({ rowLabel: 'Three-year cost of ownership', values: ['$367.00', '$627.00'] });
  g.comparisonRows.push({ label: 'Subscription', values: ['Mandatory — $10/mo', '$99/year'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$367.00' }, FAKEASIN01: { price: '$627.00' } });
  const { compared, excluded } = analyzeGuideChartCells(g, snap);
  assert.equal(compared.length, 0);
  assert.equal(excluded.length, 2);
  assert.ok(excluded.every((e) => e.reason === 'derived-cost'));
});

test('derived-cost IS compared when the guide\'s own Subscription row says $0 for that column', () => {
  // Pinned real-corpus shape: gps-trackers-for-cats "3-Year Cost" column for
  // the AirTag, whose Subscription row says "None — $0".
  const g = guide({ rowLabel: '3-Year Cost', values: ['~$627', '~$24'] });
  g.comparisonRows.push({ label: 'Subscription', values: ['Prepaid only, no monthly option', 'None — $0'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$99.00' }, FAKEASIN01: { price: '$24.00' } });
  const { compared, excluded } = analyzeGuideChartCells(g, snap);
  // Column 0 has a real subscription -> excluded derived-cost.
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].reason, 'derived-cost');
  assert.equal(excluded[0].colIndex, 0);
  // Column 1 has Subscription = None/$0 -> compared, and equals the buy-box.
  assert.equal(compared.length, 1);
  assert.equal(compared[0].colIndex, 1);
  assert.equal(compared[0].status, 'exact-match');
  assert.equal(compared[0].derived, true);
});

test('non-price label is ignored entirely — not even counted as a matched row', () => {
  const g = guide({ rowLabel: 'Battery Life', values: ['4-6 days', '2-5 days'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$10.00' }, FAKEASIN01: { price: '$20.00' } });
  const { compared, excluded, columnMismatches, matchedLabels } = analyzeGuideChartCells(g, snap);
  assert.equal(matchedLabels.length, 0);
  assert.equal(compared.length, 0);
  assert.equal(excluded.length, 0);
  assert.equal(columnMismatches.length, 0);
});

test('unparseable: a non-numeric cell on a price-shaped row is excluded, not treated as a fake zero', () => {
  const g = guide({ rowLabel: 'Price', values: ['Currently unavailable on Amazon'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$10.00' } });
  const { compared, excluded } = analyzeGuideChartCells(g, snap);
  assert.equal(compared.length, 0);
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].reason, 'unparseable');
});

test('a $0 cell on a non-subscription price label is unparseable, never zero-editorial drift', () => {
  const g = guide({ rowLabel: 'Required recurring cost', values: ['None — $0'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$10.00' } });
  const { excluded } = analyzeGuideChartCells(g, snap);
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].reason, 'unparseable');
});

test('a $0 cell on a subscription-labeled price row is a legitimate value, not excluded', () => {
  // Buy-box must be nonzero here on purpose: a $0 snapshot price hits the
  // SAME "unavailable"/unpriced gate the pick pass uses (snapshotPrice<=0),
  // which is a different exclusion than the one this case is proving —
  // that a $0 CELL under a subscription label parses as a real value.
  const g = guide({ rowLabel: 'Subscription cost', values: ['None — $0'] });
  const snap = snapshotOf({ FAKEASIN00: { price: '$59.99' } });
  const { compared, excluded } = analyzeGuideChartCells(g, snap);
  assert.equal(excluded.length, 0);
  assert.equal(compared.length, 1);
  assert.equal(compared[0].cellPrice, 0);
});

test('no-asin / no-snapshot: chart cells reuse the pick pass\'s exclusion vocabulary', () => {
  const g = guide({ rowLabel: 'Price', values: ['$10.00', '$20.00'], asins: [undefined, 'FAKEASIN99'] });
  const snap = snapshotOf({}); // FAKEASIN99 not present
  const { excluded } = analyzeGuideChartCells(g, snap);
  assert.equal(excluded.length, 2);
  assert.deepEqual(
    excluded.map((e) => e.reason).sort(),
    ['no-asin', 'no-snapshot']
  );
});

// --- mutation check: a chart-cell DRIFT trips --strict-charts --------------
test('mutation: a planted chart-cell DRIFT trips --strict-charts; a clean guide does not', () => {
  const clean = guide({ rowLabel: 'Price', values: ['$79.00'] });
  const cleanSnap = snapshotOf({ FAKEASIN00: { price: '$79.00' } });
  const cleanResult = analyzeGuideChartCells(clean, cleanSnap);
  const cleanDrift = cleanResult.compared.filter((c) => c.status === 'drift').length;
  assert.equal(cleanDrift, 0, 'control corpus must be clean before the plant');
  assert.equal(
    chartCellExitCode(true, { drift: cleanDrift, columnMismatch: strictMismatchCount(cleanResult.columnMismatches) }),
    0,
    '--strict-charts must NOT trip on a clean guide'
  );
  assert.equal(
    chartCellExitCode(false, { drift: cleanDrift, columnMismatch: strictMismatchCount(cleanResult.columnMismatches) }),
    0,
    'default (no flag) is always 0'
  );

  // Plant the defect: same guide, buy-box now disagrees past the drift band.
  const planted = guide({ rowLabel: 'Price', values: ['$79.00'] });
  const plantedSnap = snapshotOf({ FAKEASIN00: { price: '$55.30' } });
  const plantedResult = analyzeGuideChartCells(planted, plantedSnap);
  const plantedDrift = plantedResult.compared.filter((c) => c.status === 'drift').length;
  assert.ok(plantedDrift > 0, 'plant must actually produce a DRIFT finding');
  assert.equal(
    chartCellExitCode(true, { drift: plantedDrift, columnMismatch: strictMismatchCount(plantedResult.columnMismatches) }),
    1,
    '--strict-charts must trip (exit 1) once a chart-cell DRIFT exists'
  );
  assert.equal(
    chartCellExitCode(false, { drift: plantedDrift, columnMismatch: strictMismatchCount(plantedResult.columnMismatches) }),
    0,
    'without --strict-charts the same DRIFT stays report-only (exit 0)'
  );

  // Column-mismatch must trip the gate the same way.
  assert.equal(chartCellExitCode(true, { drift: 0, columnMismatch: 1 }), 1);
  assert.equal(chartCellExitCode(false, { drift: 0, columnMismatch: 1 }), 0);
});
