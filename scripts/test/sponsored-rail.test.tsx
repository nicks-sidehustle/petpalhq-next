#!/usr/bin/env npx tsx
/**
 * Sponsored rail gate (owner 2026-09-29): the Creator Connections unit in the
 * guide side rail (src/components/rail/SponsoredRailUnit.tsx).
 *
 * Renders the REAL component with react-dom/server and asserts:
 *   1. The unit shows a visible "Sponsored" label.
 *   2. No price ($ / price / list / deal / save), no availability words, no
 *      ratings/review counts, no "best"/ranking claims.
 *   3. Every href is /go/<ASIN> of a product in data/sponsored-rail.json, with
 *      rel containing sponsored + nofollow + noopener.
 *   4. No schema: no JSON-LD, itemprop or itemtype in the unit.
 *   5. Nothing renders when no animal matches (e.g. an aquarium guide).
 *   6. The guide's own pick ASINs are never shown; selection is deterministic.
 *   7. data/sponsored-rail.json carries no price fields and no Renewed title.
 *   8. Real corpus: no guide shows one of its own picks (and counts coverage).
 *   9. MUTATION: a price injected into the component source, or a price field
 *      injected into the data, must make this gate fail.
 *
 * Run: npx tsx scripts/test/sponsored-rail.test.tsx (wired into validate:content).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { SponsoredRailUnit } from '../../src/components/rail/SponsoredRailUnit';
import {
  guideAnimals,
  selectSponsoredRailProducts,
  SPONSORED_RAIL_PRODUCTS,
  type SponsoredRailProduct,
} from '../../src/lib/content/sponsored-rail';
import { getAllGuides } from '../../src/lib/guides';

const REPO_ROOT = path.join(import.meta.dirname, '..', '..');
const DATA_FILE = path.join(REPO_ROOT, 'data', 'sponsored-rail.json');
const COMPONENT = path.join(REPO_ROOT, 'src', 'components', 'rail', 'SponsoredRailUnit.tsx');

let failures = 0;
const check = (label: string, ok: boolean, extra = '') => {
  if (ok) console.log(`  ok   ${label}`);
  else {
    failures++;
    console.error(`  FAIL ${label}${extra ? `\n         ${extra}` : ''}`);
  }
};

/** Visible text of rendered markup (tags and attribute values stripped). */
const visibleText = (markup: string) =>
  markup.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ');

const FORBIDDEN_TEXT: Array<[string, RegExp]> = [
  ['currency', /\$|USD|\bcents?\b/i],
  ['price word', /\b(price[sd]?|pricing|list|msrp|deal|sale|save|savings|discount|% off)\b/i],
  ['availability', /\b(in stock|out of stock|low stock|unavailable|available|ships?|shipping|backorder|sold out)\b/i],
  ['rating/review', /\b(ratings?|reviews?|stars?|★)\b|\d(\.\d)?\s*\/\s*5/i],
  ['ranking claim', /\b(best|top[- ]rated|top pick|#\s?1|number one|winner|editor'?s choice)\b/i],
];

/** All violations of the no-price / link / schema contract in one rendered unit. */
function unitViolations(markup: string, knownAsins: Set<string>): string[] {
  const out: string[] = [];
  const text = visibleText(markup);
  for (const [label, re] of FORBIDDEN_TEXT) {
    const m = text.match(re);
    if (m) out.push(`${label}: "${m[0]}"`);
  }
  if (/application\/ld\+json|itemprop=|itemtype=|itemscope/i.test(markup)) out.push('schema markup');
  const anchors = [...markup.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  if (anchors.length === 0) out.push('no links');
  for (const a of anchors) {
    const href = a.match(/href="([^"]*)"/)?.[1] ?? '';
    const rel = a.match(/rel="([^"]*)"/)?.[1] ?? '';
    const asin = href.match(/^\/go\/([A-Z0-9]{10})(?:\?|$)/)?.[1];
    if (!asin) out.push(`href not /go/<ASIN>: ${href}`);
    else if (!knownAsins.has(asin)) out.push(`href ASIN not in data: ${asin}`);
    for (const r of ['sponsored', 'nofollow', 'noopener']) {
      if (!rel.split(/\s+/).includes(r)) out.push(`rel missing ${r}: ${href}`);
    }
  }
  return out;
}

const PRICE_KEY = /price|cost|msrp|offer|amount|currency|saving|discount/i;
/** Price-ish keys anywhere in the data file (epc is a commission metric, allowed). */
function dataViolations(data: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown, at: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (PRICE_KEY.test(k)) out.push(`price field ${at}.${k}`);
        walk(x, `${at}.${k}`);
      }
    }
  };
  walk(data, 'data');
  const products = (data as { products?: Array<Record<string, unknown>> }).products ?? [];
  for (const p of products) {
    for (const k of ['name', 'brand']) {
      if (typeof p[k] === 'string' && /\$\s?\d/.test(p[k] as string)) out.push(`figure in ${p.asin}.${k}`);
    }
    if (/renewed|refurbished/i.test(String(p.name))) out.push(`renewed ${p.asin}`);
    if (!/^[A-Z0-9]{10}$/.test(String(p.asin))) out.push(`bad asin ${p.asin}`);
    if (!/^https:\/\/m\.media-amazon\.com\//.test(String(p.image))) out.push(`image host ${p.asin}`);
  }
  return out;
}

