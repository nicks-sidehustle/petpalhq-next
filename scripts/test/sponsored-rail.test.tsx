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
 *   8. Real corpus, through the REAL page wiring: every guide's GuidePage
 *      (src/app/guides/[slug]/page.tsx) is called, its <GuideSideRail> element
 *      must carry the guide's pick ASINs as `pickAsins`, and the
 *      SponsoredRailUnit it renders never shows one of the guide's own picks.
 *   9. The Associate disclosure and "Brand-sponsored" line render in the unit.
 *  10. Relevance (owner 2026-09-29, W4 #209): a dog-only guide never shows cat
 *      products and vice versa; bird products render only on the wild-bird
 *      feeding allowlist; chicken/coop/parrot/aviary/bath guides get nothing.
 *  11. MUTATION: a price injected into the component source, a price field in
 *      the data, the disclosure removed from the component, the pickAsins
 *      wiring removed from page.tsx, and the old category-based animal mapping
 *      must each make this gate fail.
 *
 * Run: npx tsx scripts/test/sponsored-rail.test.tsx (wired into validate:content).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SponsoredRailUnit } from '../../src/components/rail/SponsoredRailUnit';
import {
  guideAnimals,
  selectSponsoredRailProducts,
  SPONSORED_RAIL_PRODUCTS,
  WILD_BIRD_FEEDING_SLUGS,
  type SponsoredAnimal,
  type SponsoredRailProduct,
} from '../../src/lib/content/sponsored-rail';
import { getAllGuides, type Guide } from '../../src/lib/guides';
import GuidePage from '../../src/app/guides/[slug]/page';
import { GuideSideRail } from '../../src/components/rail/GuideSideRail';

const REPO_ROOT = path.join(import.meta.dirname, '..', '..');
const DATA_FILE = path.join(REPO_ROOT, 'data', 'sponsored-rail.json');
const COMPONENT = path.join(REPO_ROOT, 'src', 'components', 'rail', 'SponsoredRailUnit.tsx');
const PAGE = path.join(REPO_ROOT, 'src', 'app', 'guides', '[slug]', 'page.tsx');

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

const DISCLOSURE = 'As an Amazon Associate, PetPalHQ earns from qualifying purchases.';
/** The unit must carry the Associate disclosure and the brand-sponsored line. */
const hasDisclosure = (markup: string) =>
  visibleText(markup).includes(DISCLOSURE) && /Brand-sponsored Amazon campaign/.test(visibleText(markup));

