/**
 * Every count this wave reports, from one invocation.
 *
 * Three rounds of this PR shipped slightly-wrong arithmetic in the report while
 * the code itself was correct — 692 topPicks entries that were 694, 82 guides
 * that were 80, and a guard coverage claim that measured to zero. None changed
 * a decision, and that is exactly why they kept happening: a number typed into
 * a report has nothing checking it, and a reviewer who catches one starts
 * re-deriving all of them.
 *
 * So the numbers stop being typed. Anything this wave asserts is emitted here,
 * and the report prints the command beside the figure.
 *
 * Run: npx tsx scripts/audit/wave-counts.ts
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAllGuides } from '../../src/lib/guides';
import { getCachedPrice, isUnbuyableAvailability } from '../../src/lib/price-cache';
import { DEAD_ASINS, isHardGateStatus, type DeadAsinStatus } from '../../src/lib/dead-asin-guard';

const guides = getAllGuides();
const guidesDir = path.join(process.cwd(), 'src/content/guides');
const out: Array<[string, string | number]> = [];
const add = (k: string, v: string | number) => out.push([k, v]);

// ── suppression ─────────────────────────────────────────────────────────────
let suppressedTotal = 0;
let newlyThisPr = 0;
let byHardGate = 0;
let byNoListing = 0;
let alsoSnapshot = 0;
const newlyGuides = new Set<string>();
const decapitated = new Set<string>();
let pickCountTwo = 0;

for (const g of guides) {
  const sup = g.suppressedPicks ?? [];
  suppressedTotal += sup.length;
  if (g.pickCount === 2) pickCountTwo++;
  const minVisibleRank = Math.min(...(g.picks ?? []).map((p) => p.rank || 99), 99);
  for (const p of sup) {
    const cached = getCachedPrice(p.asin);
    const snapshotGated = !!cached && isUnbuyableAvailability(cached.availability);
    if (p.suppressionReason === 'snapshot') continue;
    if (snapshotGated) {
      alsoSnapshot++;
      continue;
    }
    newlyThisPr++;
    newlyGuides.add(g.slug);
    if (p.suppressionReason === 'no-listing') byNoListing++;
    else byHardGate++;
    if (p.rank === 1 || p.rank < minVisibleRank) decapitated.add(g.slug);
  }
}
add('picks suppressed corpus-wide (either gate)', suppressedTotal);
add('picks NEWLY suppressed by this PR', newlyThisPr);
add('  of those, by the dead-asins hard gate', byHardGate);
add('  of those, by the no_listing pick reference', byNoListing);
add('guides affected by the new suppressions', newlyGuides.size);
add('guides that lost their anchor (decapitated)', decapitated.size);
add('guides rendering exactly two picks', pickCountTwo);
add('picks already snapshot-gated that are now hard-gated too (no state change)', alsoSnapshot);

// ── guard payload ───────────────────────────────────────────────────────────
const keys = Object.keys(DEAD_ASINS);
add(
  'dead-asins.json entries',
  `${keys.length} (${keys.filter((k) => /^[A-Z0-9]{10}$/.test(k)).length} ASIN-keyed, ${
    keys.filter((k) => k.includes('#')).length
  } pick-reference)`,
);
add(
  'guard entries by status',
  (['dead', 'no_offer', 'no_listing', 'used_buybox'] as DeadAsinStatus[])
    .map((s) => `${s}=${Object.values(DEAD_ASINS).filter((e) => e.status === s).length}`)
    .join(' '),
);
add(
  'hard-gate statuses',
  (['dead', 'no_offer', 'no_listing', 'used_buybox'] as DeadAsinStatus[])
    .filter((s) => isHardGateStatus(s))
    .join(', '),
);

// ── topPicks identity ───────────────────────────────────────────────────────
let authoredTopPicks = 0;
let refNone = 0;
for (const f of fs.readdirSync(guidesDir).filter((x) => x.endsWith('.md'))) {
  const d = matter(fs.readFileSync(path.join(guidesDir, f), 'utf8')).data as {
    topPicks?: Array<{ pickRef?: string }>;
  };
  for (const t of d.topPicks ?? []) {
    authoredTopPicks++;
    if (t?.pickRef === 'none') refNone++;
  }
}
const renderedTopPicks = guides.reduce((n, g) => n + (g.topPicks?.length ?? 0), 0);
add('topPicks entries authored', authoredTopPicks);
add('topPicks entries rendered', renderedTopPicks);
add('topPicks entries removed by the identity join', authoredTopPicks - renderedTopPicks);
add('topPicks entries with pickRef "none" (name no pick by design)', refNone);

// ── self-healing coverage ───────────────────────────────────────────────────
const picksOnly = new Set<string>();
const bothLists = new Set<string>();
for (const g of guides) {
  for (const p of g.picks ?? []) if (p.asin) { picksOnly.add(p.asin); bothLists.add(p.asin); }
  for (const p of g.suppressedPicks ?? []) if (p.asin) bothLists.add(p.asin);
}
add('ASINs the weekly sync sees reading picks[] only', picksOnly.size);
add('ASINs it sees reading picks[] + suppressedPicks[]', bothLists.size);
add('  ASINs recovered by the collectAsins fix', bothLists.size - picksOnly.size);

// ── AI surface ──────────────────────────────────────────────────────────────
const llmsPath = path.join(process.cwd(), 'public/llms-full.txt');
if (fs.existsSync(llmsPath)) {
  const txt = fs.readFileSync(llmsPath, 'utf8');
  let withAsin = 0;
  let leaked = 0;
  for (const g of guides) {
    for (const p of g.suppressedPicks ?? []) {
      if (!p.asin || !/^[A-Z0-9]{10}$/.test(p.asin)) continue;
      withAsin++;
      if (txt.includes(`ASIN: ${p.asin}`)) leaked++;
    }
  }
  add('suppressed picks carrying a real ASIN', withAsin);
  add('  of those, still emitted to llms-full.txt', leaked);
  add(
    'availability labels in llms-full.txt',
    (txt.match(/Availability: (currently unavailable|no longer available)/g) ?? []).length,
  );
}

// ── non-rendering comparison blocks (issue #117) ────────────────────────────
let arrayForm = 0;
let arrayFormWithPrices = 0;
let arrayFormOnSuppressed = 0;
for (const f of fs.readdirSync(guidesDir).filter((x) => x.endsWith('.md'))) {
  const slug = f.replace(/\.md$/, '');
  const d = matter(fs.readFileSync(path.join(guidesDir, f), 'utf8')).data as {
    comparison?: { rows?: unknown[] };
  };
  const rows = Array.isArray(d.comparison?.rows) ? d.comparison!.rows! : [];
  if (!rows.length) continue;
  const hasLabelRow = rows.some(
    (r) => r && typeof r === 'object' && !Array.isArray(r) && 'label' in (r as object),
  );
  if (hasLabelRow) continue;
  arrayForm++;
  if (/\$[0-9]/.test(JSON.stringify(rows))) arrayFormWithPrices++;
  if (guides.find((g) => g.slug === slug)?.suppressedPicks?.length) arrayFormOnSuppressed++;
}
add('guides with array-form comparison blocks that render nothing (#117)', arrayForm);
add('  of those, carrying $ prices', arrayFormWithPrices);
add('  of those, on guides with suppressed picks', arrayFormOnSuppressed);

// ── keywords (issue #118) ───────────────────────────────────────────────────
const kwGuides = guides.filter((g) => g.keywords?.length);
add('guides with keywords[] (#118)', kwGuides.length);
add('  total keyword strings', kwGuides.reduce((n, g) => n + (g.keywords?.length ?? 0), 0));

const width = Math.max(...out.map(([k]) => k.length));
console.log(`\nWAVE COUNTS — ${guides.length} guides parsed\n`);
for (const [k, v] of out) console.log(`${k.padEnd(width)}  ${v}`);
console.log();