const KNOWN = new Set(SPONSORED_RAIL_PRODUCTS.map((p) => p.asin));
const render = (props: Parameters<typeof SponsoredRailUnit>[0]) =>
  renderToStaticMarkup(<SponsoredRailUnit {...props} />);

console.log('sponsored-rail: unit render');
const dogMarkup = render({ slug: 'test-dog-guide', species: ['dog'], category: 'Cats & Dogs' });
check('dog guide renders a unit', dogMarkup.includes('data-sponsored-unit="creator-connections"'));
check('visible "Sponsored" label', />\s*Sponsored\s*</.test(dogMarkup));
const dogV = unitViolations(dogMarkup, KNOWN);
check('no price/availability/rating/ranking; /go/ hrefs with rel sponsored; no schema', dogV.length === 0, dogV.join('; '));
const linkCount = (dogMarkup.match(/<a\b/g) ?? []).length;
check('1-3 products', linkCount >= 1 && linkCount <= 3, `links=${linkCount}`);

for (const [label, species, category] of [
  ['cat guide', ['cat'], 'Cats & Dogs'],
  ['bird category', undefined, 'Birds'],
] as const) {
  const m = render({ slug: `test-${label}`, species: species as string[] | undefined, category });
  const v = unitViolations(m, KNOWN);
  check(`${label}: renders clean`, m.length > 0 && v.length === 0, v.join('; '));
}

console.log('sponsored-rail: no-match renders nothing');
check('aquarium guide renders nothing', render({ slug: 'x', species: undefined, category: 'Aquarium' }) === '');
check('reptile guide renders nothing', render({ slug: 'x', species: [], category: 'Reptile' }) === '');
check('guideAnimals(Aquarium) is empty', guideAnimals(undefined, 'Aquarium').length === 0);

console.log('sponsored-rail: selection');
const a1 = selectSponsoredRailProducts({ slug: 'stable', animals: ['dog'] }).map((p) => p.asin);
const a2 = selectSponsoredRailProducts({ slug: 'stable', animals: ['dog'] }).map((p) => p.asin);
check('deterministic for the same slug', JSON.stringify(a1) === JSON.stringify(a2));
const excluded = selectSponsoredRailProducts({ slug: 'stable', animals: ['dog'], excludeAsins: a1 }).map((p) => p.asin);
check('excludeAsins removes the guide picks', excluded.every((a) => !a1.includes(a)), excluded.join(','));
const onlyPick: SponsoredRailProduct[] = [
  { asin: 'B000000001', brand: 'X', animal: 'dog', epc: 1, name: 'Dog Thing', image: 'https://m.media-amazon.com/images/I/x.jpg' },
];
check(
  'renders nothing when the only match is a guide pick',
  render({ slug: 's', species: ['dog'], excludeAsins: ['B000000001'], products: onlyPick }) === '',
);
check(
  'multi fits dog and cat, not bird',
  selectSponsoredRailProducts({ slug: 's', animals: ['bird'] }, [{ ...onlyPick[0], animal: 'multi' }]).length === 0 &&
    selectSponsoredRailProducts({ slug: 's', animals: ['cat'] }, [{ ...onlyPick[0], animal: 'multi' }]).length === 1,
);