const BY_ASIN = new Map(SPONSORED_RAIL_PRODUCTS.map((p) => [p.asin, p]));
const shownAsinsOf = (markup: string) => [...markup.matchAll(/href="\/go\/([A-Z0-9]{10})/g)].map((m) => m[1]);
const words = (slug: string) => slug.toLowerCase().split(/[^a-z]+/);
const NON_FEEDING_BIRD = /^(chicken|chickens|chicks|coop|coops|poultry|brooder|parrot|parakeet|budgie|cockatiel|aviary|aviaries)$/;

/**
 * Relevance violations for one guide, judged from its slug/species/category
 * independently of guideAnimals(): which animals the shown products belong to.
 */
function relevanceViolations(
  g: { slug: string; species?: readonly string[] | null; category?: string | null },
  shown: readonly SponsoredAnimal[],
): string[] {
  const out: string[] = [];
  const w = words(g.slug);
  const dogWord = w.some((x) => /^(dog|dogs|puppy|puppies)$/.test(x));
  const catWord = w.some((x) => /^(cat|cats|kitten|kittens)$/.test(x));
  const sp = new Set(g.species ?? []);
  const dogOnly = (dogWord && !catWord) || (!catWord && sp.has('dog') && !sp.has('cat'));
  const catOnly = (catWord && !dogWord) || (!dogWord && sp.has('cat') && !sp.has('dog'));
  const isBirdCat = (g.category ?? '').trim().toLowerCase() === 'birds';
  if (dogOnly && shown.includes('cat')) out.push('cat product on a dog-only guide');
  if (catOnly && shown.includes('dog')) out.push('dog product on a cat-only guide');
  if (shown.includes('bird') && !WILD_BIRD_FEEDING_SLUGS.has(g.slug)) out.push('bird product off the wild-bird feeding allowlist');
  if (isBirdCat && !WILD_BIRD_FEEDING_SLUGS.has(g.slug) && shown.length) out.push('non-feeding Birds guide shows a sponsored unit');
  if (w.some((x) => NON_FEEDING_BIRD.test(x)) && shown.length) out.push('chicken/coop/parrot/aviary guide shows a sponsored unit');
  if (!dogWord && !catWord && sp.size === 0 && shown.some((a) => a === 'dog' || a === 'cat' || a === 'multi')) {
    out.push('dog/cat product on a guide with no species and no dog/cat slug word');
  }
  if (shown.includes('multi') && !(dogWord || catWord || sp.has('dog') || sp.has('cat'))) out.push('multi product on a non dog/cat guide');
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

check('Associate disclosure + "Brand-sponsored" line render in the unit', hasDisclosure(dogMarkup));

for (const [label, slug, species, category] of [
  ['cat guide', 'test-cat-guide', ['cat'], 'Cats & Dogs'],
  ['wild-bird feeding guide', 'best-hummingbird-feeders-2026', undefined, 'Birds'],
] as const) {
  const m = render({ slug, species: species as string[] | undefined, category });
  const v = unitViolations(m, KNOWN);
  check(`${label}: renders clean`, m.length > 0 && v.length === 0 && hasDisclosure(m), v.join('; '));
}

console.log('sponsored-rail: relevance (owner 2026-09-29)');
const animalsShown = (markup: string) => shownAsinsOf(markup).map((a) => BY_ASIN.get(a)?.animal ?? null).filter(Boolean) as SponsoredAnimal[];
for (const slug of [
  'best-backyard-chicken-coops-2026',
  'best-large-parrot-flight-cages-2026',
  'best-large-parrot-toys-foraging-enrichment-2026',
  'best-chicken-feeders-waterers-2026',
  'best-large-outdoor-aviaries-2026',
  'best-bird-baths-solar-fountains-2026',
  'test-birds-guide',
]) {
  check(`${slug} (Birds, not wild-bird feeding) renders nothing`, render({ slug, category: 'Birds' }) === '');
}
check('guideAnimals: chicken coop guide -> []', guideAnimals('best-backyard-chicken-coops-2026', undefined, 'Birds').length === 0);
check('guideAnimals: hummingbird feeder guide -> [bird]', JSON.stringify(guideAnimals('best-hummingbird-feeders-2026', undefined, 'Birds')) === '["bird"]');
check('guideAnimals: no species, no dog/cat slug word -> []', guideAnimals('reducing-pet-allergies-dander-at-home-2026', undefined, 'Cats & Dogs').length === 0);
check('guideAnimals: no species, "dog" slug -> [dog]', JSON.stringify(guideAnimals('best-dog-car-booster-seats-2026', undefined, 'Cats & Dogs')) === '["dog"]');
check('guideAnimals: no species, "kitten" slug -> [cat]', JSON.stringify(guideAnimals('test-kitten-toys', null, 'Cats & Dogs')) === '["cat"]');
check('guideAnimals: species dog+cat, dog-only slug -> [dog]', JSON.stringify(guideAnimals('best-travel-setup-for-dog-owners-2026', ['dog', 'cat'], 'Cats & Dogs')) === '["dog"]');
check('guideAnimals: dog-and-cat slug keeps both', guideAnimals('how-to-get-rid-of-dog-cat-urine-smell-permanently-2026', undefined, 'Cats & Dogs').length === 2);
for (const [slug, species] of [
  ['best-dog-car-booster-seats-2026', undefined],
  ['best-travel-setup-for-dog-owners-2026', ['dog', 'cat']],
  ['how-to-trim-your-dogs-nails-at-home-paw-care-2026', ['dog', 'cat']],
  ['test-dog-only', ['dog']],
] as const) {
  // Every rotation of the pool: try many slug variants so the window covers it.
  const bad = Array.from({ length: 40 }, (_, i) => `${slug}${i ? `-v${i}` : ''}`)
    .map((s) => animalsShown(render({ slug: s, species: species as string[] | undefined, category: 'Cats & Dogs' })))
    .filter((a) => a.includes('cat'));
  check(`dog-only ${slug}: never a cat product (40 rotations)`, bad.length === 0, `rotations with cat=${bad.length}`);
}
for (const [slug, species] of [
  ['test-kitten-starter', undefined],
  ['test-cat-only', ['cat']],
  ['test-cat-litter-guide', ['dog', 'cat']],
] as const) {
  const bad = Array.from({ length: 40 }, (_, i) => `${slug}${i ? `-v${i}` : ''}`)
    .map((s) => animalsShown(render({ slug: s, species: species as string[] | undefined, category: 'Cats & Dogs' })))
    .filter((a) => a.includes('dog'));
  check(`cat-only ${slug}: never a dog product (40 rotations)`, bad.length === 0, `rotations with dog=${bad.length}`);
}

console.log('sponsored-rail: no-match renders nothing');
check('aquarium guide renders nothing', render({ slug: 'x', species: undefined, category: 'Aquarium' }) === '');
check('reptile guide renders nothing', render({ slug: 'x', species: [], category: 'Reptile' }) === '');
check('guideAnimals(Aquarium) is empty', guideAnimals('test-aquarium-guide', undefined, 'Aquarium').length === 0);

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

console.log('sponsored-rail: real corpus through the real page wiring');
type El = { type?: unknown; props?: Record<string, unknown> & { children?: unknown } };
/** First element of `type` in a returned (unrendered) element tree. */
function findElement(node: unknown, type: unknown): El | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findElement(n, type);
      if (f) return f;
    }
    return null;
  }
  const el = node as El;
  if (el.type === type) return el;
  return findElement(el.props?.children, type);
}
const pickAsinsOf = (g: Guide) =>
  [...(g.picks ?? []), ...(g.suppressedPicks ?? [])].map((p) => p.asin).filter((a): a is string => Boolean(a));
