#!/usr/bin/env npx tsx
/**
 * COMPARISON CHARTS CARRY NO PRICES; A KEYED ROW'S NAME COMES FROM THE PICK
 * (owner decision 2026-09-30, superseding 2026-09-29). Shape and rules:
 * src/lib/comparison-table.ts.
 *
 * Jobs:
 *   1. FIXTURE GUIDE (scripts/test/fixtures/comparison-table-no-prices.fixture.md),
 *      parsed by the REAL parseGuide and rendered by the REAL component, with a
 *      live ASIN and a dark ASIN taken from the corpus at run time:
 *        a. a clean headers chart renders, with no money figure anywhere in
 *           the markup (not even the card's own price) and no price cell;
 *        b. a keyed row's name cell renders the card's product name, never the
 *           typed text (live and dark picks alike);
 *        c. a headers chart with a Price column FAILS the build; so does a
 *           "Cost"-style header and a retired `priceColumn` key;
 *        d. a `$` ANYWHERE fails: a header, a keyed row's cell, a keyed row's
 *           name cell, an unkeyed row's cell — and every money variant
 *           ("$  120", "$.99", "＄120", "US$120", "USD 120", "120 USD");
 *        e. a row keyed to a pick the frontmatter declares but the roster
 *           drops does NOT throw and keeps its typed name; an undeclared rank
 *           fails;
 *        f. shape errors (missing / misspelled / malformed / duplicate
 *           pickRef, label or legacy array rows mixed in) fail;
 *        g. a legacy table of array rows only renders NO table.
 *   2. UNIT: the same properties against the real module with hand-built picks,
 *      plus the WARN-only labelChartPriceFindings() report.
 *   3. CORPUS: every headers chart has no price header and no money figure;
 *      every array-shaped chart renders nothing; every label-shaped chart stays
 *      on the label path (label charts are WARN-only until their cleanup PRs
 *      merge — see scripts/report-label-chart-prices.ts).
 *   4. MUTATION: src/lib/comparison-table.ts is copied out and broken several
 *      ways — including removing the price-header guard and the money-figure
 *      guard — and the unit checks must FAIL on every mutant.
 *
 * Run: `npx tsx scripts/test/comparison-table-no-prices.test.tsx` (wired into
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
const FIXTURE = fs.readFileSync(path.join(REPO_ROOT, 'scripts/test/fixtures/comparison-table-no-prices.fixture.md'), 'utf8');

/** Any money figure in rendered markup (a broad net, independent of the module's regex). */
const MONEY_IN_MARKUP = /[$\uFF04]\s*\.?\d|\bUSD\s*\.?\d|\d\s*(?:USD|dollars?)\b/i;