console.log('sponsored-rail: data file');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const dv = dataViolations(data);
check('data file has no price fields, no Renewed, valid ASIN/image', dv.length === 0, dv.join('; '));
check('data file records lookedUpAt', typeof data.lookedUpAt === 'string' && !Number.isNaN(Date.parse(data.lookedUpAt)));

console.log('sponsored-rail: real corpus');
const perAnimalPages: Record<string, number> = {};
let pagesWithUnit = 0;
let overlap = 0;
const shownAsins = new Set<string>();
for (const g of getAllGuides()) {
  const pickAsins = [...(g.picks ?? []), ...(g.suppressedPicks ?? [])]
    .map((p) => p.asin)
    .filter((a): a is string => Boolean(a));
  const markup = render({ slug: g.slug, species: g.species, category: g.category, excludeAsins: pickAsins });
  if (!markup) continue;
  pagesWithUnit++;
  for (const a of guideAnimals(g.species, g.category)) perAnimalPages[a] = (perAnimalPages[a] ?? 0) + 1;
  const shown = [...markup.matchAll(/href="\/go\/([A-Z0-9]{10})/g)].map((m) => m[1]);
  shown.forEach((a) => shownAsins.add(a));
  if (shown.some((a) => pickAsins.includes(a))) overlap++;
  const v = unitViolations(markup, KNOWN);
  if (v.length) check(`${g.slug} renders clean`, false, v.join('; '));
}
check('no guide shows one of its own picks', overlap === 0, `overlap pages=${overlap}`);
console.log(`  info guide pages with the unit: ${pagesWithUnit}; pages by animal: ${JSON.stringify(perAnimalPages)}; distinct products shown: ${shownAsins.size}/${KNOWN.size}`);

console.log('sponsored-rail: mutation');
{
  // M1: a price injected into the REAL component source must be caught.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sponsored-rail-mutant-')));
  try {
    const src = fs.readFileSync(COMPONENT, 'utf8');
    const mutated = src
      .replace(/from "@\/([^"]+)"/g, (_m, p) => `from "${path.join(REPO_ROOT, 'src', p)}"`)
      .replace(/\{p\.name\}(\s*<\/p>)/, (_m, close) => `{p.name} <span>$19.99</span>${close}`);
    const injected = mutated !== src.replace(/from "@\/([^"]+)"/g, (_m, p) => `from "${path.join(REPO_ROOT, 'src', p)}"`);
    check('M1 mutant injected', injected);
    const file = path.join(dir, 'SponsoredRailUnit.tsx');
    // Outside the repo tsconfig the JSX transform is classic, so React must be in scope.
    const reactPath = path.join(REPO_ROOT, 'node_modules', 'react', 'index.js');
    fs.writeFileSync(file, `import React from "${reactPath}";\n${mutated}`);
    const mod = await import(pathToFileURL(file).href);
    const m = renderToStaticMarkup(<mod.SponsoredRailUnit slug="test-dog-guide" species={['dog']} />);
    check(
      'M1 injected price in component -> gate fails',
      unitViolations(m, KNOWN).some((v) => v.startsWith('currency')),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // M2: a price field injected into the data must be caught.
  const mutData = structuredClone(data);
  mutData.products[0].price = '$19.99';
  check('M2 injected price field in data -> gate fails', dataViolations(mutData).length > 0);
  // M3: a rel without sponsored must be caught.
  check(
    'M3 rel without sponsored -> gate fails',
    unitViolations(dogMarkup.replace(/rel="[^"]*"/, 'rel="nofollow noopener"'), KNOWN).length > 0,
  );
}

if (failures) {
  console.error(`\nsponsored-rail: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsponsored-rail: all checks passed');