/**
 * Call a GuidePage implementation for one slug and render the sponsored unit
 * exactly as its <GuideSideRail> would: page -> rail props -> rail tree ->
 * SponsoredRailUnit element -> markup.
 */
async function railFromPage(page: typeof GuidePage, slug: string) {
  const tree = await page({ params: Promise.resolve({ slug }) });
  const rail = findElement(tree, GuideSideRail);
  if (!rail) return { rail: null, markup: '' };
  const railTree = GuideSideRail(rail.props as Parameters<typeof GuideSideRail>[0]);
  const unit = findElement(railTree, SponsoredRailUnit);
  return { rail, markup: unit ? renderToStaticMarkup(unit as ReactElement) : '' };
}

const perAnimalPages: Record<string, number> = {};
let pagesWithUnit = 0;
let overlap = 0;
let wiringMismatch = 0;
let relevanceBad = 0;
const birdPages: string[] = [];
const shownAsins = new Set<string>();
// getAllGuides() memoizes only under NODE_ENV=production (as in `next build`);
// without it every hub page re-parses the whole corpus (~14s each).
const prevNodeEnv = process.env.NODE_ENV;
(process.env as Record<string, string | undefined>).NODE_ENV = 'production';
const guides = getAllGuides();
const overlapCandidates: string[] = [];
for (const g of guides) {
  const pickAsins = pickAsinsOf(g);
  if (pickAsins.some((a) => KNOWN.has(a))) overlapCandidates.push(g.slug);
  const { rail, markup } = await railFromPage(GuidePage, g.slug);
  if (!rail) {
    check(`${g.slug}: page renders <GuideSideRail>`, false);
    continue;
  }
  const wired = rail.props?.pickAsins as readonly string[] | undefined;
  if (!wired || JSON.stringify([...wired].sort()) !== JSON.stringify([...pickAsins].sort())) {
    wiringMismatch++;
    if (wiringMismatch <= 3) console.error(`         ${g.slug}: <GuideSideRail pickAsins> = ${JSON.stringify(wired)}`);
  }
  if (!markup) continue;
  pagesWithUnit++;
  if (!hasDisclosure(markup)) check(`${g.slug}: disclosure renders`, false);
  const shown = shownAsinsOf(markup);
  shown.forEach((a) => shownAsins.add(a));
  if (shown.some((a) => pickAsins.includes(a))) overlap++;
  const animals = shown.map((a) => BY_ASIN.get(a)?.animal).filter(Boolean) as SponsoredAnimal[];
  for (const a of new Set(animals)) perAnimalPages[a] = (perAnimalPages[a] ?? 0) + 1;
  if (animals.includes('bird')) birdPages.push(g.slug);
  const rv = relevanceViolations(g, animals);
  if (rv.length) {
    relevanceBad++;
    check(`${g.slug} relevance`, false, rv.join('; '));
  }
  const v = unitViolations(markup, KNOWN);
  if (v.length) check(`${g.slug} renders clean`, false, v.join('; '));
}
check('page.tsx wires every guide\'s pick ASINs into <GuideSideRail pickAsins>', wiringMismatch === 0, `mismatched pages=${wiringMismatch}`);
check('no guide shows one of its own picks (real page)', overlap === 0, `overlap pages=${overlap}`);
check('no guide shows an unrelated animal\'s product (real page)', relevanceBad === 0, `pages=${relevanceBad}`);
check('bird products only on the wild-bird feeding allowlist', birdPages.every((s) => WILD_BIRD_FEEDING_SLUGS.has(s)), birdPages.join(','));
check('the wild-bird allowlist names real guides', [...WILD_BIRD_FEEDING_SLUGS].every((s) => guides.some((g) => g.slug === s)));
console.log(`  info guide pages with the unit: ${pagesWithUnit}/${guides.length}; pages by product animal: ${JSON.stringify(perAnimalPages)}; distinct products shown: ${shownAsins.size}/${KNOWN.size}`);
console.log(`  info pages showing bird products: ${birdPages.join(', ') || '(none)'}`);
console.log(`  info guides whose picks include a sponsored ASIN: ${overlapCandidates.join(', ') || '(none)'}`);

