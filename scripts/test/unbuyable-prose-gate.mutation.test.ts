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
import { scanCorpus, runGate, keyOf, type Finding } from './unbuyable-prose-gate.test';

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
// Planted on a FIXTURE, not a live guide: the real-corpus version planted
// "the skimmer pick" into a reef guide that says "skimmer" constantly, which
// the LABEL_POINTER_MAX_USES rule now correctly filters. A spec case must
// exercise the behaviour the gate claims, not a case it deliberately excludes.
{
  const g = [{
    slug: 'fixture-label', shortAnswer: '', content: '', bottomLine: ['When in doubt, the palatial one is what to reach for.'],
    picks: [{ name: 'Acme Riverstone 9000 Widget', brand: 'Acme', price: '$10.00', available: true, label: 'BEST OVERALL' }],
    suppressedPicks: [{ name: 'Zephyrine Quantalux 7700 Widget', brand: 'Zephyrine', price: '$99.00', label: 'THE PALATIAL UPGRADE' }],
  }] as any[];
  check('(c) LABEL pointer at an unbuyable pick fires D3',
    scanCorpus(g as any).some((x) => x.detector === 'D3'), JSON.stringify(scanCorpus(g as any).map((x) => `${x.detector}:${x.phrase}`)));
}
{
  // Control for the frequency rule: the same pointer, but the label word is
  // this guide's ordinary vocabulary, so it must NOT be treated as a pointer.
  const g = [{
    slug: 'fixture-label-common', shortAnswer: 'The palatial build is roomy. A palatial run suits big dogs.',
    content: 'Palatial enclosures cost more. Going palatial is a space decision.',
    bottomLine: ['When in doubt, the palatial one is what to reach for.'],
    picks: [{ name: 'Acme Riverstone 9000 Widget', brand: 'Acme', price: '$10.00', available: true, label: 'BEST OVERALL' }],
    suppressedPicks: [{ name: 'Zephyrine Quantalux 7700 Widget', brand: 'Zephyrine', price: '$99.00', label: 'THE PALATIAL UPGRADE' }],
  }] as any[];
  check('(c2) a label word that is the guide\'s own vocabulary is NOT a pointer',
    !scanCorpus(g as any).some((x) => x.detector === 'D3'), JSON.stringify(scanCorpus(g as any).map((x) => `${x.detector}:${x.phrase}`)));
}
{
  // Control for the resolution rule: pointer in a sentence that names a
  // SURVIVING pick resolves to that buyable product.
  const g = [{
    slug: 'fixture-label-resolves', shortAnswer: '', content: '',
    bottomLine: ['The Acme Riverstone 9000 Widget is the palatial pick for big runs.'],
    picks: [{ name: 'Acme Riverstone 9000 Widget', brand: 'Acme', price: '$10.00', available: true, label: 'BEST OVERALL' }],
    suppressedPicks: [{ name: 'Zephyrine Quantalux 7700 Widget', brand: 'Zephyrine', price: '$99.00', label: 'THE PALATIAL UPGRADE' }],
  }] as any[];
  check('(c3) a label pointer that names a BUYABLE pick in the same sentence is not flagged',
    !scanCorpus(g as any).some((x) => x.detector === 'D3'), JSON.stringify(scanCorpus(g as any).map((x) => `${x.detector}:${x.phrase}`)));
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

// ===========================================================================
// LEDGER DEFENCE — executes runGate() end-to-end against fixture corpora.
//
// The first version of this spec imported scanCorpus and never called the gate
// body, so FIVE mutations of the ledger logic survived green: disabling the
// stale check (M2), collapsing count-awareness to key-only (M3), stubbing the
// vacuity guard to `if (false)` (M4), de-duplicating per-field instead of
// per-occurrence (M5 — the exact mechanism that hid the #106 ghost), and the
// M2+M6 chain that printed PASS on a corpus with 6 occurrences. Each case below
// fails if its corresponding branch is removed.
// ===========================================================================

/** Minimal guide-shaped fixture: one suppressed pick, one survivor, and
 *  whatever prose the case needs. Deliberately tiny — the vacuity thresholds
 *  are injected so the fixtures do not have to fake 100k chars of prose. */
function fixture(opts: { slug?: string; prose?: string; bottomLine?: string[] } = {}) {
  return [{
    slug: opts.slug ?? 'fixture-guide',
    shortAnswer: opts.prose ?? '',
    content: '',
    bottomLine: opts.bottomLine ?? [],
    picks: [{ name: 'Acme Riverstone 9000 Widget', brand: 'Acme', price: '$10.00', available: true }],
    suppressedPicks: [{ name: 'Zephyrine Quantalux 7700 Widget', brand: 'Zephyrine', price: '$99.00' }],
  }] as any[];
}
const SMALL = { minProseChars: 0, minUnbuyablePicks: 1 };

// --- M4: VACUITY -----------------------------------------------------------
{
  const empty = runGate({ guides: [], baseline: [], minProseChars: 0 });
  check('(M4a) zero unbuyable picks in the corpus FAILS the gate',
    empty.failures > 0 && empty.errors.some((e) => /VACUITY/.test(e)), empty.errors.join(' | ') || '(no errors)');
  // Second leg: prose collapse, with the real default threshold in play.
  const thin = runGate({ guides: fixture({ prose: 'tiny' }), baseline: [] });
  check('(M4b) collapsed prose FAILS the gate under the default 100k floor',
    thin.errors.some((e) => /VACUITY: only \d+ chars/.test(e)), thin.errors.join(' | '));
}

// --- M3 + M5: COUNT-AWARE, PER-OCCURRENCE ----------------------------------
{
  // Two DISTINCT occurrences of the same identity in the SAME field => one key,
  // count 2. A per-field implementation reports 1; a key-only ledger accepts
  // both on a single row. Baselining ONE must therefore still fail.
  const twice = fixture({ bottomLine: ['Get the Zephyrine Quantalux 7700 Widget. Also get the Zephyrine Quantalux 7700 Widget.'] });
  const found = scanCorpus(twice as any).filter((f) => f.field.startsWith('bottomLine'));
  check('(M5a) two occurrences in ONE field are reported twice, not deduplicated per-field',
    found.length >= 2, `reported ${found.length}`);
  if (found.length >= 2) {
    const k = keyOf(found[0]);
    check('(M5b) both occurrences share one key (so a key-only ledger would hide the second)',
      keyOf(found[1]) === k);
    const budget1 = runGate({ guides: twice, baseline: [{ key: k, count: 1 }], ...SMALL });
    check('(M3) baselining ONE occurrence still FAILS on the second (count-aware ledger)',
      budget1.failures > 0, budget1.errors.join(' | ') || '(clean — ledger is key-only)');
    const budget2 = runGate({ guides: twice, baseline: [{ key: k, count: 2 }], ...SMALL });
    check('(M3 control) baselining BOTH passes', budget2.failures === 0, budget2.errors.join(' | '));
  }
}

// --- M2: STALE-ENTRY PRUNING ----------------------------------------------
{
  const clean = fixture();
  const stale = runGate({ guides: clean, baseline: [{ key: 'ghost-guide|D1|bottomLine[0]|nothing here', count: 1 }], ...SMALL });
  check('(M2) a baseline row that no longer matches FAILS the gate',
    stale.failures > 0 && stale.errors.some((e) => /STALE/.test(e)), stale.errors.join(' | ') || '(clean — stale check is a no-op)');
}

// --- M2+M6 CHAIN -----------------------------------------------------------
{
  // The reviewer's chain: silence the stale check AND shrink the corpus, and the
  // gate prints PASS while its ledger describes a corpus that no longer exists.
  // Here: a real finding plus TWO rows that match nothing.
  const g = fixture({ bottomLine: ['Get the Zephyrine Quantalux 7700 Widget today.'] });
  const real = scanCorpus(g as any).filter((f) => f.field.startsWith('bottomLine'))[0];
  const chained = runGate({
    guides: g,
    baseline: [{ key: keyOf(real), count: 1 }, { key: 'gone-a|D1|x|y', count: 1 }, { key: 'gone-b|D4|x|y', count: 1 }],
    ...SMALL,
  });
  check('(M2+M6) accepted finding + two vanished rows still FAILS (ledger cannot describe a corpus that is gone)',
    chained.failures >= 2 && chained.errors.filter((e) => /STALE/.test(e)).length === 2, chained.errors.join(' | '));
}

// --- runGate happy path ----------------------------------------------------
{
  const g = fixture({ bottomLine: ['Get the Zephyrine Quantalux 7700 Widget today.'] });
  const hits = scanCorpus(g as any).filter((f) => f.field.startsWith('bottomLine'));
  const exact = runGate({ guides: g, baseline: hits.map((h) => ({ key: keyOf(h), count: hits.filter((x) => keyOf(x) === keyOf(h)).length })).filter((v, i, a) => a.findIndex((x) => x.key === v.key) === i), ...SMALL });
  check('(M-ok) a fully and exactly ledgered corpus PASSES', exact.failures === 0, exact.errors.join(' | '));
}

// --- EVASIONS closed by this commit ---------------------------------------
{
  // (a) single-token steer + price, with the full name absent
  // model code alone, full name absent — the reviewer's "the 150SSS" shape
  const g = fixture({ bottomLine: ['The 7700 is the one to buy, around $99.00.'] });
  const f = scanCorpus(g as any).filter((x) => x.field.startsWith('bottomLine'));
  check('(E-a1) a lone MODEL CODE steer is caught (D1 no longer starts at n=2)',
    f.some((x) => x.detector === 'D1'), JSON.stringify(f.map((x) => `${x.detector}:${x.phrase}`)));
  check('(E-a2) price claim beside a SINGLE-token identity is caught (D4 un-gated from D1)',
    f.some((x) => x.detector === 'D4'), JSON.stringify(f.map((x) => `${x.detector}:${x.phrase}`)));
  // brand token alone
  const gb = fixture({ bottomLine: ['Honestly, the Zephyrine is the one to buy here.'] });
  check('(E-a3) a lone BRAND token steer is caught',
    scanCorpus(gb as any).some((x) => x.field.startsWith('bottomLine') && x.detector === 'D1'));
  // and the noise control that killed the rarity heuristic
  const gn = fixture({ bottomLine: ['Choose a substrate you can actually clean.'] });
  (gn[0] as any).suppressedPicks = [{ name: 'Zoo Med Excavator Clay Burrowing Substrate', brand: 'Zoo Med', price: '$20.00' }];
  check('(E-a4) an ordinary category noun ("substrate") is NOT treated as an identity',
    !scanCorpus(gn as any).some((x) => x.field.startsWith('bottomLine')), JSON.stringify(scanCorpus(gn as any).map((x) => x.phrase)));
}
{
  // (b)+(c) an unbuyable card's OWN rendered body: description is fine, a buy
  // instruction is not, and pointing at ANOTHER dead pick always is.
  const mk = (body: string) => ([{
    slug: 'fixture-dead-card', shortAnswer: '', content: '', bottomLine: [],
    picks: [
      { name: 'Acme Riverstone 9000 Widget', price: '$10.00', available: true },
      { name: 'Zephyrine Quantalux 7700 Widget', price: '$99.00', available: false, bodyHtml: body },
      { name: 'Borealis Fenwick 5500 Gadget', price: '$50.00', available: false },
    ],
    suppressedPicks: [],
  }] as any[]);
  const desc = scanCorpus(mk('The Zephyrine Quantalux 7700 Widget uses a wider aperture than most.') as any);
  check('(E-b1) an unbuyable card DESCRIBING itself is not flagged',
    !desc.some((x) => x.field.startsWith('unbuyableCard') && x.pick.includes('Zephyrine')), JSON.stringify(desc.map((x) => x.field)));
  const sell = scanCorpus(mk('Buy the Zephyrine Quantalux 7700 Widget today at $99.00.') as any);
  check('(E-b2) an unbuyable card SELLING itself IS flagged (renders under the label, no CTA)',
    sell.some((x) => x.field.startsWith('unbuyableCard')), JSON.stringify(sell.map((x) => `${x.field}:${x.detector}`)));
  const cross = scanCorpus(mk('For a bigger build, the Borealis Fenwick 5500 Gadget is the natural step up.') as any);
  check('(E-c) a dead card steering at ANOTHER dead pick IS flagged',
    cross.some((x) => x.field.startsWith('unbuyableCard') && x.pick.includes('Borealis')), JSON.stringify(cross.map((x) => `${x.field}:${x.pick.slice(0, 22)}`)));
}
{
  // (d) reviewMethod renders via MethodologyParagraph.tsx and was never scanned
  const g = fixture(); (g[0] as any).reviewMethod = 'We recommend the Zephyrine Quantalux 7700 Widget for most buyers.';
  check('(E-d) reviewMethod is scanned',
    scanCorpus(g as any).some((x) => x.field === 'reviewMethod'), '(reviewMethod not surfaced)');
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('unbuyable-prose-gate mutation spec: PASS');
