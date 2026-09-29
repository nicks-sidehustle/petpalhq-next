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
 *        e. a legacy table of array rows only renders NO table;
 *        f. a row keyed to a pick the frontmatter declares but the roster
 *           drops (removed/suppressed) does NOT throw — its price cell is "–";
 *        g. a `$` in a non-price column (keyed or unkeyed row) fails;
 *        h. a missing / misspelled pickRef key, a malformed pickRef value, a
 *           label/values row mixed in, and a duplicate pickRef all fail;
 *        i. a keyed row's name cell renders the card's product name, never the
 *           typed text — a row keyed r2 but typed with r1's name still shows
 *           r2's name beside r2's price (name and price from one pick);
 *        j. wider money guard: "$  120", "$.99", "＄120", "US$120", "USD 120",
 *           "120 USD" in a cell, and a figure in a header cell, all fail.
 *      A dropped (declared, off-roster) pick keeps its typed frontmatter name
 *      and prints "–" for price — documented in (f).
 *   2. UNIT: the same properties against the resolver with hand-built picks.
 *   3. CORPUS: every guide's headers table (if any) matches its cards; every
 *      array-shaped guide still renders no table; every label-shaped guide
 *      still renders its label table (no headers-table path, no error).
 *   4. MUTATION: src/lib/comparison-table.ts is copied out, broken several
 *      ways, and the unit checks must FAIL on every mutant (and pass on the
 *      original).
 *
 * Run: `npx tsx scripts/test/comparison-table-prices.test.tsx` (wired into
 * `validate:content`; needs no build output).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
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

