#!/usr/bin/env npx tsx
/**
 * COMPARISON-TABLE PRICES COME FROM THE CARDS (owner decision 2026-09-29).
 *
 * A comparison table can never disagree with its card: a keyed row's price
 * cell renders its pick's card figure + dated stamp (or no figure when the card
 * shows none), never what was typed into the frontmatter. Shape and rules:
 * src/lib/comparison-table.ts.
 *
 * Jobs:
 *   1. FIXTURE GUIDE (scripts/test/fixtures/comparison-table-prices.fixture.md),
 *      parsed by the REAL parseGuide and rendered by the REAL component, with a
 *      live ASIN and a dark ASIN taken from the corpus at run time (so the test
 *      does not rot as prices change):
 *        a. the live pick's row renders the card's figure + adjacent stamp;
 *        b. the dark pick's row renders no figure and no stamp ("–");
 *        c. a `$` typed into a keyed row's price cell never renders;
 *        d. an unkeyed (`pickRef: none`) row with a `$` in the price column
 *           fails the parse; an unknown pickRef and legacy array rows mixed
 *           with keyed rows fail too;
 *        e. a legacy table of array rows only renders NO table.
 *   2. UNIT: the same properties against the resolver with hand-built picks.
 *   3. CORPUS: every guide's headers table (if any) matches its cards; the three
 *      live-checked array-shaped guides still render no table.
 *   4. MUTATION: src/lib/comparison-table.ts is copied out, broken three ways,
 *      and the unit checks must FAIL on every mutant (and pass on the original).
 *
 * Run: `npx tsx scripts/test/comparison-table-prices.test.tsx` (wired into
 * `validate:content`; needs no build output).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import GuideComparisonTable, { HeadersComparisonTable } from '../../src/components/guides/GuideComparisonTable';
import { getAllGuides, getGuideBySlug, parseGuide, type Guide } from '../../src/lib/guides';
import type * as ComparisonTableModule from '../../src/lib/comparison-table';

type Mod = typeof ComparisonTableModule;

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures++;
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

const REPO_ROOT = path.join(import.meta.dirname, '..', '..');
const SOURCE = path.join(REPO_ROOT, 'src', 'lib', 'comparison-table.ts');
const FIXTURE = fs.readFileSync(path.join(REPO_ROOT, 'scripts/test/fixtures/comparison-table-prices.fixture.md'), 'utf8');

/** The price <td> of the row keyed to `rank`, from rendered markup. */
function priceCell(markup: string, rank: number): string | null {
  const row = new RegExp(`<tr\\b[^>]*data-pick-rank="${rank}"[^>]*>([\\s\\S]*?)</tr>`).exec(markup)?.[1];
  if (!row) return null;
  return /<td\b[^>]*data-price-cell=""[^>]*>([\s\S]*?)<\/td>/.exec(row)?.[1] ?? null;
}

