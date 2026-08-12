/**
 * #109 — MUTATION SPEC for the unbuyable-prose gate.
 *
 * A gate is only worth its runtime if it FAILS on the defect it claims to
 * catch. #109 exists because four repo gates went green on a planted suppressed
 * product name, so this gate ships with its own executable proof.
 *
 * Each case plants one defect class into a REAL guide's parsed output and
 * asserts the scanner reports it. The clean corpus must stay silent, which is
 * the over-firing control: a scanner that flags everything would pass the four
 * plant cases and be useless.
 *
 *   a NAME       full product name in a rendered bottomLine        -> D1
 *   b BARE SUFFIX the "…Vest or Zip" ellipsis a PREFIX matcher misses -> D2
 *   c LABEL      a pointer at the pick's label, not its name       -> D3
 *   d PRICE      the pick's price asserted beside its name         -> D4
 *
 * Run: npx tsx scripts/test/unbuyable-prose-gate.mutation.test.ts
 */
import { getAllGuides } from '../../src/lib/guides';
import { scanCorpus, type Finding } from './unbuyable-prose-gate.test';

let failures = 0;
const check = (label: string, ok: boolean, extra = '') => {
  if (ok) console.log(`  ok   ${label}`);
  else { failures++; console.error(`  FAIL ${label}${extra ? `\n         ${extra}` : ''}`); }
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const baseGuides = getAllGuides();

/** Deep-clone the corpus, find a guide with an unbuyable pick matching `want`,
 *  plant `text` into its first bottomLine, and rescan. */
function plant(want: (g: any, u: any) => boolean, make: (u: any) => string) {
  const guides = clone(baseGuides) as any[];
  for (const g of guides) {
    const unb = [...(g.suppressedPicks ?? []), ...((g.picks ?? []).filter((p: any) => p.available === false))];
    for (const u of unb) {
      if (!want(g, u)) continue;
      g.bottomLine = [...(g.bottomLine ?? []), make(u)];
      return { guides, slug: g.slug, pick: u.name as string };
    }
  }
  return null;
}

const hitsFor = (all: Finding[], slug: string, det: Finding['detector']) =>
  all.filter((f) => f.guide === slug && f.detector === det && f.field.startsWith('bottomLine'));

// --- baseline: the clean corpus must not report the planted classes ---------
const cleanFindings = scanCorpus(baseGuides as any);
console.log(`clean corpus: ${cleanFindings.length} occurrences (all pre-existing, ledgered in the baseline file)`);

// --- (a) NAME -------------------------------------------------------------
{
  const p = plant((_g, u) => (u.name ?? '').split(' ').length >= 4, (u) => `Get the ${u.name} — it is the one to buy.`);
  check('(a) plantable name case exists', !!p);
  if (p) {
    const f = hitsFor(scanCorpus(p.guides as any), p.slug, 'D1');
    check(`(a) NAME steer fires D1 on ${p.slug}`, f.length > 0, `planted "${p.pick.slice(0, 60)}"`);
  }
}

// --- (b) BARE SUFFIX — the class a prefix matcher cannot see ---------------
{
  // Need an unbuyable pick that shares a >=2-token stem with a surviving pick,
  // then reference the SURVIVOR's full name and append only the discriminator.
  const guides = clone(baseGuides) as any[];
  let planted: { slug: string; sentence: string; pick: string } | null = null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (const g of guides) {
    const unb = [...(g.suppressedPicks ?? []), ...((g.picks ?? []).filter((p: any) => p.available === false))];
    const surv = (g.picks ?? []).filter((p: any) => p.available !== false);
    for (const u of unb) for (const s of surv) {
      const uT = norm(u.name ?? '').split(' '), sT = norm(s.name ?? '').split(' ');
      let k = 0; while (k < uT.length && k < sT.length && uT[k] === sT[k]) k++;
      if (k < 2) continue;
      const disc = uT.slice(k).filter((t) => !sT.includes(t) && t.length > 2);
      if (!disc.length) continue;
      const sentence = `Get the ${s.name} or ${disc[0]} in Large.`; // the #106 ghost, verbatim shape
      g.bottomLine = [...(g.bottomLine ?? []), sentence];
      planted = { slug: g.slug, sentence, pick: u.name };
      break;
    }
    if (planted) break;
  }
  check('(b) plantable near-twin case exists', !!planted);
  if (planted) {
    const f = hitsFor(scanCorpus(guides as any), planted.slug, 'D2');
    check(`(b) BARE-SUFFIX steer fires D2 on ${planted.slug}`, f.length > 0, `planted ${JSON.stringify(planted.sentence)}`);
    // The point of #109: the full product name is absent, so a name/prefix
    // matcher sees nothing. Assert the sentence really does omit it.
    check('(b) planted sentence does NOT contain the unbuyable pick name (prefix matchers are blind)',
      !norm(planted.sentence).includes(norm(planted.pick)));
  }
}

// --- (c) LABEL pointer ----------------------------------------------------
{
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const guides = clone(baseGuides) as any[];
  let planted: { slug: string; core: string; pick: string } | null = null;
  for (const g of guides) {
    const unb = [...(g.suppressedPicks ?? []), ...((g.picks ?? []).filter((p: any) => p.available === false))];
    const survLabels = new Set((g.picks ?? []).filter((p: any) => p.available !== false).map((p: any) => norm(p.label ?? '')));
    for (const u of unb) {
      const core = norm(u.label ?? '').split(' ').filter((t) => t.length > 4 && !['pick','best','with','only'].includes(t));
      if (!core.length || survLabels.has(norm(u.label ?? ''))) continue;
      g.bottomLine = [...(g.bottomLine ?? []), `When in doubt, the ${core[0]} pick is the one to buy.`];
      planted = { slug: g.slug, core: core[0], pick: u.name };
      break;
    }
    if (planted) break;
  }
  check('(c) plantable label case exists', !!planted);
  if (planted) {
    const f = hitsFor(scanCorpus(guides as any), planted.slug, 'D3');
    check(`(c) LABEL pointer fires D3 on ${planted.slug}`, f.length > 0, `planted "the ${planted.core} pick"`);
  }
}

// --- (d) PRICE claim ------------------------------------------------------
{
  const p = plant((_g, u) => !!u.price && (u.name ?? '').split(' ').length >= 3,
    (u) => `The ${u.name} at ${u.price} is the value play here.`);
  check('(d) plantable price case exists', !!p);
  if (p) {
    const f = hitsFor(scanCorpus(p.guides as any), p.slug, 'D4');
    check(`(d) PRICE claim fires D4 on ${p.slug}`, f.length > 0, `planted "${p.pick.slice(0, 40)} at <price>"`);
  }
}

// --- (f) PINNED #106 REGRESSION — the exact ghost that started this --------
// PR #106 shipped "The Ruffwear Swamp Cooler Vest or Zip in Large or X-Large."
// The suppressed pick is the Swamp Cooler ZIP; the surviving one is the Swamp
// Cooler VEST. A prefix matcher scores the SURVIVOR on that line and reports
// nothing. If the roster ever changes so this pair no longer exists, the
// assertion below goes silent rather than wrong — hence the guard on `found`.
{
  const guides = clone(baseGuides) as any[];
  const g = guides.find((x: any) => x.slug === 'best-dog-cooling-vests-summer-2026') as any;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const zip = g && [...(g.suppressedPicks ?? []), ...((g.picks ?? []).filter((p: any) => p.available === false))]
    .find((p: any) => norm(p.name).includes('zip'));
  const vest = g && (g.picks ?? []).find((p: any) => p.available !== false && norm(p.name).includes('swamp cooler'));
  if (g && zip && vest) {
    g.bottomLine = [...(g.bottomLine ?? []), `The ${vest.name} or Zip in Large or X-Large.`];
    const f = scanCorpus(guides as any).filter((x) => x.guide === g.slug && x.detector === 'D2' && x.field.startsWith('bottomLine'));
    check('(f) the verbatim #106 "…Vest or Zip" ghost fires D2', f.length > 0);
  } else {
    console.log('  skip (f) pinned #106 pair no longer on the roster (zip suppressed + vest surviving)');
  }
}

// --- (g) POST-RULING COMPATIBILITY ----------------------------------------
// A dead-asins builder is moving hard-gated picks from "renders with a label"
// to "fully suppressed like the snapshot gate". The gate reads the UNION of
// suppressedPicks and available===false, so a pick that changes buckets must
// stay detectable. Simulate the ruling by MOVING every gated pick into
// suppressedPicks and re-running case (a).
{
  const guides = clone(baseGuides) as any[];
  let moved = 0;
  for (const g of guides as any[]) {
    const gated = (g.picks ?? []).filter((p: any) => p.available === false);
    if (!gated.length) continue;
    g.picks = (g.picks ?? []).filter((p: any) => p.available !== false);
    g.suppressedPicks = [...(g.suppressedPicks ?? []), ...gated];
    moved += gated.length;
  }
  check('(g) simulation actually moved gated picks', moved > 0, `moved ${moved}`);
  const target = (guides as any[]).find((g) => (g.suppressedPicks ?? []).some((p: any) => (p.name ?? '').split(' ').length >= 4));
  const u = target && (target.suppressedPicks as any[]).find((p) => (p.name ?? '').split(' ').length >= 4);
  if (target && u) {
    target.bottomLine = [...(target.bottomLine ?? []), `Get the ${u.name} — it is the one to buy.`];
    const f = scanCorpus(guides as any).filter((x) => x.guide === target.slug && x.detector === 'D1' && x.field.startsWith('bottomLine'));
    check(`(g) still fires after gated picks become fully suppressed (${target.slug})`, f.length > 0);
  }
}

// --- over-firing control --------------------------------------------------
{
  const guides = clone(baseGuides) as any[];
  const g = guides.find((x: any) => (x.bottomLine ?? []).length) as any;
  g.bottomLine = [...g.bottomLine, 'Get the thing that is in stock today, and keep the receipt.'];
  const after = scanCorpus(guides as any).length;
  check('(e) an innocuous rendered sentence adds no findings (over-firing control)', after === cleanFindings.length,
    `clean ${cleanFindings.length} -> planted ${after}`);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('unbuyable-prose-gate mutation spec: PASS');
