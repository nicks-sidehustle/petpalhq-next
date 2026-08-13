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
// Authored topPicks — the over-removal check needs what was WRITTEN, not what rendered.
const rawTopPicks = new Map<string, Array<{ name: string; pickRef?: string }>>();
for (const file of fs.readdirSync(guidesDir).filter((f) => f.endsWith('.md'))) {
  const slug = file.replace(/\.md$/, '');
  const { data } = matter(fs.readFileSync(path.join(guidesDir, file), 'utf8'));
  const picks = Array.isArray(data.picks) ? (data.picks as Array<Record<string, unknown>>) : [];
  rawPickNames.set(
    slug,
    picks.map((p) => (typeof p?.name === 'string' ? p.name : '')),
  );
  const tps = Array.isArray(data.topPicks) ? (data.topPicks as Array<Record<string, unknown>>) : [];
  if (tps.length) {
    rawTopPicks.set(
      slug,
      tps.map((t) => ({
        name: typeof t?.name === 'string' ? t.name : '',
        pickRef: typeof t?.pickRef === 'string' ? t.pickRef : undefined,
      })),
    );
  }
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
// 8. topPicks ("Evidence at a Glance") — IDENTITY, not similarity.
//
// History, because it is the whole justification for this shape. topPicks
// entries carried no reference to the pick they describe, so suppression had to
// re-derive the link from authored prose: first exact match, then shared prefix
// when abbreviations broke it, then distinctive-token overlap when reordered
// model detail broke that. Each layer was added because the previous one leaked.
// The guard mirrored the same scoring so it could not be weaker than the fix —
// and that symmetry was the flaw: a W4 mutation renamed an entry to copy sharing
// no tokens and no declared alias with the pick ("Zen Habitats 4'x2'x16"
// Reptile Enclosure" -> "The ZH-3 Component Base"), and the entry survived the
// production filter while every guard reported PASS. An unbuyable product
// headlined the panel with zero red flags.
//
// An alias-containment dimension was tried as a fourth signal and measured
// honestly: across the corpus it flagged 32 entries and ALL 32 were already
// caught by the token mirror — zero unique catches — and it did nothing about
// the rename, because a renamed entry contains no alias either. It has been
// removed rather than kept as decorative coverage.
//
// The fix is `pickRef` on every entry (see GuideTopPick.pickRef): identity is
// encoded once in frontmatter and cannot be renamed away. These assertions test
// that identity holds. They do not compute a similarity score anywhere, so
// there is no shared metric for a mutation to defeat on both sides at once.
// ---------------------------------------------------------------------------

// 8a — COMPLETENESS. An entry with no pickRef would fall through parseGuide's
// identity join as "keep", which is the under-removal the join exists to stop.
// A missing or stale ref is a build failure, never a silent keep.
for (const guide of getAllGuides()) {
  const allRanks = new Set(
    [...(guide.picks ?? []), ...(guide.suppressedPicks ?? [])].map((p) => p.rank),
  );
  for (const tp of guide.topPicks ?? []) {
    const ref = tp.pickRef ?? '';
    check(
      `${guide.slug} topPicks "${tp.name.slice(0, 45)}" has no pickRef — suppression cannot ` +
        `tell which pick it describes`,
      ref.length > 0,
    );
    if (!ref || ref === 'none') continue;
    const m = /^r(\d+)$/.exec(ref);
    check(`${guide.slug} topPicks pickRef "${ref}" must be "r<rank>" or "none"`, !!m);
    if (!m) continue;
    check(
      `${guide.slug} topPicks "${tp.name.slice(0, 45)}" points at rank ${m[1]}, which no pick ` +
        `on this guide has — stale reference, the entry would survive suppression`,
      allRanks.has(Number(m[1])),
    );
  }
}

// 8b — THE JOIN ITSELF. No rendered entry may reference a suppressed pick.
// This is the assertion the rename mutation cannot defeat: renaming the copy
// leaves pickRef untouched, so the entry is still removed and still checked.
for (const guide of getAllGuides()) {
  const suppressedRanks = new Set((guide.suppressedPicks ?? []).map((p) => p.rank));
  if (!suppressedRanks.size) continue;
  for (const tp of guide.topPicks ?? []) {
    const m = /^r(\d+)$/.exec(tp.pickRef ?? '');
    if (!m) continue;
    check(
      `${guide.slug} "Evidence at a Glance" renders "${tp.name.slice(0, 45)}" (pickRef ` +
        `${tp.pickRef}) whose pick is SUPPRESSED — identity join failed`,
      !suppressedRanks.has(Number(m[1])),
    );
  }
}

// 8c — NO OVER-REMOVAL. Every entry whose pick still renders must still render.
for (const guide of getAllGuides()) {
  const authored = rawTopPicks.get(guide.slug) ?? [];
  if (!authored.length) continue;
  const visibleRanks = new Set((guide.picks ?? []).map((p) => p.rank));
  const renderedNames = new Set((guide.topPicks ?? []).map((t) => t.name));
  for (const a of authored) {
    const m = /^r(\d+)$/.exec(a.pickRef ?? '');
    const shouldRender = !m || visibleRanks.has(Number(m[1]));
    if (!shouldRender) continue;
    check(
      `${guide.slug} topPicks "${a.name.slice(0, 45)}" (pickRef ${a.pickRef ?? 'none'}) points at ` +
        `a VISIBLE pick but was dropped from the panel — over-removal`,
      renderedNames.has(a.name),
    );
  }
}

// 8d — CURATED FIXTURE. The three entries that leaked in production, pinned
// ABSENT, and three brand-collision near-misses pinned PRESENT. Independent of
// any mechanism: break the join in either direction and one side goes red.
const TOPPICK_FIXTURE: Array<{ slug: string; name: string; present: boolean; why: string }> = [
  { slug: 'best-catio-outdoor-cat-enclosures-2026', name: 'Coziwow Window-Access Catio with Platforms & Hammock', present: false, why: 'names the suppressed Coziwow' },
  { slug: 'best-aquarium-filters-and-media-2026', name: 'Fluval 307 Canister Filter', present: false, why: 'names the suppressed Fluval 307' },
  { slug: 'best-reptile-uvb-bulbs-2026', name: 'Arcadia D3 6% Forest T5 HO UVB', present: false, why: 'names the suppressed Arcadia D3 Forest tube' },
  { slug: 'best-reptile-uvb-bulbs-2026', name: 'Arcadia ProT5 12% Desert (D3+) UVB', present: true, why: 'the surviving Arcadia desert fixture' },
  { slug: 'best-catio-outdoor-cat-enclosures-2026', name: 'Aivituvin Walk-In Catio with 7 Platforms (AIR37)', present: true, why: 'the surviving Aivituvin' },
  { slug: 'best-dog-treadmills-large-breed-2026', name: 'Kolmmeo L-Handbrake Non-Motorized Slatmill (Up to 500 lbs)', present: true, why: 'different Kolmmeo from the suppressed M-Handbrake' },
];
for (const f of TOPPICK_FIXTURE) {
  const g = getAllGuides().find((x) => x.slug === f.slug);
  check(`fixture guide ${f.slug} must exist`, !!g);
  if (!g) continue;
  check(
    `topPicks fixture: "${f.name.slice(0, 50)}" must be ${f.present ? 'PRESENT' : 'ABSENT'} on ` +
      `${f.slug} (${f.why})`,
    (g.topPicks ?? []).some((t) => t.name === f.name) === f.present,
  );
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
