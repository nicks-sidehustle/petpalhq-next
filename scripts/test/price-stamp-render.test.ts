#!/usr/bin/env npx tsx
/**
 * DATED "CHECKED" STAMP — built-HTML gate. READS THE BUILT HTML, NOT THE SOURCE.
 *
 * Owner rulings 2026-09-24 (CLAUDE.md §3/§4): "every displayed price carries a
 * dated 'checked <date>' notation" — "we are in compliance as long as all the
 * list prices have a date stamped check notation."
 *
 * Same choice as buy-path-floor.test.ts: the stamp is a property of the shipped
 * markup, so the shipped markup is what is parsed, and the expected date is
 * re-derived HERE from the raw data files — never read back from the pick the
 * renderer used.
 *
 * Jobs:
 *   1. MUTATION. The surface checker below fails on a real built card whose
 *      stamp is removed, whose date is changed, or which is labeled "List"
 *      when its basis is not LIST_PRICE — so it cannot pass by reading nothing.
 *   2. CARDS + DEEP DIVES. Every rendered pick figure has an ADJACENT stamp
 *      (the next element) whose `data-checked` equals the source row date
 *      (snapshot `lastChecked`, or the live-read override's `readAt`), whose
 *      text is "<List|Current> price · checked <Mon D, YYYY>", and whose figure
 *      equals the source figure. "List" only when the snapshot basis is
 *      LIST_PRICE and the figure equals listPrice. A pick with no dated source
 *      renders no figure. Dark cards render neither figure nor stamp.
 *   3. STICKY BAR. Its figure and stamp equal the top card's.
 *   4. DEALS PAGE. Any figure it renders carries an adjacent stamp.
 *   5. JSON-LD. Where a pick's Product node carries an Offer price, it equals
 *      the figure on the card (reported, and failed, on mismatch).
 *   6. VACUITY. Enough stamped surfaces and dark cards were actually read.
 *
 * Run: `npx tsx scripts/test/price-stamp-render.test.ts` (needs `next build` output).
 */
import fs from 'node:fs';
import path from 'node:path';
import { getGuideBySlug, type GuidePick } from '../../src/lib/guides';
import { formatCheckedDate, priceStampText } from '../../src/lib/price-stamp';

const APP_DIR = path.join(process.cwd(), '.next/server/app');
const BUILD_DIR = path.join(APP_DIR, 'guides');
const DAY_MS = 86_400_000;
const OVERRIDE_MAX_AGE_DAYS = 7;

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) return;
  failures++;
  console.error(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
}

// ---------------------------------------------------------------------------
// Raw sources, read independently of src/lib (the expected values)
// ---------------------------------------------------------------------------
type Row = { price?: string | null; lastChecked?: string; listPrice?: string | null; listPriceBasis?: string | null };
type Override = { price?: number | null; condition?: string | null; readAt?: string | null };
const readJson = <T,>(rel: string): T => JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8')) as T;
const SNAPSHOT = readJson<Record<string, Row>>('data/amazon-prices.json');
const OVERRIDES = fs.existsSync(path.join(process.cwd(), 'data/live-read-overrides.json'))
  ? readJson<Record<string, Override>>('data/live-read-overrides.json')
  : {};

const day = (iso?: string | null) => /^\d{4}-\d{2}-\d{2}/.exec(iso || '')?.[0] ?? null;
const amount = (v?: string | number | null) => {
  if (typeof v === 'number') return v;
  const m = /([\d,]+(?:\.\d+)?)/.exec(v || '');
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
};
const usd = (n: number) => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

interface Expected {
  figure: string;
  day: string;
  basis: 'list' | 'current';
  source: 'snapshot' | 'override';
}