/** Problems with one rendered price cell against the card's figure/stamp (null = card shows none). */
function cellProblems(cell: string | null, card: { price: string; priceStamp?: string; priceCheckedAt?: string } | null): string[] {
  if (cell === null) return ['no price cell rendered'];
  const figure = /<p\b[^>]*data-price-figure=""[^>]*>([^<]*)<\/p>\s*(<p\b[^>]*data-price-stamp=""[^>]*>([^<]*)<\/p>)?/.exec(cell);
  if (!card || !card.price) {
    const out: string[] = [];
    if (figure) out.push(`renders a figure (${figure[1]}) for a card that shows none`);
    if (/data-price-stamp/.test(cell)) out.push('renders a stamp for a card that shows none');
    if (/\$\s?\d/.test(cell)) out.push(`renders a $ figure: ${cell}`);
    if (cell.trim() !== '–') out.push(`expected "–", got ${JSON.stringify(cell)}`);
    return out;
  }
  if (!figure) return [`no figure; expected ${card.price}`];
  const out: string[] = [];
  if (figure[1] !== card.price) out.push(`figure ${figure[1]} != card ${card.price}`);
  if (!figure[2]) out.push('figure has no adjacent stamp');
  else {
    if (figure[3] !== card.priceStamp) out.push(`stamp ${JSON.stringify(figure[3])} != card ${JSON.stringify(card.priceStamp)}`);
    const checked = /data-checked="([^"]*)"/.exec(figure[2])?.[1];
    if (checked !== card.priceCheckedAt) out.push(`data-checked ${checked} != card ${card.priceCheckedAt}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2 + 4. Unit checks, runnable against the real module or a mutant.
// ---------------------------------------------------------------------------
const LIVE = { rank: 1, price: '$42.00', priceStamp: 'Current price · checked Sep 20, 2026', priceBasis: 'current', priceCheckedAt: '2026-09-20' };
const DARK = { rank: 2, price: '' };

function unitProblems(mod: Mod): string[] {
  const problems: string[] = [];
  const raw = {
    headers: ['Product', 'Price', 'Role'],
    rows: [
      { pickRef: 'r1', cells: ['Live', '$99.99', 'x'] },
      { pickRef: 'r2', cells: ['Dark', '$77.77', 'y'] },
      { pickRef: 'none', cells: ['Step', '', 'z'] },
    ],
  };
  const parsed = mod.parseComparisonTable(raw);
  if (!parsed.spec || parsed.errors.length) return [`clean table failed to parse: ${parsed.errors.join('; ')}`];
  const resolved = mod.resolveComparisonTable(parsed.spec, [LIVE, DARK]);
  if (!resolved.table || resolved.errors.length) return [`clean table failed to resolve: ${resolved.errors.join('; ')}`];
  const markup = renderToStaticMarkup(<HeadersComparisonTable table={resolved.table} />);
  problems.push(...cellProblems(priceCell(markup, 1), LIVE).map((p) => `live row: ${p}`));
  problems.push(...cellProblems(priceCell(markup, 2), null).map((p) => `dark row: ${p}`));
  for (const typed of ['$99.99', '$77.77']) if (markup.includes(typed)) problems.push(`typed keyed-row price ${typed} rendered`);

  // An unkeyed row with a $ in the price column must be rejected.
  const bad = { ...raw, rows: [...raw.rows.slice(0, 2), { pickRef: 'none', cells: ['Step', '$12.99', 'z'] }] };
  const badParsed = mod.parseComparisonTable(bad);
  const badErrors = [...badParsed.errors, ...(badParsed.spec ? mod.resolveComparisonTable(badParsed.spec, [LIVE, DARK]).errors : [])];
  if (!badErrors.length) problems.push('unkeyed row with $12.99 in the price column was accepted');

  // Legacy array rows alone: no table. Mixed with keyed rows: rejected.
  const legacy = mod.parseComparisonTable({ headers: raw.headers, rows: [['Live', '$99.99', 'x']] });
  if (legacy.spec) problems.push('legacy array-row table produced a table');
  const mixed = mod.parseComparisonTable({ headers: raw.headers, rows: [...raw.rows, ['Live', '$99.99', 'x']] });
  if (!mixed.errors.length) problems.push('array rows mixed with keyed rows were accepted');
  return problems;
}

async function loadMutant(name: string, mutated: string): Promise<Mod> {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `comparison-table-mutant-${name}-`)));
  try {
    const file = path.join(dir, 'comparison-table.ts');
    fs.writeFileSync(file, mutated);
    return (await import(pathToFileURL(file).href)) as Mod;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  // ---- 1. Fixture guide through the real parseGuide + component ------------
  console.log('comparison-table-prices: fixture guide');
  const all = getAllGuides();
  const livePick = all.flatMap((g) => g.picks ?? []).find((p) => p.asin && /^B0[A-Z0-9]{8}$/.test(p.asin) && p.price && p.priceStamp);
  const darkPick = all.flatMap((g) => g.picks ?? []).find((p) => p.asin && /^B0[A-Z0-9]{8}$/.test(p.asin) && p.suppressionReason && !p.price);
  check('corpus has a live pick (figure + stamp) to key the fixture to', !!livePick);
  check('corpus has a dark pick (no figure) to key the fixture to', !!darkPick);
  if (!livePick || !darkPick) return;

  const fill = (unkeyed: string) =>
    FIXTURE.replace('{{LIVE_ASIN}}', livePick.asin!).replace('{{DARK_ASIN}}', darkPick.asin!).replace('{{UNKEYED_PRICE_CELL}}', unkeyed);
  const guide = parseGuide('fixture-comparison-table-prices', fill(''));
  const [fLive, fDark] = [1, 2].map((r) => guide.picks?.find((p) => p.rank === r));
  check('fixture live pick shows the corpus card figure', !!fLive?.price && fLive.price === livePick.price, `${fLive?.price} vs ${livePick.price}`);
  check('fixture dark pick shows no figure', !!fDark && !fDark.price && !fDark.priceStamp);
  check('fixture resolves a headers table', !!guide.comparison?.table?.rows.length);
  const markup = renderToStaticMarkup(
    <GuideComparisonTable picks={guide.picks} comparison={guide.comparison} guideSlug={guide.slug} />,
  );
  const liveIssues = cellProblems(priceCell(markup, 1), fLive ?? null);
  check('(a) live row renders the card figure + adjacent dated stamp', !liveIssues.length, liveIssues.join('; '));
  const darkIssues = cellProblems(priceCell(markup, 2), null);
  check('(b) dark row renders no figure and no stamp', !darkIssues.length, darkIssues.join('; '));
  check('(c) typed keyed-row prices ($999.99, $888.88) never render', !/\$999\.99|\$888\.88/.test(markup));
  check('unkeyed row renders verbatim', /Checklist step/.test(markup) && /Not a pick/.test(markup));

  const throws = (label: string, src: string) => {
    let threw = false;
    try {
      parseGuide('fixture-comparison-table-prices', src);
    } catch {
      threw = true;
    }
    check(label, threw);
  };
  throws('(d) unkeyed row with $12.99 in the price column fails the parse', fill('$12.99'));
  throws('(d) unknown pickRef fails the parse', fill('').replace('pickRef: r2', 'pickRef: r9'));
  throws(
    '(d) legacy array rows mixed with keyed rows fail the parse',
    fill('').replace('    - pickRef: none', '    - ["Legacy", "$5.00", "row"]\n    - pickRef: none'),
  );
  const legacyOnly = fill('').replace(/  rows:\n[\s\S]*?\n---/, '  rows:\n    - ["Fixture Live Pick", "$999.99", "legacy"]\n---');
  const legacyGuide = parseGuide('fixture-comparison-table-prices', legacyOnly);
  const legacyMarkup = renderToStaticMarkup(
    <GuideComparisonTable picks={legacyGuide.picks} comparison={legacyGuide.comparison} guideSlug={legacyGuide.slug} />,
  );
  check('(e) legacy array-row-only table renders no table', legacyMarkup === '', legacyMarkup.slice(0, 120));

  // ---- 2. Unit checks on the real module ------------------------------------
  console.log('comparison-table-prices: unit (real module)');
  const real = await import('../../src/lib/comparison-table');
  const realProblems = unitProblems(real);
  check('real resolver passes every unit check', !realProblems.length, realProblems.join('; '));

  // ---- 3. Corpus -------------------------------------------------------------
  console.log('comparison-table-prices: corpus');
  let tables = 0;
  for (const g of all as Guide[]) {
    const t = g.comparison?.table;
    if (!t) continue;
    tables++;
    const m = renderToStaticMarkup(<GuideComparisonTable picks={g.picks} comparison={g.comparison} guideSlug={g.slug} />);
    for (const row of t.rows) {
      if (row.pickRank === undefined || t.priceColumn < 0) continue;
      const card = g.picks?.find((p) => p.rank === row.pickRank) ?? null;
      const issues = cellProblems(priceCell(m, row.pickRank), card && card.price ? card : null);
      check(`${g.slug} r${row.pickRank}: table price matches the card`, !issues.length, issues.join('; '));
    }
  }
  console.log(`  ${tables} guide(s) carry a headers table`);
  for (const slug of [
    'bearded-dragon-terrarium-setup-checklist-2026',
    'best-dog-car-seat-covers-cargo-liners-2026',
    'best-planted-aquarium-lights-2026',
  ]) {
    const g = getGuideBySlug(slug);
    check(`${slug} exists`, !!g);
    if (!g) continue;
    const m = renderToStaticMarkup(<GuideComparisonTable picks={g.picks} comparison={g.comparison} guideSlug={g.slug} />);
    check(`${slug}: unmigrated array-row table still renders no table`, m === '');
  }

  // ---- 4. Mutation ------------------------------------------------------------
  console.log('comparison-table-prices: mutation');
  const source = fs.readFileSync(SOURCE, 'utf8');
  const mutants: Array<[string, string, string]> = [
    ['typed-price', '            figure: pick.price,\n', '            figure: row.cells[priceColumn] || pick.price,\n'],
    ['dark-figure', '      pick && pick.price && pick.priceStamp\n', '      pick\n'],
    ['unkeyed-dollar', "DOLLAR_FIGURE.test(row.cells[priceColumn] ?? '')", 'false'],
  ];
  for (const [name, needle, replacement] of mutants) {
    const n = source.split(needle).length - 1;
    check(`mutant ${name}: needle present once`, n === 1, `found ${n}`);
    if (n !== 1) continue;
    const mod = await loadMutant(name, source.replace(needle, replacement));
    const problems = unitProblems(mod);
    check(`mutant ${name}: unit checks FAIL`, problems.length > 0);
  }
}

main()
  .catch((err) => {
    failures++;
    console.error(err);
  })
  .finally(() => {
    if (failures) {
      console.error(`comparison-table-prices: ${failures} failure(s)`);
      process.exit(1);
    }
    console.log('comparison-table-prices: PASS');
  });
