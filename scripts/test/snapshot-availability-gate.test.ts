/**
 * §8m snapshot availability gate — regression check (2026-08-10 price-desync triage).
 *
 * Five jobs. Jobs 3-5 exist because a mutation test proved the first version of
 * this file was blind to OVER-gating: inverting parsePicks to force
 * `available: false` on EVERY pick site-wide — de-monetizing all of petpal —
 * passed green, because the corpus loop only inspected rows the predicate had
 * already selected. Under-gating and over-gating are now both covered.
 *
 *  1. Pin the predicate's vocabulary: AVAILABLE_DATE / OUT_OF_STOCK /
 *     UNAVAILABLE gate; IN_STOCK / IN_STOCK_SCARCE / LEADTIME / missing do NOT.
 *     Gating a scarce or leadtime ASIN would fabricate an OutOfStock claim on a
 *     real, working conversion path.
 *  2. UNDER-gating: every snapshot-unbuyable pick, and every pick the
 *     dead-asins.json hard gate covers (dead / no_offer / no_listing), is off
 *     the rendered roster and no longer survives in the site-wide auto-link map.
 *     Owner ruling 2026-08-12 made the hard gate suppress rather than label —
 *     before it, 68 hard-gated picks rendered a card whose CTA had been swapped
 *     for "Currently unavailable on Amazon", which is the labelling the
 *     suppression law forbids. Both gates now converge on one outcome, so this
 *     file tests one outcome.
 *  3. OVER-gating: every `available: false` pick in the corpus is JUSTIFIED by
 *     exactly one of the three legitimate sources (dead-asins.json hard gate,
 *     snapshot gate, hand-set frontmatter). An unjustified one means the wiring
 *     inverted and CTAs are being stripped from buyable products.
 *  4. OVER-gating, positive control: a pinned IN_STOCK pick still renders a CTA,
 *     and the total unavailable-pick count does not exceed the union of the
 *     three justified sources.
 *  5. VACUITY: the snapshot still actually carries availability data. If a
 *     future sync stops emitting `availability`, the gate silently matches
 *     nothing and jobs 2-4 all pass trivially. Assert the terms are present.
 *
 * Run: npx tsx scripts/test/snapshot-availability-gate.test.ts
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAllGuides } from '../../src/lib/guides';
import { getSiteWideProductMap } from '../../src/lib/guide-links';
import {
  getCachedPrice,
  isUnbuyableAvailability,
  snapshotUnavailableLabel,
} from '../../src/lib/price-cache';
import { getDeadAsinEntry, getPickGuardEntry, isHardGateStatus } from '../../src/lib/dead-asin-guard';

let failures = 0;
function check(label: string, ok: boolean) {
  if (!ok) {
    failures++;
    console.error(`  FAIL: ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Raw frontmatter `available` per (guide, pick index) — the ONLY way to tell a
// hand-authored `available: false` (a legitimate editorial gate) apart from one
// that parsePicks forced. Without this, job 3 cannot distinguish a real
// editorial gate from a wiring inversion.
// ---------------------------------------------------------------------------
const guidesDir = path.join(process.cwd(), 'src/content/guides');
const rawAvailable = new Map<string, boolean | undefined>();
// Authored pick order and comparison rows, straight from frontmatter — the
// reference the reindexed table must still agree with.
const rawPickNames = new Map<string, string[]>();
const rawComparison = new Map<string, Array<{ label: string; values: string[] }>>();
for (const file of fs.readdirSync(guidesDir).filter((f) => f.endsWith('.md'))) {
  const slug = file.replace(/\.md$/, '');
  const { data } = matter(fs.readFileSync(path.join(guidesDir, file), 'utf8'));
  const picks = Array.isArray(data.picks) ? (data.picks as Array<Record<string, unknown>>) : [];
  rawPickNames.set(
    slug,
    picks.map((p) => (typeof p?.name === 'string' ? p.name : '')),
  );
  const cmp = data.comparison as { rows?: Array<Record<string, unknown>> } | undefined;
  if (Array.isArray(cmp?.rows)) {
    rawComparison.set(
      slug,
      cmp.rows.map((r) => ({
        label: typeof r?.label === 'string' ? r.label : '',
        values: Array.isArray(r?.values) ? (r.values as unknown[]).map((v) => String(v)) : [],
      })),
    );
  }
  for (const p of picks) {
    const name = typeof p?.name === 'string' ? p.name : '';
    if (!name) continue;
    rawAvailable.set(
      `${slug}::${name}`,
      typeof p?.available === 'boolean' ? p.available : undefined,
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Predicate vocabulary
// ---------------------------------------------------------------------------
for (const gated of ['AVAILABLE_DATE', 'OUT_OF_STOCK', 'UNAVAILABLE', 'available_date']) {
  check(`${gated} must gate`, isUnbuyableAvailability(gated) === true);
}
for (const open of ['IN_STOCK', 'IN_STOCK_SCARCE', 'LEADTIME', 'in_stock_scarce']) {
  check(`${open} must NOT gate`, isUnbuyableAvailability(open) === false);
}
for (const empty of [undefined, null, '']) {
  check(`${String(empty)} must NOT gate`, isUnbuyableAvailability(empty) === false);
}

// ---------------------------------------------------------------------------
// 2 + 3 + 4. Corpus sweep, both directions
// ---------------------------------------------------------------------------
const rows: string[] = [];
const asins = new Set<string>();
let totalPicks = 0;
let totalUnavailable = 0;
let justifiedHardGate = 0;
let justifiedSnapshot = 0;
let justifiedFrontmatter = 0;
let pinnedInStockSeen = false;

// Positive control: a pinned IN_STOCK pick that MUST keep its CTA. If this ASIN
// ever goes unbuyable for real, the snapshot will say so and this pin should be
// moved to another IN_STOCK pick — do not delete the assertion.
const PINNED_IN_STOCK = { slug: 'best-complete-reef-aquarium-systems-2026', asin: 'B0DGQS4NBC' };

let totalSuppressed = 0;
// Hard-gated (dead-asins) suppressions, tracked separately from the snapshot
// rows so each gate keeps its own vacuity floor and its own leak sweep.
const hardGateRows: string[] = [];
const hardGateAsins = new Set<string>();

for (const guide of getAllGuides()) {
  // --- job 2: suppression. Every snapshot-unbuyable pick must be OFF the
  // rendered roster and ON suppressedPicks. ---
  for (const pick of guide.suppressedPicks ?? []) {
    totalSuppressed++;
    const cached = getCachedPrice(pick.asin);
    const isSnapshotGate = !!cached && isUnbuyableAvailability(cached.availability);
    const guardEntry = getPickGuardEntry(pick.asin, guide.slug, pick.rank);
    const isHardGate = !!guardEntry && isHardGateStatus(guardEntry.status);
    if (isSnapshotGate) {
      // Only ASIN-keyed picks can leak into the site-wide auto-link map.
      if (pick.asin) asins.add(pick.asin);
      rows.push(
        `${guide.slug}  ${pick.asin}  ${cached?.availability}  ${cached?.price}  rank=${pick.rank}  guardStatus=${pick.guardStatus ?? '-'}`,
      );
    }
    if (isHardGate) {
      if (pick.asin) hardGateAsins.add(pick.asin);
      hardGateRows.push(
        `${guide.slug}  ${pick.asin ?? '(no asin)'}  rank=${pick.rank}  status=${guardEntry!.status}`,
      );
    }
    // OVER-suppression guard: nothing may be suppressed that one of the two
    // automatic gates selected. Suppression is the most destructive action in
    // this file — it removes a revenue surface — so it must never fire on
    // anything else. Hand-set `available: false` in particular is an editorial
    // call, NOT a liveness fact, and must keep rendering its honest-state card.
    check(
      `${guide.slug}/${pick.asin ?? pick.name} is suppressed but neither the snapshot nor the ` +
        `dead-asins guard says unbuyable — over-suppression`,
      isSnapshotGate || isHardGate,
    );
    check(
      `${guide.slug}/${pick.asin ?? pick.name} suppressed pick must be available:false`,
      pick.available === false,
    );
    check(
      `${guide.slug}/${pick.asin ?? pick.name} suppressionReason must be recorded`,
      pick.suppressionReason === 'snapshot' ||
        pick.suppressionReason === 'dead-asins' ||
        pick.suppressionReason === 'no-listing',
    );
  }

  for (const pick of guide.picks ?? []) {
    totalPicks++;
    const cached = getCachedPrice(pick.asin);
    const guardEntry = getPickGuardEntry(pick.asin, guide.slug, pick.rank);
    const isHardGate = !!guardEntry && isHardGateStatus(guardEntry.status);
    const isSnapshotGate = !!cached && isUnbuyableAvailability(cached.availability);
    const isFrontmatterFalse = rawAvailable.get(`${guide.slug}::${pick.name}`) === false;

    // --- job 2 (inverse): no snapshot-gated pick may survive on the roster ---
    check(
      `${guide.slug}/${pick.asin} is snapshot-unbuyable but still renders as a pick — suppression failed`,
      !isSnapshotGate,
    );
    check(
      `${guide.slug}/${pick.asin} carries snapshotSuppressed but is still on the roster`,
      pick.snapshotSuppressed !== true,
    );
    // --- job 2 (hard gate, owner ruling 2026-08-12): membership of
    // data/dead-asins.json with a hard-gate status removes the pick from every
    // surface. A pick that survives here is being LABELLED instead of
    // suppressed, which is the exact defect this ruling closed. ---
    check(
      `${guide.slug}/${pick.asin ?? pick.name} is hard-gated by data/dead-asins.json ` +
        `but still renders as a pick — it would show a "Currently unavailable" label ` +
        `where a pick should be`,
      !isHardGate,
    );
    check(
      `${guide.slug}/${pick.asin ?? pick.name} carries suppressed but is still on the roster`,
      pick.suppressed !== true,
    );

    // --- job 4: positive control ---
    if (guide.slug === PINNED_IN_STOCK.slug && pick.asin === PINNED_IN_STOCK.asin) {
      pinnedInStockSeen = true;
      check(
        `pinned control ${PINNED_IN_STOCK.asin} snapshot must still read IN_STOCK`,
        cached?.availability === 'IN_STOCK',
      );
      check(
        `pinned IN_STOCK control ${PINNED_IN_STOCK.slug}/${PINNED_IN_STOCK.asin} must KEEP its CTA (available !== false)`,
        pick.available !== false,
      );
    }

    // --- job 3: over-gating. Snapshot-gated picks are gone from this list, so
    // anything unavailable here must be hard-gated or hand-set. ---
    if (pick.available === false) {
      totalUnavailable++;
      if (isHardGate) justifiedHardGate++;
      else if (isSnapshotGate) justifiedSnapshot++;
      else if (isFrontmatterFalse) justifiedFrontmatter++;
      check(
        `${guide.slug}/${pick.asin ?? pick.name} is unavailable with NO justification ` +
          `(not hard-gated, not snapshot-gated, not frontmatter-false) — over-gating / wiring inversion`,
        isHardGate || isSnapshotGate || isFrontmatterFalse,
      );
    } else {
      // Inverse: a buyable pick must not be one the gates should have caught.
      check(
        `${guide.slug}/${pick.asin} is buyable but should be gated`,
        !isHardGate && !isSnapshotGate,
      );
    }
  }

  // --- Comparison-table alignment. The table renders
  // comparison.rows[].values[i] under picks[i]; a mis-trimmed row prints one
  // product's specs under another product's name. Any row that still carries a
  // per-pick value count must match the VISIBLE pick count exactly. ---
  //
  // Checking LENGTH alone is not enough and previously shipped a live defect:
  // best-dog-nail-clippers-grinders has 6 picks but rows authored with only 5
  // values, and its suppressed pick sat at index 3. Reindexing was skipped (the
  // old code required row.length === picks.length) while the headers still
  // shrank, so a styptic powder ended up claiming "Format: Plier clipper" — yet
  // the row length happened to equal the visible count, so a length check
  // passed. Assert VALUE IDENTITY against the raw frontmatter instead.
  if (guide.suppressedPicks?.length && guide.comparison?.rows?.length) {
    const visible = guide.picks?.length ?? 0;
    const rawRows = rawComparison.get(guide.slug) ?? [];
    const keptIdx = rawPickNames
      .get(guide.slug)
      ?.map((name, i) => ({ name, i }))
      .filter(({ name }) => (guide.picks ?? []).some((p) => p.name === name))
      .map(({ i }) => i) ?? [];

    for (const row of guide.comparison.rows) {
      check(
        `${guide.slug} comparison row "${row.label}" has ${row.values.length} values but ` +
          `${visible} visible picks — column misalignment`,
        row.values.length === visible,
      );
      const rawRow = rawRows.find((r) => r.label === row.label);
      if (!rawRow || keptIdx.length !== visible) continue;
      for (let c = 0; c < visible; c++) {
        const expected = rawRow.values[keptIdx[c]];
        check(
          `${guide.slug} row "${row.label}" col ${c} (${(guide.picks ?? [])[c]?.name}) ` +
            `renders ${JSON.stringify(row.values[c])} but its own authored value is ` +
            `${JSON.stringify(expected)} — values shifted off their product`,
          row.values[c] === expected || (row.values[c] === undefined && expected === undefined),
        );
      }
    }
  }
}

check('pinned IN_STOCK control pick must still exist in the corpus', pinnedInStockSeen);

// Count bound: unavailable picks can never exceed the union of justified
// sources. Catches a silent balloon even if per-pick justification were fooled.
const justifiedTotal = justifiedHardGate + justifiedSnapshot + justifiedFrontmatter;
check(
  `unavailable picks (${totalUnavailable}) must not exceed justified sources (${justifiedTotal})`,
  totalUnavailable <= justifiedTotal,
);
// Sanity floor: a corpus where nearly everything is unavailable is a wiring
// inversion, not a market event.
check(
  `unavailable picks (${totalUnavailable}/${totalPicks}) must stay under 25% of the corpus`,
  totalUnavailable < totalPicks * 0.25,
);
// Same floor for suppression, which is the more destructive action: it deletes
// revenue surfaces outright. A mutation that suppresses everything must fail
// loudly here even though the suppressed picks have left `picks` entirely.
check(
  `suppressed picks (${totalSuppressed}/${totalPicks + totalSuppressed}) must stay under 15% of the roster`,
  totalSuppressed < (totalPicks + totalSuppressed) * 0.15,
);
// Every suppression must be attributable to a gate. Rows can overlap (a pick
// can be BOTH hard-gated and snapshot-unbuyable), so the union is what must
// cover the total, and neither gate alone may exceed it.
check(
  `every suppressed pick must be accounted for by a gate ` +
    `(${totalSuppressed} suppressed vs ${rows.length} snapshot + ${hardGateRows.length} hard-gate rows)`,
  totalSuppressed <= rows.length + hardGateRows.length &&
    totalSuppressed >= Math.max(rows.length, hardGateRows.length),
);
// Vacuity floor for the hard gate specifically. data/dead-asins.json is not
// empty, so if this drops to zero the wiring is broken, not the corpus.
check(
  `at least one pick must be suppressed by the dead-asins hard gate (got ${hardGateRows.length})`,
  hardGateRows.length > 0,
);

// ---------------------------------------------------------------------------
// 5. Cross-guide leak: no snapshot-unbuyable ASIN may survive in the site-wide
//    auto-link map (a guide that merely MENTIONS the product in prose must not
//    emit a live /go/ CTA for it).
// ---------------------------------------------------------------------------
const siteWide = getSiteWideProductMap();
for (const asin of hardGateAsins) asins.add(asin);
for (const asin of asins) {
  const leaked = [...siteWide.entries()].filter(([, url]) => url === `/go/${asin}`);
  check(
    `${asin} must not remain in the site-wide auto-link map (keys: ${leaked.map(([k]) => k).join(', ')})`,
    leaked.length === 0,
  );
}

// ---------------------------------------------------------------------------
// 6. Vacuity guard: the snapshot must still carry availability data at all.
// ---------------------------------------------------------------------------
const snapshot: Record<string, { availability?: string | null }> = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'amazon-prices.json'), 'utf8'),
);
const entries = Object.values(snapshot);
const termCounts: Record<string, number> = {};
for (const e of entries) {
  const key = String(e.availability ?? '(missing)').toUpperCase();
  termCounts[key] = (termCounts[key] || 0) + 1;
}
const withAvailability = entries.length - (termCounts['(MISSING)'] || 0);
check(
  `snapshot must carry availability on >=90% of entries (${withAvailability}/${entries.length})`,
  entries.length > 0 && withAvailability / entries.length >= 0.9,
);
// Load-bearing terms — one gated, two non-gated. If a future sync stops
// emitting them the gate matches nothing and every assertion above passes
// vacuously. LEADTIME and OUT_OF_STOCK are deliberately NOT asserted nonzero:
// they legitimately sit at a count of 1 and would break the build on any normal
// restock, which would make this a bad gate rather than a real one.
for (const term of ['IN_STOCK', 'IN_STOCK_SCARCE', 'AVAILABLE_DATE']) {
  check(
    `snapshot must still contain at least one ${term} entry (got ${termCounts[term] || 0})`,
    (termCounts[term] || 0) > 0,
  );
}
check(`at least one pick must be snapshot-gated (got ${rows.length})`, rows.length > 0);

// ---------------------------------------------------------------------------
// 7. UNRESOLVED TEMPLATE TOKENS. best-pet-pool-swim-summer-gear-2026 shipped the
//    literal string "{{pickCountWord}}" to readers because `sources.authorBio`
//    was not in the hand-listed set of fields the interpolator walked. Raw
//    template syntax on a money page. Assert across EVERY string a guide
//    carries, so a newly added prose field cannot reintroduce it.
// ---------------------------------------------------------------------------
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((v) => collectStrings(v, out));
  }
  return out;
}
let tokenLeaks = 0;
for (const guide of getAllGuides()) {
  for (const str of collectStrings(guide)) {
    const m = str.match(/\{\{\s*[A-Za-z][A-Za-z0-9_]*\s*\}\}/);
    if (!m) continue;
    tokenLeaks++;
    check(`${guide.slug} ships an UNRESOLVED template token ${m[0]} to readers`, false);
  }
}
check(`no guide may ship an unresolved {{token}} (found ${tokenLeaks})`, tokenLeaks === 0);

// ---------------------------------------------------------------------------
// 8. topPicks ("Evidence at a Glance") is a SECOND recommendation surface,
//    authored separately from `picks`. Entries are routinely ABBREVIATED forms
//    of the pick name, so an equality join silently kept ten suppressed
//    products — four of them the first entry in the rendered panel. Assert no
//    surviving entry resolves to a suppressed pick under prefix/containment.
// ---------------------------------------------------------------------------
// The assertion must score the SAME way the filter does. An earlier version
// tested only equality/containment and caught 1 of 10 seeded leaks, because the
// abbreviations that cause this bug ("REOLINK 4K 4G Cellular 360 PT" vs
// "REOLINK 4K 4G Cellular Security Camera, No WiFi 360 PT with Auto Tracking")
// are neither substrings nor prefixes of each other. A guard weaker than the fix
// it guards is not a guard.
const normName = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();
const sharedPrefix = (a: string, b: string) => {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
};
const affinity = (a: string, b: string) =>
  a.includes(b) || b.includes(a) ? Math.min(a.length, b.length) : sharedPrefix(a, b);
// Second signal, mirroring the filter: distinctive-token overlap, consulted only
// when the character metric clears nothing. Shared prefix goes blind whenever an
// abbreviation reorders the model detail inside 12 characters ("Coziwow
// Window-Access Catio…" vs "Coziwow Upgraded Catio … with Window Access" shares
// 8), which leaked suppressed products into the panel. A guard weaker than the
// fix it guards is not a guard, so this file scores both signals too.
const TP_STOP = new Set([
  'the', 'and', 'for', 'with', 'pet', 'pets', 'cat', 'cats', 'dog', 'dogs',
  'inch', 'inches', 'large', 'small', 'mini', 'kit', 'kits', 'set', 'sets',
  'pack', 'size', 'sized', 'black', 'white', 'gallon', 'gal', 'lbs', 'oz',
]);
const tpTokens = (v: string) =>
  new Set(v.split(/[^a-z0-9]+/).filter((x) => x.length >= 3 && !TP_STOP.has(x)));
const tpShared = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
};

for (const guide of getAllGuides()) {
  if (!guide.suppressedPicks?.length) continue;
  for (const tp of guide.topPicks ?? []) {
    const t = normName(tp.name);
    let bestSup = -1;
    let bestSupName = '';
    let bestVis = -1;
    for (const sp of guide.suppressedPicks) {
      const a = affinity(t, normName(sp.name));
      if (a > bestSup) { bestSup = a; bestSupName = sp.name; }
    }
    for (const p of guide.picks ?? []) {
      const a = affinity(t, normName(p.name));
      if (a > bestVis) bestVis = a;
    }
    // Violation when the entry resolves more strongly to a suppressed pick than
    // to any surviving one.
    check(
      `${guide.slug} "Evidence at a Glance" still headlines suppressed ` +
        `"${bestSupName.slice(0, 45)}" via topPick "${tp.name.slice(0, 45)}" ` +
        `(suppressed affinity ${bestSup} > visible ${bestVis})`,
      !(bestSup >= 12 && bestSup > bestVis),
    );
    // Token fallback — only meaningful when NEITHER side cleared the character
    // floor, which is the blind spot the character metric has.
    if (bestSup < 12 && bestVis < 12) {
      const tt = tpTokens(t);
      let supTok = 0;
      let visTok = 0;
      let supTokName = '';
      for (const sp of guide.suppressedPicks) {
        const n = tpShared(tt, tpTokens(normName(sp.name)));
        if (n > supTok) { supTok = n; supTokName = sp.name; }
      }
      for (const p of guide.picks ?? []) {
        visTok = Math.max(visTok, tpShared(tt, tpTokens(normName(p.name))));
      }
      check(
        `${guide.slug} "Evidence at a Glance" still headlines suppressed ` +
          `"${supTokName.slice(0, 45)}" via topPick "${tp.name.slice(0, 45)}" ` +
          `(shared tokens ${supTok} > visible ${visTok})`,
        !(supTok >= 2 && supTok > visTok),
      );
    }
  }
}

console.log(rows.join('\n'));
console.log(`\nSnapshot-gated pick rows: ${rows.length} across ${asins.size} distinct ASINs`);
// Reconciliation with the 2026-08-10 triage doc's figure of 54: that is a ROW
// count of picks the snapshot gate NEWLY changes, i.e. excluding rows already
// forced unavailable by the dead-asins.json hard gate. 61 − 7 = 54.
const alreadyHardGated = rows.filter((r) => /guardStatus=(dead|no_offer)/.test(r)).length;
const usedBuyboxNowGated = rows.filter((r) => r.includes('guardStatus=used_buybox'));
console.log(
  `  already hard-gated as dead/no_offer (no state change): ${alreadyHardGated}` +
    ` → newly gated by the snapshot: ${rows.length - alreadyHardGated}`,
);
console.log(
  `  of the newly gated, previously used_buybox (guard kept them live): ${usedBuyboxNowGated.length}\n` +
    usedBuyboxNowGated.map((r) => `    ${r}`).join('\n'),
);
console.log(
  `Corpus picks: ${totalPicks} | unavailable: ${totalUnavailable} ` +
    `(hard-gate ${justifiedHardGate}, snapshot ${justifiedSnapshot}, frontmatter ${justifiedFrontmatter})`,
);
console.log(`Snapshot availability terms: ${JSON.stringify(termCounts)}`);
console.log(
  `Sample label: ${snapshotUnavailableLabel({ price: '$1', lastChecked: '2026-08-10T02:54:02.446Z', availability: 'AVAILABLE_DATE' })}`,
);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('snapshot-availability-gate: PASS');