/** What the page must show for this pick, from the raw files. null = no figure. */
function expectedFor(pick: GuidePick, now: Date): Expected | null {
  if (pick.suppressionReason) return null;
  const asin = pick.asin;
  if (!asin) return null;
  if (pick.darkCardMode === 'override') {
    const o = OVERRIDES[asin];
    const d = day(o?.readAt);
    const age = o?.readAt ? (now.getTime() - Date.parse(o.readAt)) / DAY_MS : NaN;
    if (!o || !d || typeof o.price !== 'number' || (o.condition || '').toLowerCase() !== 'new') return null;
    if (!(age >= 0 && age <= OVERRIDE_MAX_AGE_DAYS)) return null;
    return { figure: usd(o.price), day: d, basis: 'current', source: 'override' };
  }
  const row = SNAPSHOT[asin];
  const d = day(row?.lastChecked);
  if (!row?.price || !d) return null;
  const isList =
    row.listPriceBasis === 'LIST_PRICE' &&
    amount(row.price) !== null &&
    amount(row.price) === amount(row.listPrice);
  return { figure: row.price, day: d, basis: isList ? 'list' : 'current', source: 'snapshot' };
}

// ---------------------------------------------------------------------------
// Built-markup parsing (same depth-counted slicing as buy-path-floor.test.ts)
// ---------------------------------------------------------------------------
function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
}

function blocks(html: string, tag: string, openRe: RegExp): string[] {
  const out: string[] = [];
  const token = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  let m: RegExpExecArray | null;
  let depth = 0;
  let start = -1;
  while ((m = token.exec(html))) {
    const closing = m[1] === '/';
    if (!closing) {
      if (depth === 0 && openRe.test(m[0])) start = m.index;
      if (start >= 0) depth++;
    } else if (start >= 0) {
      depth--;
      if (depth === 0) {
        out.push(html.slice(start, m.index + m[0].length));
        start = -1;
      }
    }
  }
  return out;
}

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** Every figure element with the element that follows it (its adjacent sibling). */
const FIGURE_P = /<p\b[^>]*\sdata-price-figure=""[^>]*>([^<]*)<\/p>(\s*<p\b[^>]*>[^<]*<\/p>)?/g;
const STAMP_P = /^\s*<p\b([^>]*\sdata-price-stamp=""[^>]*)>([^<]*)<\/p>$/;

/**
 * Problems with one card / deep-dive block against what the sources say. Empty
 * array = compliant. This is the function job 1 mutates against.
 */
function surfaceProblems(markup: string, expected: Expected | null): string[] {
  const problems: string[] = [];
  const figures = [...markup.matchAll(FIGURE_P)];
  const anyStamp = /data-price-stamp=""/.test(markup);
  if (!expected) {
    if (figures.length) problems.push(`renders a figure (${figures[0][1]}) with no dated source`);
    if (anyStamp) problems.push('renders a stamp with no figure');
    return problems;
  }
  if (figures.length !== 1) {
    problems.push(`expected exactly one figure (${expected.figure}), found ${figures.length}`);
    return problems;
  }
  const [, figureText, next] = figures[0];
  if (figureText.trim() !== expected.figure) problems.push(`figure ${figureText} != source ${expected.figure}`);
  const stamp = next ? STAMP_P.exec(next) : null;
  if (!stamp) {
    problems.push('figure has no adjacent "checked <date>" stamp');
    return problems;
  }
  const [, attrs, text] = stamp;
  const checked = attr(` ${attrs}`, 'data-checked');
  const basis = attr(` ${attrs}`, 'data-price-basis');
  if (checked !== expected.day) problems.push(`stamp date ${checked} != source ${expected.source} date ${expected.day}`);
  if (basis !== expected.basis) problems.push(`stamp basis ${basis} != expected ${expected.basis}`);
  const want = priceStampText(expected.basis, expected.day);
  if (text !== want) problems.push(`stamp text ${JSON.stringify(text)} != ${JSON.stringify(want)}`);
  if (/^List price/.test(text) && expected.basis !== 'list') problems.push('labeled "List price" but the figure is not Amazon\'s list price');
  return problems;
}

// ---------------------------------------------------------------------------
// Unit sanity on the formatter (no timezone shift, no leading zero)
// ---------------------------------------------------------------------------
check('formatCheckedDate("2026-09-08") === "Sep 8, 2026"', formatCheckedDate('2026-09-08') === 'Sep 8, 2026');
check('formatCheckedDate("2026-12-31") === "Dec 31, 2026"', formatCheckedDate('2026-12-31') === 'Dec 31, 2026');
check('formatCheckedDate("2026-01-01") === "Jan 1, 2026"', formatCheckedDate('2026-01-01') === 'Jan 1, 2026');