/** Text of the name <td> of the row keyed to `rank` (null = no marked name cell). */
function nameCell(markup: string, rank: number): string | null {
  const row = new RegExp(`<tr\\b[^>]*data-pick-rank="${rank}"[^>]*>([\\s\\S]*?)</tr>`).exec(markup)?.[1];
  if (!row) return null;
  return /<td\b[^>]*data-name-cell=""[^>]*>([\s\S]*?)<\/td>/.exec(row)?.[1] ?? null;
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
const LIVE = { rank: 1, name: 'Card Live Name', price: '$42.00', priceStamp: 'Current price · checked Sep 20, 2026', priceBasis: 'current', priceCheckedAt: '2026-09-20' };
const DARK = { rank: 2, name: 'Card Dark Name', price: '' };

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

  // (4) Name cell comes from the pick, never the typed text (default column 0).
  if (nameCell(markup, 1) !== LIVE.name) problems.push(`live row name cell ${JSON.stringify(nameCell(markup, 1))} != card ${LIVE.name}`);
  if (nameCell(markup, 2) !== DARK.name) problems.push(`dark row name cell ${JSON.stringify(nameCell(markup, 2))} != card ${DARK.name}`);
  if (/>Live<|>Dark</.test(markup)) problems.push('typed keyed-row name rendered');
  // Rank swap: rows typed with each other's names still pair name + price from one pick.
  const swapped = mod.parseComparisonTable({
    headers: raw.headers,
    rows: [
      { pickRef: 'r1', cells: ['Card Dark Name', '', 'x'] },
      { pickRef: 'r2', cells: ['Card Live Name', '', 'y'] },
    ],
  });
  const swappedTable = swapped.spec && mod.resolveComparisonTable(swapped.spec, [LIVE, DARK]).table;
  if (!swappedTable) problems.push('swapped-name table failed to resolve');
  else {
    const m = renderToStaticMarkup(<HeadersComparisonTable table={swappedTable} />);
    if (nameCell(m, 1) !== LIVE.name || nameCell(m, 2) !== DARK.name)
      problems.push(`swapped typed names rendered: r1=${nameCell(m, 1)} r2=${nameCell(m, 2)}`);
    problems.push(...cellProblems(priceCell(m, 1), LIVE).map((p) => `swapped live row: ${p}`));
  }
  // Explicit nameColumn.
  const namedCol = mod.parseComparisonTable({
    headers: ['Role', 'Price', 'Product'],
    nameColumn: 2,
    rows: [{ pickRef: 'r1', cells: ['x', '', 'typed'] }],
  });
  const namedTable = namedCol.spec && !namedCol.errors.length && mod.resolveComparisonTable(namedCol.spec, [LIVE, DARK]).table;
  if (!namedTable) problems.push(`nameColumn: 2 table failed: ${namedCol.errors.join('; ')}`);
  else if (namedTable.rows[0].cells[2] !== LIVE.name || namedTable.rows[0].cells[0] !== 'x')
    problems.push(`nameColumn: 2 rendered cells ${JSON.stringify(namedTable.rows[0].cells)}`);
  for (const [label, extra] of [
    ['nameColumn out of range', { nameColumn: 7 }],
    ['nameColumn not a number', { nameColumn: 'Product' }],
    ['nameColumn equal to priceColumn', { nameColumn: 1 }],
  ] as const) {
    if (!mod.parseComparisonTable({ ...raw, ...extra }).errors.length) problems.push(`${label} was accepted`);
  }

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

  const errorsFor = (table: unknown, picks = [LIVE, DARK], declared?: number[]) => {
    const p = mod.parseComparisonTable(table);
    return [...p.errors, ...(p.spec ? mod.resolveComparisonTable(p.spec, picks, declared).errors : [])];
  };

  // (1) A declared pick missing from the rendered roster (suppressed / dark /
  // removed) resolves to "–" without an error; an undeclared rank still fails.
  const dropped = mod.resolveComparisonTable(parsed.spec, [LIVE], [1, 2]);
  if (dropped.errors.length) problems.push(`declared-but-dropped pick r2 raised: ${dropped.errors.join('; ')}`);
  if (dropped.table) {
    const m = renderToStaticMarkup(<HeadersComparisonTable table={dropped.table} />);
    problems.push(...cellProblems(priceCell(m, 2), null).map((p) => `dropped row: ${p}`));
    problems.push(...cellProblems(priceCell(m, 1), LIVE).map((p) => `live row beside dropped: ${p}`));
  } else problems.push('declared-but-dropped pick produced no table');
  const undeclared = errorsFor({ ...raw, rows: [...raw.rows, { pickRef: 'r9', cells: ['Ghost', '', 'q'] }] }, [LIVE, DARK], [1, 2]);
  if (!undeclared.length) problems.push('pickRef r9 (never declared) was accepted');

  // (2) A `$` in any non-price column fails — keyed or unkeyed row, and any
  // cell of a table with no price column.
  const costHeaders = ['Product', 'Price', 'Cost/yr'];
  if (!errorsFor({ headers: costHeaders, rows: [{ pickRef: 'r1', cells: ['A', '', '$120/yr'] }] }).length)
    problems.push('keyed row with $120/yr in a non-price column was accepted');
  if (!errorsFor({ headers: costHeaders, rows: [{ pickRef: 'none', cells: ['Step', '', '$ 15 refill'] }] }).length)
    problems.push('unkeyed row with $ 15 in a non-price column was accepted');
  if (!errorsFor({ headers: costHeaders, rows: [{ pickRef: 'r1', cells: ['$5 off A', '', 'x'] }] }).length)
    problems.push('keyed row with $5 in the product column was accepted');
  if (!errorsFor({ headers: ['Product', 'Role'], rows: [{ pickRef: 'r1', cells: ['A', '$9'] }] }).length)
    problems.push('table without a price column accepted a $ figure');
  // (5) Wider money guard: spacing / leading-dot / fullwidth / USD variants
  // in cells, and any figure in a header cell.
  for (const cell of ['$  120', '$.99', '＄120', 'US$120', 'USD 120', 'usd120', '120 USD', '120 dollars']) {
    if (!errorsFor({ headers: costHeaders, rows: [{ pickRef: 'r1', cells: ['A', '', cell] }] }).length)
      problems.push(`keyed row with ${JSON.stringify(cell)} in a non-price column was accepted`);
  }
  for (const header of ['Under $50', 'Cost (USD 20+)', 'Refill ＄']) {
    const figure = /\d/.test(header);
    const errs = errorsFor({ headers: ['Product', 'Price', header], rows: [{ pickRef: 'r1', cells: ['A', '', 'x'] }] });
    if (figure && !errs.length) problems.push(`header ${JSON.stringify(header)} was accepted`);
    if (!figure && errs.length) problems.push(`header ${JSON.stringify(header)} (no figure) raised: ${errs.join('; ')}`);
  }
  // No false positives on ordinary words.
  for (const cell of ['USDA organic', 'Uses 2 AA batteries', 'Saves money', 'Model S2']) {
    const errs = errorsFor({ headers: costHeaders, rows: [{ pickRef: 'r1', cells: ['A', '', cell] }] });
    if (errs.length) problems.push(`plain text ${JSON.stringify(cell)} raised: ${errs.join('; ')}`);
  }
  // (6) Declared-but-dropped pick: typed frontmatter name stays, price "–".
  if (dropped.table) {
    const m = renderToStaticMarkup(<HeadersComparisonTable table={dropped.table} />);
    if (nameCell(m, 2) !== 'Dark') problems.push(`dropped row name cell ${JSON.stringify(nameCell(m, 2))} != typed "Dark"`);
  }

  // A typed keyed price cell is overwritten, never an error.
  if (errorsFor({ headers: costHeaders, rows: [{ pickRef: 'r1', cells: ['A', '$1.00', '1 yr'] }] }).length)
    problems.push('typed keyed-row price cell raised instead of being overwritten');

  // (3) Headers-shape rows that would silently drop now fail loudly.
  const shapeCases: Array<[string, unknown[]]> = [
    ['row with cells but no pickRef', [raw.rows[0], { cells: ['Loose', '', 'x'] }]],
    ['misspelled key pickref', [raw.rows[0], { pickref: 'r2', cells: ['Dark', '', 'y'] }]],
    ['misspelled key pick_ref', [raw.rows[0], { pick_ref: 'r2', cells: ['Dark', '', 'y'] }]],
    ['pickRef value R2', [raw.rows[0], { pickRef: 'R2', cells: ['Dark', '', 'y'] }]],
    ['pickRef value 2', [raw.rows[0], { pickRef: 2, cells: ['Dark', '', 'y'] }]],
    ['pickRef value rank2', [raw.rows[0], { pickRef: 'rank2', cells: ['Dark', '', 'y'] }]],
    ['pickRef value r02', [raw.rows[0], { pickRef: 'r02', cells: ['Dark', '', 'y'] }]],
    ['pickRef value None', [raw.rows[0], { pickRef: 'None', cells: ['Step', '', 'y'] }]],
    ['label/values row mixed in', [raw.rows[0], { label: 'Weight', values: ['1 lb', '2 lb'] }]],
    ['duplicate pickRef r1', [raw.rows[0], { pickRef: 'r1', cells: ['Live again', '', 'x'] }]],
    ['misspelled key on every row', [{ pickref: 'r1', cells: ['Live', '', 'x'] }]],
  ];
  for (const [label, rows] of shapeCases) {
    if (!errorsFor({ headers: raw.headers, rows }).length) problems.push(`${label} was accepted`);
  }
  // Label-shaped tables (with or without `headers`) are not this module's: no spec, no error.
  for (const t of [
    { rows: [{ label: 'Weight', values: ['1 lb'] }] },
    { headers: ['Spec', 'A'], rows: [{ label: 'Weight', values: ['1 lb'] }] },
  ]) {
    const p = mod.parseComparisonTable(t);
    if (p.spec || p.errors.length) problems.push(`label-shaped table ${JSON.stringify(t)} was claimed by the headers parser`);
  }
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

  const DROPPED_ROW = '    - pickRef: r3\n      cells: ["Fixture Dropped Pick", "$777.77", "Dropped from the roster"]\n';
  const fill = (unkeyed: string, droppedRow = '') =>
    FIXTURE.replace('{{LIVE_ASIN}}', livePick.asin!)
      .replace('{{DARK_ASIN}}', darkPick.asin!)
      .replace('{{UNKEYED_PRICE_CELL}}', unkeyed)
      .replace('{{DROPPED_ROW}}', droppedRow);
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
  check('(i) live row name cell = card name', !!fLive && nameCell(markup, 1) === fLive.name, `${nameCell(markup, 1)} vs ${fLive?.name}`);
  check('(i) dark row name cell = card name', !!fDark && nameCell(markup, 2) === fDark.name, `${nameCell(markup, 2)} vs ${fDark?.name}`);
  {
    const swappedSrc = fill('').replace('cells: ["Fixture Dark Pick", "$888.88"', 'cells: ["Fixture Live Pick", "$888.88"');
    const g = parseGuide('fixture-comparison-table-prices', swappedSrc);
    const m = renderToStaticMarkup(<GuideComparisonTable picks={g.picks} comparison={g.comparison} guideSlug={g.slug} />);
    check('(i) r2 row typed with r1\'s name renders r2\'s card name', nameCell(m, 2) === 'Fixture Dark Pick', String(nameCell(m, 2)));
    const issues = cellProblems(priceCell(m, 2), null);
    check('(i) ... beside r2\'s own price cell ("–")', !issues.length, issues.join('; '));
  }

  // Must throw OUR error (it names `comparison`), not e.g. a YAML syntax error
  // from a broken fixture substitution — otherwise the check passes vacuously.
  const throws = (label: string, src: string) => {
    let msg = '';
    try {
      parseGuide('fixture-comparison-table-prices', src);
    } catch (err) {
      msg = String(err);
    }
    check(label, /comparison/.test(msg), msg ? msg.slice(0, 200) : 'did not throw');
  };
  throws('(d) unkeyed row with $12.99 in the price column fails the parse', fill('$12.99'));
  throws('(d) unknown pickRef fails the parse', fill('').replace('pickRef: r2', 'pickRef: r9'));
  throws(
    '(d) legacy array rows mixed with keyed rows fail the parse',
    fill('').replace('    - pickRef: none', '    - ["Legacy", "$5.00", "row"]\n    - pickRef: none'),
  );
  // (f) r3 is declared in the fixture frontmatter but has no name, so the
  // roster drops it (the same way a suppressed / removed pick leaves it). Its
  // row must render "–", not throw.
  let droppedMarkup = '';
  try {
    const g = parseGuide('fixture-comparison-table-prices', fill('', DROPPED_ROW));
    check('(f) fixture roster really drops r3', !g.picks?.some((p) => p.rank === 3));
    droppedMarkup = renderToStaticMarkup(<GuideComparisonTable picks={g.picks} comparison={g.comparison} guideSlug={g.slug} />);
  } catch (err) {
    check('(f) row keyed to a dropped (declared) pick does not throw', false, String(err));
  }
  if (droppedMarkup) {
    const issues = cellProblems(priceCell(droppedMarkup, 3), null);
    check('(f) row keyed to a dropped (declared) pick renders "–" in the price cell', !issues.length, issues.join('; '));
    check('(f) dropped pick\'s typed $777.77 never renders', !droppedMarkup.includes('$777.77'));
    check(
      '(f) dropped pick keeps its typed frontmatter name (no card to read)',
      nameCell(droppedMarkup, 3) === 'Fixture Dropped Pick',
      String(nameCell(droppedMarkup, 3)),
    );
  }
  throws('(f) pickRef naming a rank the frontmatter never declared still fails', fill('').replace('pickRef: r2', 'pickRef: r9'));
  throws('(g) keyed row with a $ in a non-price column fails', fill('').replace('"Dark: no figure"', '"$40/yr refills"'));
  throws('(g) unkeyed row with a $ in a non-price column fails', fill('').replace('"Not a pick"', '"About $15"'));
  for (const v of ['$  120', '$.99', '＄120', 'US$120', 'USD 120', '120 USD']) {
    throws(`(j) keyed row with ${JSON.stringify(v)} in a non-price column fails`, fill('').replace('"Dark: no figure"', JSON.stringify(v)));
  }
  throws('(j) header with a $ figure fails', fill('').replace('"Role"]', '"Under $50"]'));
  throws('(h) row missing pickRef fails', fill('').replace('    - pickRef: none\n', '    - '));
  throws('(h) misspelled pickref key fails', fill('').replace('- pickRef: r2', '- pickref: r2'));
  throws('(h) malformed pickRef value fails', fill('').replace('pickRef: r2', 'pickRef: R2'));
  throws(
    '(h) label/values row mixed with pickRef rows fails',
    fill('').replace('    - pickRef: none', '    - label: "Weight"\n      values: ["1 lb", "2 lb"]\n    - pickRef: none'),
  );
  throws('(h) duplicate pickRef rows fail', fill('').replace('pickRef: r2', 'pickRef: r1'));

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
  // Every array-shaped (unmigrated) table still renders nothing, and every
  // label-shaped table still takes the label path (no headers table attached).
  const guidesDir = path.join(REPO_ROOT, 'src', 'content', 'guides');
  let arrayShaped = 0;
  let labelShaped = 0;
  for (const file of fs.readdirSync(guidesDir).filter((f) => f.endsWith('.md'))) {
    const slug = file.replace(/\.md$/, '');
    const cmp = matter(fs.readFileSync(path.join(guidesDir, file), 'utf8')).data.comparison as { rows?: unknown[] } | undefined;
    if (!cmp || !Array.isArray(cmp.rows) || !cmp.rows.length) continue;
    const g = getGuideBySlug(slug);
    if (!g) continue;
    if (cmp.rows.every((r) => Array.isArray(r))) {
      arrayShaped++;
      const m = renderToStaticMarkup(<GuideComparisonTable picks={g.picks} comparison={g.comparison} guideSlug={g.slug} />);
      if (m !== '') check(`${slug}: unmigrated array-row table still renders no table`, false);
    } else if (cmp.rows.every((r) => !!r && typeof r === 'object' && !Array.isArray(r) && 'label' in r)) {
      labelShaped++;
      if (g.comparison?.table) check(`${slug}: label-shaped table stays on the label path`, false);
    }
  }
  check(`all ${arrayShaped} array-shaped guide table(s) render no table`, arrayShaped > 0);
  check(`all ${labelShaped} label-shaped guide table(s) stay on the label path`, labelShaped > 0);

  // ---- 4. Mutation ------------------------------------------------------------
  console.log('comparison-table-prices: mutation');
  const source = fs.readFileSync(SOURCE, 'utf8');
  const mutants: Array<[string, string, string]> = [
    ['typed-price', '            figure: pick.price,\n', '            figure: row.cells[priceColumn] || pick.price,\n'],
    ['dark-figure', '      pick && pick.price && pick.priceStamp\n', '      pick\n'],
    ['unkeyed-dollar', '      if (!DOLLAR_FIGURE.test(c)) return;\n', '      if (!DOLLAR_FIGURE.test(c) || row.pickRank === undefined) return;\n'],
    ['nonprice-dollar', '      if (row.pickRank !== undefined && col === priceColumn) return;\n', '      if (row.pickRank !== undefined) return;\n'],
    ['dropped-pick-throws', '    if (!pick && !declared.has(row.pickRank)) {\n', '    if (!pick) {\n'],
    ['undeclared-accepted', '    if (!pick && !declared.has(row.pickRank)) {\n', '    if (false) {\n'],
    ['missing-pickref-dropped', "    if (!('pickRef' in r)) {\n", "    if (!('pickRef' in r)) {\n      return;\n"],
    ['duplicate-accepted', '      if (first !== undefined) {\n', '      if (false) {\n'],
    ['loose-rank-format', "/^r([1-9]\\d*)$/.exec(ref)", "/^[rR]?0*(\\d+)$/.exec(ref)"],
    ['name-typed', '      cells[nameColumn] = pick.name;\n', '\n'],
    ['name-default-col', '  let nameColumn = 0;\n', '  let nameColumn = 2;\n'],
    ['name-price-same-col', '  if (nameColumn === priceColumn) {\n', '  if (false) {\n'],
    ['header-scan-off', '    if (DOLLAR_FIGURE.test(h)) {\n', '    if (false) {\n'],
    ['narrow-dollar', 'export const DOLLAR_FIGURE = /[$\\uFF04]\\s*\\.?\\d|\\bUSD\\s*\\.?\\d|\\d\\s*(?:USD|dollars?)\\b/i;', 'export const DOLLAR_FIGURE = /\\$\\s?\\d/;'],
    ['label-rows-ignored', "    if (!isObj(r)) {\n", "    if (!isObj(r) || ('label' in r && !('cells' in r))) return;\n    if (!isObj(r)) {\n"],
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