console.log('sponsored-rail: mutation');
{
  // Mutant copies of REAL source files load from a temp dir inside the repo so
  // "@/" aliases, bare "next/*" imports and the JSX transform all still resolve.
  const mutantDir = fs.mkdtempSync(path.join(REPO_ROOT, 'scripts', 'test', '.sponsored-rail-mutant-'));
  const loadMutant = async (name: string, src: string) => {
    const file = path.join(mutantDir, name);
    // The mutant dir sits outside tsconfig "include", so JSX compiles classic: React must be in scope.
    fs.writeFileSync(file, `import React from "react";\n${src}`);
    return import(pathToFileURL(file).href);
  };
  try {
    // M1: a price injected into the REAL component source must be caught.
    const src = fs.readFileSync(COMPONENT, 'utf8');
    const m1 = src.replace(/\{p\.name\}(\s*<\/p>)/, (_m, close) => `{p.name} <span>$19.99</span>${close}`);
    check('M1 mutant injected', m1 !== src);
    const mod1 = await loadMutant('M1.tsx', m1);
    const mk1 = renderToStaticMarkup(<mod1.SponsoredRailUnit slug="test-dog-guide" species={['dog']} />);
    check('M1 injected price in component -> gate fails', unitViolations(mk1, KNOWN).some((v) => v.startsWith('currency')));

    // M4: the Associate disclosure removed from the REAL component must be caught.
    const m4 = src.replace(/<p className="mt-2\.5[^>]*>[\s\S]*?<\/p>/, '');
    check('M4 mutant injected (disclosure removed)', m4 !== src && !m4.includes('As an Amazon Associate'));
    const mod4 = await loadMutant('M4.tsx', m4);
    const mk4 = renderToStaticMarkup(<mod4.SponsoredRailUnit slug="test-dog-guide" species={['dog']} />);
    check('M4 disclosure removed -> gate fails', mk4.length > 0 && !hasDisclosure(mk4));

    // M5: the pickAsins wiring removed from the REAL page.tsx must be caught, on
    // a guide whose own pick is a sponsored campaign product.
    const pageSrc = fs.readFileSync(PAGE, 'utf8');
    const m5 = pageSrc.replace(/\n\s*pickAsins=\{guidePickAsins\(guide\)\}\n/, '\n');
    check('M5 mutant injected (pickAsins dropped from page.tsx)', m5 !== pageSrc && !/pickAsins=/.test(m5));
    const mod5 = await loadMutant('M5-page.tsx', m5);
    let m5Caught = false;
    for (const slug of overlapCandidates) {
      const g = guides.find((x) => x.slug === slug)!;
      const { rail, markup } = await railFromPage(mod5.default, slug);
      const wired = rail?.props?.pickAsins as readonly string[] | undefined;
      const wiringOk = Boolean(wired) && JSON.stringify([...wired!].sort()) === JSON.stringify([...pickAsinsOf(g)].sort());
      if (!wiringOk || shownAsinsOf(markup).some((a) => pickAsinsOf(g).includes(a))) m5Caught = true;
    }
    check('M5 pickAsins dropped from page.tsx -> gate fails', overlapCandidates.length > 0 && m5Caught, `candidates=${overlapCandidates.length}`);
  } finally {
    fs.rmSync(mutantDir, { recursive: true, force: true });
  }
  // M6: the old category-based mapping (W4 #209 defect) must be caught by the
  // relevance check: Birds -> bird, and Cats & Dogs with no species -> dog+cat.
  const oldPool = (animals: SponsoredAnimal[], slug: string) =>
    selectSponsoredRailProducts({ slug, animals }).map((p) => p.animal as SponsoredAnimal);
  check(
    'M6 old mapping: chicken coop guide shows wild-bird feeders -> gate fails',
    relevanceViolations({ slug: 'best-backyard-chicken-coops-2026', category: 'Birds' }, oldPool(['bird'], 'best-backyard-chicken-coops-2026')).length > 0,
  );
  const oldDog = Array.from({ length: 40 }, (_, i) => `best-dog-car-booster-seats-2026-v${i}`).some(
    (slug) => relevanceViolations({ slug, category: 'Cats & Dogs' }, oldPool(['dog', 'cat'], slug)).length > 0,
  );
  check('M6 old mapping: dog-only guide shows cat products -> gate fails', oldDog);
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

(process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;

if (failures) {
  console.error(`\nsponsored-rail: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsponsored-rail: all checks passed');