if (!fs.existsSync(BUILD_DIR)) {
  console.error(`price-stamp-render: no build output at ${BUILD_DIR} — run \`next build\` first.`);
  process.exit(1);
}

const now = new Date();
const files = fs.readdirSync(BUILD_DIR).filter((f) => f.endsWith('.html')).sort();

let stampedSurfaces = 0;
let darkSurfaces = 0;
let undatedSurfaces = 0;
let stickyBars = 0;
let offersCompared = 0;
const bySource: Record<string, number> = { snapshot: 0, override: 0 };
const byBasis: Record<string, number> = { list: 0, current: 0 };
const byDay: Record<string, number> = {};
let mutationSample: { markup: string; expected: Expected } | null = null;

for (const file of files) {
  const slug = file.replace(/\.html$/, '');
  const raw = fs.readFileSync(path.join(BUILD_DIR, file), 'utf8');
  const html = stripScripts(raw);
  const roster = getGuideBySlug(slug)?.picks ?? [];
  if (!roster.length) continue;

  const picksSection = blocks(html, 'section', /id="featured-picks"/)[0] ?? '';
  const cardBlocks = blocks(picksSection, 'article', /<article/i);
  const deepDiveBlocks = blocks(html, 'section', /class="[^"]*\bpick-card\b/);
  check(`${slug}: ${cardBlocks.length} cards for roster ${roster.length}`, cardBlocks.length === roster.length);
  check(`${slug}: ${deepDiveBlocks.length} deep dives for roster ${roster.length}`, deepDiveBlocks.length === roster.length);

  // JSON-LD Offer prices by Product url fragment.
  const offerByAnchor = new Map<string, number>();
  for (const m of raw.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const graph = ((data as { '@graph'?: unknown[] })['@graph'] ?? [data]) as Array<Record<string, unknown>>;
    for (const node of graph) {
      if (node['@type'] !== 'Product') continue;
      const offers = node.offers as { price?: string } | undefined;
      const url = String(node.url ?? node['@id'] ?? '');
      if (offers?.price !== undefined && url.includes('#')) offerByAnchor.set(url.split('#')[1], Number(offers.price));
    }
  }

  let topCard: { figure: string; stamp: string } | null = null;
  roster.forEach((pick, i) => {
    const expected = expectedFor(pick, now);
    for (const [surface, markup] of [
      ['card', cardBlocks[i] ?? ''],
      ['deep-dive', deepDiveBlocks[i] ?? ''],
    ] as Array<[string, string]>) {
      const problems = surfaceProblems(markup, expected);
      check(`${slug} ${surface}[${i}] ${pick.asin ?? pick.name}`, problems.length === 0, problems.join('; '));
      if (!expected) {
        if (pick.suppressionReason) darkSurfaces++;
        else undatedSurfaces++;
        continue;
      }
      stampedSurfaces++;
      bySource[expected.source]++;
      byBasis[expected.basis]++;
      byDay[expected.day] = (byDay[expected.day] || 0) + 1;
      if (!mutationSample && surface === 'card' && problems.length === 0) mutationSample = { markup, expected };
    }
    if (expected) {
      const anchorId = /<section\b[^>]*\sid="([^"]+)"/.exec(deepDiveBlocks[i] ?? '')?.[1];
      const offer = anchorId ? offerByAnchor.get(anchorId) : undefined;
      if (offer !== undefined) {
        offersCompared++;
        check(
          `${slug} JSON-LD offer for ${pick.asin} equals the card figure`,
          Math.abs(offer - (amount(expected.figure) ?? NaN)) < 0.005,
          `offer ${offer} vs card ${expected.figure}`,
        );
      }
    }
    if ((pick.rank === 1 || (i === 0 && !roster.some((p) => p.rank === 1))) && expected) {
      topCard = { figure: expected.figure, stamp: priceStampText(expected.basis, expected.day) };
    }
  });

  // --- Sticky bar: figure + stamp equal the top card's.
  const bar = blocks(html, 'div', /data-sticky-price-bar/)[0];
  if (bar) {
    stickyBars++;
    const fig = /<span\b[^>]*\sdata-price-figure=""[^>]*>([^<]*)<\/span>/.exec(bar)?.[1];
    const stamp = /<p\b[^>]*\sdata-price-stamp=""[^>]*>([^<]*)<\/p>/.exec(bar)?.[1];
    const tc = topCard as { figure: string; stamp: string } | null;
    check(`${slug} sticky bar renders over a top card with a dated figure`, !!tc);
    check(`${slug} sticky bar figure equals the top card's`, !!tc && fig === tc.figure, `${fig} vs ${tc?.figure}`);
    check(`${slug} sticky bar stamp equals the top card's`, !!tc && stamp === tc.stamp, `${stamp} vs ${tc?.stamp}`);
  }
}