/** Text of the name <td> of the row keyed to `rank` (null = no marked name cell). */
function nameCell(markup: string, rank: number): string | null {
  const row = new RegExp(`<tr\\b[^>]*data-pick-rank="${rank}"[^>]*>([\\s\\S]*?)</tr>`).exec(markup)?.[1];
  if (!row) return null;
  return /<td\b[^>]*data-name-cell=""[^>]*>([\s\S]*?)<\/td>/.exec(row)?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// 2 + 4. Unit checks, runnable against the real module or a mutant.
// ---------------------------------------------------------------------------
const LIVE = { rank: 1, name: 'Card Live Name' };
const DARK = { rank: 2, name: 'Card Dark Name' };
const MONEY_VARIANTS = ['$12.99', '$  120', '$.99', '＄120', 'US$120', 'USD 120', 'usd120', '120 USD', '120 dollars'];

function unitProblems(mod: Mod): string[] {
  const problems: string[] = [];
  const headers = ['Product', 'Role', 'Lifespan'];
  const raw = {
    headers,
    rows: [
      { pickRef: 'r1', cells: ['Live', 'x', '3 yr'] },
      { pickRef: 'r2', cells: ['Dark', 'y', '5 yr'] },
      { pickRef: 'none', cells: ['Step', 'z', ''] },
    ],
  };
  const errorsFor = (table: unknown, picks = [LIVE, DARK], declared?: number[]) => {
    const p = mod.parseComparisonTable(table);
    return [...p.errors, ...(p.spec ? mod.resolveComparisonTable(p.spec, picks, declared).errors : [])];
  };

  const parsed = mod.parseComparisonTable(raw);
  if (!parsed.spec || parsed.errors.length) return [`clean table failed to parse: ${parsed.errors.join('; ')}`];
  const resolved = mod.resolveComparisonTable(parsed.spec, [LIVE, DARK]);
  if (!resolved.table || resolved.errors.length) return [`clean table failed to resolve: ${resolved.errors.join('; ')}`];
  const markup = renderToStaticMarkup(<HeadersComparisonTable table={resolved.table} />);
  if (MONEY_IN_MARKUP.test(markup)) problems.push('clean table markup carries a money figure');
  if (/data-price/.test(markup)) problems.push('clean table markup carries a price cell');

  // Name cell comes from the pick, never the typed text (default column 0).
  if (nameCell(markup, 1) !== LIVE.name) problems.push(`live row name cell ${JSON.stringify(nameCell(markup, 1))} != card ${LIVE.name}`);
  if (nameCell(markup, 2) !== DARK.name) problems.push(`dark row name cell ${JSON.stringify(nameCell(markup, 2))} != card ${DARK.name}`);
  if (/>Live<|>Dark</.test(markup)) problems.push('typed keyed-row name rendered');
  // Rank swap: rows typed with each other's names still render their own pick's name.
  const swapped = mod.parseComparisonTable({
    headers,
    rows: [
      { pickRef: 'r1', cells: ['Card Dark Name', 'x', ''] },
      { pickRef: 'r2', cells: ['Card Live Name', 'y', ''] },
    ],
  });
  const swappedTable = swapped.spec && mod.resolveComparisonTable(swapped.spec, [LIVE, DARK]).table;
  if (!swappedTable) problems.push('swapped-name table failed to resolve');
  else {
    const m = renderToStaticMarkup(<HeadersComparisonTable table={swappedTable} />);
    if (nameCell(m, 1) !== LIVE.name || nameCell(m, 2) !== DARK.name)
      problems.push(`swapped typed names rendered: r1=${nameCell(m, 1)} r2=${nameCell(m, 2)}`);
  }
  // Explicit nameColumn.
  const namedCol = mod.parseComparisonTable({
    headers: ['Role', 'Lifespan', 'Product'],
    nameColumn: 2,
    rows: [{ pickRef: 'r1', cells: ['x', '3 yr', 'typed'] }],
  });
  const namedTable = namedCol.spec && !namedCol.errors.length && mod.resolveComparisonTable(namedCol.spec, [LIVE, DARK]).table;
  if (!namedTable) problems.push(`nameColumn: 2 table failed: ${namedCol.errors.join('; ')}`);
  else if (namedTable.rows[0].cells[2] !== LIVE.name || namedTable.rows[0].cells[0] !== 'x')
    problems.push(`nameColumn: 2 rendered cells ${JSON.stringify(namedTable.rows[0].cells)}`);
  for (const [label, extra] of [
    ['nameColumn out of range', { nameColumn: 7 }],
    ['nameColumn not a number', { nameColumn: 'Product' }],
  ] as const) {
    if (!mod.parseComparisonTable({ ...raw, ...extra }).errors.length) problems.push(`${label} was accepted`);
  }

  // NO PRICE COLUMN: a price/cost header fails, blank cells or not; so does the retired priceColumn key.
  for (const h of ['Price', 'Approx. price', 'PRICE (checked)', 'Cost', 'Cost/yr', 'Running cost']) {
    const hdrs = ['Product', h, 'Role'];
    if (!errorsFor({ headers: hdrs, rows: [{ pickRef: 'r1', cells: ['A', '', 'x'] }] }).length)
      problems.push(`headers chart with a ${JSON.stringify(h)} column (blank cells) was accepted`);
  }
  if (!errorsFor({ ...raw, priceColumn: 1 }).length) problems.push('retired priceColumn key was accepted');

  // NO MONEY FIGURE ANYWHERE: every column of keyed and unkeyed rows, and headers.
  for (const v of MONEY_VARIANTS) {
    for (const col of [0, 1, 2]) {
      for (const ref of ['r1', 'none']) {
        const cells = ['A', 'x', 'y'];
        cells[col] = v;
        if (!errorsFor({ headers, rows: [{ pickRef: ref, cells }] }).length)
          problems.push(`${ref} row with ${JSON.stringify(v)} in column ${col} was accepted`);
      }
    }
  }
  for (const header of ['Under $50', 'Refill (USD 20+)', 'Lifespan ＄9']) {
    if (!errorsFor({ headers: ['Product', 'Role', header], rows: [{ pickRef: 'r1', cells: ['A', 'x', 'y'] }] }).length)
      problems.push(`header ${JSON.stringify(header)} was accepted`);
  }
  // A card name carrying a money figure is caught too (the rendered name is checked).
  if (!errorsFor(raw, [{ rank: 1, name: 'Deal $5 off' }, DARK]).length) problems.push('card name with a money figure was accepted');
  // No false positives on ordinary words.
  for (const cell of ['USDA organic', 'Uses 2 AA batteries', 'Saves money', 'Model S2', 'Lasts 5 years']) {
    const errs = errorsFor({ headers, rows: [{ pickRef: 'r1', cells: ['A', cell, 'y'] }] });
    if (errs.length) problems.push(`plain text ${JSON.stringify(cell)} raised: ${errs.join('; ')}`);
  }

  // Legacy array rows alone: no table. Mixed with keyed rows: rejected.
  const legacy = mod.parseComparisonTable({ headers, rows: [['Live', '$99.99', 'x']] });
  if (legacy.spec) problems.push('legacy array-row table produced a table');
  if (!mod.parseComparisonTable({ headers, rows: [...raw.rows, ['Live', 'x', 'y']] }).errors.length)
    problems.push('array rows mixed with keyed rows were accepted');

  // Declared-but-dropped pick: no error, typed name kept. Undeclared: fails.
  const dropped = mod.resolveComparisonTable(parsed.spec, [LIVE], [1, 2]);
  if (dropped.errors.length) problems.push(`declared-but-dropped pick r2 raised: ${dropped.errors.join('; ')}`);
  if (dropped.table) {
    const m = renderToStaticMarkup(<HeadersComparisonTable table={dropped.table} />);
    if (nameCell(m, 2) !== 'Dark') problems.push(`dropped row name cell ${JSON.stringify(nameCell(m, 2))} != typed "Dark"`);
    if (nameCell(m, 1) !== LIVE.name) problems.push('live row beside dropped lost its card name');
  } else problems.push('declared-but-dropped pick produced no table');
  if (!errorsFor({ ...raw, rows: [...raw.rows, { pickRef: 'r9', cells: ['Ghost', 'q', ''] }] }, [LIVE, DARK], [1, 2]).length)
    problems.push('pickRef r9 (never declared) was accepted');

  // Headers-shape rows that would silently drop fail loudly.
  const shapeCases: Array<[string, unknown[]]> = [
    ['row with cells but no pickRef', [raw.rows[0], { cells: ['Loose', 'x', ''] }]],
    ['misspelled key pickref', [raw.rows[0], { pickref: 'r2', cells: ['Dark', 'y', ''] }]],
    ['misspelled key pick_ref', [raw.rows[0], { pick_ref: 'r2', cells: ['Dark', 'y', ''] }]],
    ['pickRef value R2', [raw.rows[0], { pickRef: 'R2', cells: ['Dark', 'y', ''] }]],
    ['pickRef value 2', [raw.rows[0], { pickRef: 2, cells: ['Dark', 'y', ''] }]],
    ['pickRef value rank2', [raw.rows[0], { pickRef: 'rank2', cells: ['Dark', 'y', ''] }]],
    ['pickRef value r02', [raw.rows[0], { pickRef: 'r02', cells: ['Dark', 'y', ''] }]],
    ['pickRef value None', [raw.rows[0], { pickRef: 'None', cells: ['Step', 'y', ''] }]],
    ['label/values row mixed in', [raw.rows[0], { label: 'Weight', values: ['1 lb', '2 lb'] }]],
    ['duplicate pickRef r1', [raw.rows[0], { pickRef: 'r1', cells: ['Live again', 'x', ''] }]],
    ['misspelled key on every row', [{ pickref: 'r1', cells: ['Live', 'x', ''] }]],
  ];
  for (const [label, rows] of shapeCases) {
    if (!errorsFor({ headers, rows }).length) problems.push(`${label} was accepted`);
  }
  // Label-shaped tables (with or without `headers`) are not this parser's: no spec, no error —
  // even when they carry a price row (WARN-only until their cleanup PRs merge).
  for (const t of [
    { rows: [{ label: 'Weight', values: ['1 lb'] }] },
    { headers: ['Spec', 'A'], rows: [{ label: 'Weight', values: ['1 lb'] }] },
    { headers: ['Spec', 'A'], rows: [{ label: 'Price', values: ['$10'] }] },
  ]) {
    const p = mod.parseComparisonTable(t);
    if (p.spec || p.errors.length) problems.push(`label-shaped table ${JSON.stringify(t)} was claimed by the headers parser`);
  }

  // WARN-only label report: finds price rows and money figures, nothing else.
  const warn = mod.labelChartPriceFindings;
  if (warn({ rows: [{ label: 'Price', values: ['', ''] }] }).length !== 1) problems.push('label report missed a "Price" row');
  if (warn({ rows: [{ label: 'Upkeep', values: ['$5/mo', 'none'] }] }).length !== 1) problems.push('label report missed a $ value');
  if (warn({ rows: [{ label: 'Ongoing cost', values: ['low'] }] }).length !== 1) problems.push('label report missed a "cost" row');
  if (warn({ headers: ['Spec', 'Under $50'], rows: [{ label: 'Weight', values: ['1 lb'] }] }).length !== 1)
    problems.push('label report missed a $ header');
  if (warn({ rows: [{ label: 'Weight', values: ['1 lb', 'USDA'] }] }).length) problems.push('label report flagged a clean label chart');
  if (warn({ headers, rows: [{ pickRef: 'r1', cells: ['A', '$5', ''] }] }).length)
    problems.push('label report claimed a headers chart (those are blocking, not WARN)');
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
  console.log('comparison-table-no-prices: fixture guide');
  const all = getAllGuides();
  const livePick = all.flatMap((g) => g.picks ?? []).find((p) => p.asin && /^B0[A-Z0-9]{8}$/.test(p.asin) && p.price && p.priceStamp);
  const darkPick = all.flatMap((g) => g.picks ?? []).find((p) => p.asin && /^B0[A-Z0-9]{8}$/.test(p.asin) && p.suppressionReason && !p.price);
  check('corpus has a live pick (figure + stamp) to key the fixture to', !!livePick);
  check('corpus has a dark pick (no figure) to key the fixture to', !!darkPick);
  if (!livePick || !darkPick) return;

  const DROPPED_ROW = '    - pickRef: r3\n      cells: ["Fixture Dropped Pick", "Dropped from the roster", ""]\n';
  const fill = (unkeyed = 'Dechlorinates', droppedRow = '') =>
    FIXTURE.replace('{{LIVE_ASIN}}', livePick.asin!)
      .replace('{{DARK_ASIN}}', darkPick.asin!)
      .replace('{{UNKEYED_CELL}}', unkeyed)
      .replace('{{DROPPED_ROW}}', droppedRow);
  const guide = parseGuide('fixture-comparison-table-no-prices', fill());
  const [fLive, fDark] = [1, 2].map((r) => guide.picks?.find((p) => p.rank === r));
  check('fixture live pick card shows a figure', !!fLive?.price, String(fLive?.price));
  check('fixture dark pick card shows no figure', !!fDark && !fDark.price);
  check('fixture resolves a headers table', !!guide.comparison?.table?.rows.length);
  const markup = renderToStaticMarkup(
    <GuideComparisonTable picks={guide.picks} comparison={guide.comparison} guideSlug={guide.slug} />,
  );
  check('(a) chart renders', /data-comparison-shape="headers"/.test(markup));
  check('(a) chart markup carries no money figure', !MONEY_IN_MARKUP.test(markup), MONEY_IN_MARKUP.exec(markup)?.[0]);
  check('(a) chart markup never carries the card price', !!fLive?.price && !markup.includes(fLive.price));
  check('(a) chart markup has no price cell / stamp', !/data-price|checked /.test(markup));
  check('unkeyed row renders verbatim', /Checklist step/.test(markup) && /Dechlorinates/.test(markup));
  check('(b) live row name cell = card name', !!fLive && nameCell(markup, 1) === fLive.name, `${nameCell(markup, 1)} vs ${fLive?.name}`);
  check('(b) dark row name cell = card name', !!fDark && nameCell(markup, 2) === fDark.name, `${nameCell(markup, 2)} vs ${fDark?.name}`);
  check('(b) typed keyed-row names never render', !/Typed name r[12]/.test(markup));

  // Must throw OUR error (it names `comparison`), not e.g. a YAML syntax error
  // from a broken fixture substitution — otherwise the check passes vacuously.
  const throws = (label: string, src: string) => {
    let msg = '';
    try {
      parseGuide('fixture-comparison-table-no-prices', src);
    } catch (err) {
      msg = String(err);
    }
    check(label, /comparison/.test(msg), msg ? msg.slice(0, 200) : 'did not throw');
  };
  const priceCol = (src: string) =>
    src
      .replace('["Product", "Role", "Lifespan"]', '["Product", "Price", "Role", "Lifespan"]')
      .replace('["Typed name r1", ', '["Typed name r1", "", ')
      .replace('["Typed name r2", ', '["Typed name r2", "", ')
      .replace('["Checklist step", ', '["Checklist step", "", ');
  throws('(c) headers chart with a Price column (blank cells) fails', priceCol(fill()));
  throws('(c) headers chart with a Cost/yr header fails', fill().replace('"Lifespan"]', '"Cost/yr"]'));
  throws('(c) retired priceColumn key fails', fill().replace('  rows:\n', '  priceColumn: 1\n  rows:\n'));
  throws('(d) $ in a header fails', fill().replace('"Lifespan"]', '"Under $50"]'));
  throws('(d) $ in a keyed row cell fails', fill().replace('"Heavy-duty pick"', '"$40/yr refills"'));
  throws('(d) $ in a keyed row name cell fails (even though the name is overwritten)', fill().replace('"Typed name r1"', '"$5 off"'));
  throws('(d) $ in an unkeyed row cell fails', fill('About $15'));
  for (const v of MONEY_VARIANTS) throws(`(d) ${JSON.stringify(v)} in a cell fails`, fill().replace('"3-5 years"', JSON.stringify(v)));

  // (e) r3 is declared in the fixture frontmatter but has no name, so the
  // roster drops it (the way a suppressed / removed pick leaves it).
  try {
    const g = parseGuide('fixture-comparison-table-no-prices', fill(undefined, DROPPED_ROW));
    check('(e) fixture roster really drops r3', !g.picks?.some((p) => p.rank === 3));
    const m = renderToStaticMarkup(<GuideComparisonTable picks={g.picks} comparison={g.comparison} guideSlug={g.slug} />);
    check('(e) dropped pick keeps its typed frontmatter name', nameCell(m, 3) === 'Fixture Dropped Pick', String(nameCell(m, 3)));
  } catch (err) {
    check('(e) row keyed to a dropped (declared) pick does not throw', false, String(err));
  }
  throws('(e) pickRef naming a rank the frontmatter never declared fails', fill().replace('pickRef: r2', 'pickRef: r9'));
  throws('(f) row missing pickRef fails', fill().replace('    - pickRef: none\n', '    - '));
  throws('(f) misspelled pickref key fails', fill().replace('- pickRef: r2', '- pickref: r2'));
  throws('(f) malformed pickRef value fails', fill().replace('pickRef: r2', 'pickRef: R2'));
  throws(
    '(f) label/values row mixed with pickRef rows fails',
    fill().replace('    - pickRef: none', '    - label: "Weight"\n      values: ["1 lb", "2 lb"]\n    - pickRef: none'),
  );
  throws(
    '(f) legacy array rows mixed with keyed rows fail',
    fill().replace('    - pickRef: none', '    - ["Legacy", "row", "x"]\n    - pickRef: none'),
  );
  throws('(f) duplicate pickRef rows fail', fill().replace('pickRef: r2', 'pickRef: r1'));

  const legacyOnly = fill().replace(/  rows:\n[\s\S]*?\n---/, '  rows:\n    - ["Fixture Live Pick", "$999.99", "legacy"]\n---');
  const legacyGuide = parseGuide('fixture-comparison-table-no-prices', legacyOnly);
  const legacyMarkup = renderToStaticMarkup(
    <GuideComparisonTable picks={legacyGuide.picks} comparison={legacyGuide.comparison} guideSlug={legacyGuide.slug} />,
  );
  check('(g) legacy array-row-only table renders no table', legacyMarkup === '', legacyMarkup.slice(0, 120));

  // ---- 2. Unit checks on the real module ------------------------------------
  console.log('comparison-table-no-prices: unit (real module)');
  const real = await import('../../src/lib/comparison-table');
  const realProblems = unitProblems(real);
  check('real module passes every unit check', !realProblems.length, realProblems.join('; '));

  // ---- 3. Corpus -------------------------------------------------------------
  console.log('comparison-table-no-prices: corpus');
  let tables = 0;
  for (const g of all as Guide[]) {
    const t = g.comparison?.table;
    if (!t) continue;
    tables++;
    const m = renderToStaticMarkup(<GuideComparisonTable picks={g.picks} comparison={g.comparison} guideSlug={g.slug} />);
    check(`${g.slug}: headers chart has no price/cost header`, !t.headers.some((h) => /price|cost/i.test(h)));
    check(`${g.slug}: headers chart markup has no money figure`, !MONEY_IN_MARKUP.test(m));
  }
  console.log(`  ${tables} guide(s) carry a headers chart`);
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
  console.log('comparison-table-no-prices: mutation');
  const source = fs.readFileSync(SOURCE, 'utf8');
  const mutants: Array<[string, string, string]> = [
    ['price-header-guard-removed', '    if (PRICE_HEADER.test(h)) {\n', '    if (false) {\n'],
    ['price-header-narrow', 'export const PRICE_HEADER = /price|cost/i;', 'export const PRICE_HEADER = /^price$/;'],
    ['money-cell-guard-removed', '      if (!DOLLAR_FIGURE.test(c)) return;\n', '      return;\n'],
    ['money-cell-keyed-only', '      if (!DOLLAR_FIGURE.test(c)) return;\n', '      if (!DOLLAR_FIGURE.test(c) || row.pickRank === undefined) return;\n'],
    ['money-cell-skips-name', '      if (!DOLLAR_FIGURE.test(c)) return;\n', '      if (!DOLLAR_FIGURE.test(c) || (row.pickRank !== undefined && col === nameColumn)) return;\n'],
    ['money-header-guard-removed', '    } else if (DOLLAR_FIGURE.test(h)) {\n', '    } else if (false) {\n'],
    ['money-card-name-unchecked', '      if (DOLLAR_FIGURE.test(pick.name)) {\n', '      if (false) {\n'],
    ['narrow-dollar', 'export const DOLLAR_FIGURE = /[$\\uFF04]\\s*\\.?\\d|\\bUSD\\s*\\.?\\d|\\d\\s*(?:USD|dollars?)\\b/i;', 'export const DOLLAR_FIGURE = /\\$\\s?\\d/;'],
    ['price-column-accepted', '  if (v.priceColumn !== undefined) {\n', '  if (false) {\n'],
    ['dropped-pick-throws', '    if (!pick && !declared.has(row.pickRank)) {\n', '    if (!pick) {\n'],
    ['undeclared-accepted', '    if (!pick && !declared.has(row.pickRank)) {\n', '    if (false) {\n'],
    ['missing-pickref-dropped', "    if (!('pickRef' in r)) {\n", "    if (!('pickRef' in r)) {\n      return;\n"],
    ['duplicate-accepted', '      if (first !== undefined) {\n', '      if (false) {\n'],
    ['loose-rank-format', "/^r([1-9]\\d*)$/.exec(ref)", "/^[rR]?0*(\\d+)$/.exec(ref)"],
    ['name-typed', '      cells[nameColumn] = pick.name;\n', '\n'],
    ['name-default-col', '  let nameColumn = 0;\n', '  let nameColumn = 2;\n'],
    ['label-rows-ignored', "    if (!isObj(r)) {\n", "    if (!isObj(r) || ('label' in r && !('cells' in r))) return;\n    if (!isObj(r)) {\n"],
    ['warn-report-values-off', '    const money = values.filter((x) => DOLLAR_FIGURE.test(x));\n', '    const money: string[] = [];\n'],
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
      console.error(`comparison-table-no-prices: ${failures} failure(s)`);
      process.exit(1);
    }
    console.log('comparison-table-no-prices: PASS');
  });