// --- Deals page: any figure carries an adjacent stamp; no "From <price>".
const dealsFile = path.join(APP_DIR, 'deals.html');
if (fs.existsSync(dealsFile)) {
  const deals = stripScripts(fs.readFileSync(dealsFile, 'utf8'));
  for (const m of deals.matchAll(FIGURE_P)) {
    check(`deals: figure ${m[1]} has an adjacent stamp`, !!m[2] && STAMP_P.test(m[2]));
  }
  check('deals: no "From $" range wording on a single price', !/From \$\d/.test(deals));
}

// ---------------------------------------------------------------------------
// 1. Mutation — the checker must fail on each defect, on a REAL built card.
// ---------------------------------------------------------------------------
const sample = mutationSample as { markup: string; expected: Expected } | null;
check('mutation: a compliant built card was found to mutate', !!sample);
if (sample) {
  const { markup, expected } = sample;
  const noStamp = markup.replace(/<p\b[^>]*\sdata-price-stamp=""[^>]*>[^<]*<\/p>/, '');
  check('mutation: stamp REMOVED -> checker fails', surfaceProblems(noStamp, expected).length > 0);
  const otherDay = expected.day === '2026-01-01' ? '2026-01-02' : '2026-01-01';
  const wrongDate = markup
    .replace(`data-checked="${expected.day}"`, `data-checked="${otherDay}"`)
    .replace(formatCheckedDate(expected.day), formatCheckedDate(otherDay));
  check('mutation: stamp date CHANGED -> checker fails', surfaceProblems(wrongDate, expected).length > 0);
  const detached = markup.replace(/(<p\b[^>]*\sdata-price-figure=""[^>]*>[^<]*<\/p>)/, '$1<span>x</span>');
  check('mutation: stamp NOT ADJACENT -> checker fails', surfaceProblems(detached, expected).length > 0);
  if (expected.basis === 'current') {
    const falseList = markup.replace('>Current price · checked', '>List price · checked');
    check('mutation: "List price" on a non-list figure -> checker fails', surfaceProblems(falseList, expected).length > 0);
  }
  check('mutation: figure on a card with no dated source -> checker fails', surfaceProblems(markup, null).length > 0);
  check('mutation: the unmutated card passes (control)', surfaceProblems(markup, expected).length === 0);
}

// --- 6. Vacuity.
check(`stamped surfaces were read (${stampedSurfaces})`, stampedSurfaces > 1000, String(stampedSurfaces));
check(`dark surfaces were read (${darkSurfaces})`, darkSurfaces > 0, String(darkSurfaces));
check(`sticky bars were read (${stickyBars})`, stickyBars > 100, String(stickyBars));
check(`JSON-LD offers were compared (${offersCompared})`, offersCompared > 500, String(offersCompared));

const oldest = Object.keys(byDay).sort()[0];
console.log(
  `price-stamp-render (BUILT output, ${files.length} guides): ${stampedSurfaces} stamped surfaces ` +
    `(cards + deep dives; snapshot ${bySource.snapshot}, override ${bySource.override}; ` +
    `List ${byBasis.list}, Current ${byBasis.current}), ${stickyBars} sticky bars, ` +
    `${darkSurfaces} dark surfaces, ${undatedSurfaces} undated-withheld surfaces, ` +
    `${offersCompared} JSON-LD offers matched. Stamp dates: ${Object.entries(byDay)
      .sort()
      .map(([d, n]) => `${d}×${n}`)
      .join(', ')}${oldest ? ` (oldest ${oldest})` : ''}.`,
);
if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('price-stamp-render: PASS');
