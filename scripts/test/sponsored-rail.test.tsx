#!/usr/bin/env npx tsx
/**
 * Sponsored rail gate (owner 2026-09-29): the SPCC unit in the guide side rail
 * (src/components/rail/SponsoredRailUnit.tsx). SPCC = Amazon Creator
 * Connections "Sponsored Products for Creators" (Accepted tab, type=spcc) — the
 * only campaign type in data/sponsored-rail.json; no Affiliate+ campaigns.
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
 *  11. SPCC labelling: data-sponsored-unit="spcc", click tag st=rail_spcc and
 *      CLL p=rail_spcc on every link, data source names SPCC / type=spcc.
 *  12. Click-likelihood order (owner 2026-09-29): topical relevance beats
 *      appeal beats EPC; a relevant low-EPC product outranks an irrelevant
 *      high-EPC one; every product has documented topics + appeal.
 *  13. One product per family (owner 2026-09-29): two relevant products of one
 *      family -> only one shows; every product has a family; no real page
 *      shows two products of the same family.
 *  14. MUTATION: a price injected into the component source, a price field in
 *      the data, the disclosure removed from the component, the pickAsins
 *      wiring removed from page.tsx, the old category-based animal mapping,
 *      an EPC-only sort in the real selection source, and the family skip
 *      removed from the real selection source must each make this gate fail.
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
  normalizeToken,
  selectSponsoredRailProducts,
  SPONSORED_RAIL_PLACEMENT,
  SPONSORED_RAIL_PRODUCTS,
  SPONSORED_TOPIC_TOKENS,
  SPONSORED_UNIT_MARKER,
  topicRelevance,
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
const SELECT_SRC = path.join(REPO_ROOT, 'src', 'lib', 'content', 'sponsored-rail.ts');

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
/** Price-ish keys anywhere in the data file (epc is a per-click rate, allowed). */
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
check('dog guide renders a unit marked data-sponsored-unit="spcc"', dogMarkup.includes('data-sponsored-unit="spcc"'));
check('visible "Sponsored" label', />\s*Sponsored\s*</.test(dogMarkup));
const dogV = unitViolations(dogMarkup, KNOWN);
check('no price/availability/rating/ranking; /go/ hrefs with rel sponsored; no schema', dogV.length === 0, dogV.join('; '));
const linkCount = (dogMarkup.match(/<a\b/g) ?? []).length;
check('1-3 products', linkCount >= 1 && linkCount <= 3, `links=${linkCount}`);

check('Associate disclosure + "Brand-sponsored" line render in the unit', hasDisclosure(dogMarkup));

console.log('sponsored-rail: SPCC labelling');
check('unit marker constant is "spcc"', SPONSORED_UNIT_MARKER === 'spcc');
check('placement (st= / p=) constant is "rail_spcc"', SPONSORED_RAIL_PLACEMENT === 'rail_spcc');
/** Click-tag violations: every link must carry st=rail_spcc and p=rail_spcc, and no old cc tag. */
function clickTagViolations(markup: string): string[] {
  const out: string[] = [];
  const hrefs = [...markup.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  if (hrefs.length === 0) out.push('no links');
  for (const h of hrefs) {
    const q = new URLSearchParams(h.split('?')[1] ?? '');
    if (q.get('st') !== 'rail_spcc') out.push(`st!=rail_spcc: ${h}`);
    if (q.get('p') !== 'rail_spcc') out.push(`p!=rail_spcc: ${h}`);
  }
  if (/rail_sponsored_cc|creator-connections/.test(markup)) out.push('old non-SPCC tag/marker');
  return out;
}
const ctv = clickTagViolations(dogMarkup);
check('every link carries st=rail_spcc and p=rail_spcc', ctv.length === 0, ctv.join('; '));

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
  { asin: 'B000000001', brand: 'X', animal: 'dog', epc: 1, name: 'Dog Thing', image: 'https://m.media-amazon.com/images/I/x.jpg', topics: [], appeal: 'low', family: 'x-dog-thing' },
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

console.log('sponsored-rail: click-likelihood order (owner 2026-09-29)');
const fx = (asin: string, topics: string[], appeal: 'high' | 'low', epc: number | null, family = asin): SponsoredRailProduct => ({
  asin, brand: 'X', family, animal: 'dog', topics, appeal, epc, name: `Fixture ${asin}`, image: 'https://m.media-amazon.com/images/I/x.jpg',
});
/**
 * Order violations of a selection function on fixture guides. Independent of
 * the implementation: expectations are written out by hand.
 */
function orderViolations(select: typeof selectSponsoredRailProducts): string[] {
  const out: string[] = [];
  const pick = (slug: string, pool: SponsoredRailProduct[], extra: Record<string, unknown> = {}) =>
    select({ slug, animals: ['dog'], ...extra }, pool, 3).map((p) => p.asin);
  // Relevant low-EPC dental product vs irrelevant high-EPC, high-appeal food.
  const dentalPool = [fx('B0000FOOD1', ['food'], 'high', 3.0), fx('B000DENTAL', ['dental'], 'low', 0.1), fx('B0000TOY01', ['toy'], 'high', 2.9)];
  const d = pick('best-dog-dental-chews-fixture', dentalPool);
  if (d[0] !== 'B000DENTAL') out.push(`relevant low-EPC dental not first on a dental guide: ${d.join(',')}`);
  // Car guide: relevance read from the title alone still beats EPC.
  const carPool = [fx('B0000FOOD1', ['food'], 'high', 3.0), fx('B00000CAR1', ['car'], 'low', 0.05)];
  const c = pick('fixture-guide-one', carPool, { title: 'Best Dog Car Hammocks for Road Trips' });
  if (c[0] !== 'B00000CAR1') out.push(`relevant car product not first on a car-titled guide: ${c.join(',')}`);
  // Slug beats title beats keywords.
  const tierPool = [fx('B00000KW01', ['toy'], 'high', 3), fx('B00000TT01', ['litter'], 'high', 2), fx('B00000SL01', ['calming'], 'low', 0.1)];
  const t = pick('cat-anxiety-fixture', tierPool, { title: 'Litter setups', keywords: ['toy ideas'] });
  if (t.join(',') !== 'B00000SL01,B00000TT01,B00000KW01') out.push(`slug>title>keywords tiers wrong: ${t.join(',')}`);
  // No relevance anywhere: high appeal beats a higher EPC.
  const appealPool = [fx('B0000NICHE', ['car'], 'low', 3.0), fx('B000EVERY1', ['food'], 'high', 0.2)];
  const a = pick('fixture-unrelated-topic', appealPool);
  if (a[0] !== 'B000EVERY1') out.push(`high-appeal product not ahead of a higher-EPC niche one: ${a.join(',')}`);
  // Same relevance + appeal: EPC decides.
  const epcPool = [fx('B00000LOW1', ['food'], 'high', 0.5), fx('B0000HIGH1', ['food'], 'high', 1.5)];
  const e = pick('fixture-unrelated-topic', epcPool);
  if (e[0] !== 'B0000HIGH1') out.push(`EPC tiebreak wrong: ${e.join(',')}`);
  return out;
}
/**
 * Family violations of a selection function (owner 2026-09-29: at most ONE
 * product per brand/product family). Fixture: two relevant litter products of
 * one family rank first and second; only the first may show, and the next
 * product fills the third slot.
 */
function familyViolations(select: typeof selectSponsoredRailProducts): string[] {
  const out: string[] = [];
  const pool = [
    fx('B000SCENT1', ['litter'], 'high', 1.6, 'fixture-scoopfree-litter'),
    fx('B000SCENT2', ['litter'], 'high', 1.4, 'fixture-scoopfree-litter'),
    fx('B000OTHER1', ['food'], 'high', 1.0),
    fx('B000OTHER2', ['food'], 'high', 0.5),
  ];
  const r = select({ slug: 'best-litter-fixture', animals: ['dog'] }, pool, 3).map((p) => p.asin);
  if (r.join(',') !== 'B000SCENT1,B000OTHER1,B000OTHER2') out.push(`same-family products not deduped: ${r.join(',')}`);
  const fams = select({ slug: 'best-litter-fixture', animals: ['dog'] }, pool, 3).map((p) => p.family);
  if (new Set(fams).size !== fams.length) out.push(`two products of one family: ${fams.join(',')}`);
  return out;
}
const fv = familyViolations(selectSponsoredRailProducts);
check('one product per family: two relevant same-family products -> only one shows', fv.length === 0, fv.join('; '));
{
  const noFamily = SPONSORED_RAIL_PRODUCTS.filter((p) => typeof p.family !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.family));
  check('every product has a kebab-case family', noFamily.length === 0, noFamily.map((p) => p.asin).join(','));
  const fam = (a: string) => BY_ASIN.get(a)?.family;
  check(
    'real data: PetSafe ScoopFree litter scents + tray share one family',
    fam('B01J5GE3MA') === fam('B01MTCODOT') && fam('B01MTCODOT') === fam('B000FEF10A'),
  );
  check('real data: Voyager harness colors share one family', fam('B09SGWL7B6') === fam('B08CCGYTDR'));
  check('real data: Devil Dog antler sizes share one family', fam('B01J6JUST8') === fam('B0BKC9QM79'));
  check('real data: PET STANDARD fountain-filter lines share one family', fam('B00LCIV210') === fam('B01N7N0UCU'));
}
const ov = orderViolations(selectSponsoredRailProducts);
check('relevance beats appeal beats EPC (relevant low-EPC outranks irrelevant high-EPC)', ov.length === 0, ov.join('; '));
{
  // Rotation only among exact ties: 4 tied products rotate across slugs, a strictly better one stays first.
  const tied = ['B0000TIE01', 'B0000TIE02', 'B0000TIE03', 'B0000TIE04'].map((x) => fx(x, ['food'], 'high', 1));
  const top = fx('B0000TOP01', ['food'], 'high', 2);
  const firsts = new Set<string>();
  const seconds = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const r = selectSponsoredRailProducts({ slug: `fixture-rot-${i}`, animals: ['dog'] }, [...tied, top]).map((p) => p.asin);
    firsts.add(r[0]);
    seconds.add(r[1]);
  }
  check('rotation never moves a higher-ranked product (EPC 2 always first)', firsts.size === 1 && firsts.has('B0000TOP01'), [...firsts].join(','));
  check('exact ties rotate across guides', seconds.size > 1, [...seconds].join(','));
}
check(
  'real data: dental guide shows the dental product first',
  selectSponsoredRailProducts({ slug: 'best-pet-dental-care-products-dogs-cats', animals: ['dog', 'cat'], title: 'Dental Care' })[0]?.topics.includes('dental') === true,
);
check(
  'real data: hummingbird guide shows the hummingbird feeder first',
  selectSponsoredRailProducts({ slug: 'best-hummingbird-feeders-2026', animals: ['bird'] })[0]?.topics.includes('hummingbird') === true,
);
check(
  'real data: litter guide shows litter products first',
  selectSponsoredRailProducts({ slug: 'best-standard-litter-boxes-2026', animals: ['cat'] })[0]?.topics.includes('litter') === true,
);
check(
  'topicRelevance: slug match 100, title 10, keyword 1, none 0',
  topicRelevance({ topics: ['dental'] }, { slug: 'x-dental-y' }) === 100 &&
    topicRelevance({ topics: ['dental'] }, { slug: 'x', title: 'Teeth' }) === 10 &&
    topicRelevance({ topics: ['dental'] }, { slug: 'x', keywords: ['plaque control'] }) === 1 &&
    topicRelevance({ topics: ['dental'] }, { slug: 'x', title: 'Beds' }) === 0,
);
{
  const unknownTopic = SPONSORED_RAIL_PRODUCTS.filter((p) => !p.topics?.length || p.topics.some((t) => !(t in SPONSORED_TOPIC_TOKENS)));
  check('every product has 1+ topics, all in SPONSORED_TOPIC_TOKENS', unknownTopic.length === 0, unknownTopic.map((p) => p.asin).join(','));
  const badAppeal = SPONSORED_RAIL_PRODUCTS.filter((p) => p.appeal !== 'high' && p.appeal !== 'low');
  check('every product has appeal high|low', badAppeal.length === 0, badAppeal.map((p) => p.asin).join(','));
  const unnorm = Object.values(SPONSORED_TOPIC_TOKENS).flat().filter((w) => normalizeToken(w) !== w || /[^a-z]/.test(w));
  check('topic words are single normalized tokens', unnorm.length === 0, unnorm.join(','));
  const generic = Object.values(SPONSORED_TOPIC_TOKENS).flat().filter((w) => ['dog', 'cat', 'kitten', 'pet', 'best', 'guide'].includes(w));
  check('no generic animal/site words in the topic mapping', generic.length === 0, generic.join(','));
}

console.log('sponsored-rail: data file');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
check(
  'data source names SPCC (Sponsored Products for Creators, type=spcc), not Affiliate+',
  /Sponsored Products for Creators \(SPCC\)/.test(data.source) && /type=spcc/.test(data.source) && data.campaignType === 'spcc' && /No Affiliate\+ campaigns/.test(data.source),
  String(data.source),
);
check('data file documents topics + appeal + family', typeof data.topicsNote === 'string' && typeof data.appealNote === 'string' && typeof data.familyNote === 'string');
check('epcNote says per-click rate, not a commission', /per-click rate/.test(data.epcNote) && !/commission metric/.test(data.epcNote), String(data.epcNote));
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
const familyDupPages: string[] = [];
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
  if (!markup.includes('data-sponsored-unit="spcc"') || clickTagViolations(markup).length) {
    check(`${g.slug}: SPCC marker + click tags`, false, clickTagViolations(markup).join('; '));
  }
  const shown = shownAsinsOf(markup);
  shown.forEach((a) => shownAsins.add(a));
  const shownFamilies = shown.map((a) => BY_ASIN.get(a)?.family ?? a);
  if (new Set(shownFamilies).size !== shownFamilies.length) familyDupPages.push(`${g.slug} [${shown.join(',')}]`);
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
check('no guide shows two products of the same family (real page)', familyDupPages.length === 0, familyDupPages.join('; '));
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

    // M7: the REAL selection source sorted by EPC only must fail the order checks.
    const selSrc = fs.readFileSync(SELECT_SRC, 'utf8');
    const m7 = selSrc
      .replace('b.key[0] - a.key[0] || b.key[1] - a.key[1] || ', '')
      .replace('"../../../data/sponsored-rail.json"', JSON.stringify(DATA_FILE));
    check('M7 mutant injected (EPC-only sort)', m7 !== selSrc && !m7.includes('b.key[0] - a.key[0]'));
    const mod7 = await loadMutant('M7-sponsored-rail.ts', m7);
    check('M7 EPC-only sort -> gate fails', orderViolations(mod7.selectSponsoredRailProducts).length > 0);

    // M9: the family skip removed from the REAL selection source must fail the family check.
    const m9 = selSrc
      .replace(/\n\s*if \(families\.has\(family\)\) continue; \/\/ family skip/, '')
      .replace('"../../../data/sponsored-rail.json"', JSON.stringify(DATA_FILE));
    check('M9 mutant injected (family skip removed)', m9 !== selSrc && !m9.includes('// family skip'));
    const mod9 = await loadMutant('M9-sponsored-rail.ts', m9);
    check('M9 family skip removed -> gate fails', familyViolations(mod9.selectSponsoredRailProducts).length > 0);

    // M8: the old non-SPCC placement tag must be caught.
    const m8 = src.replace('SPONSORED_RAIL_PLACEMENT}`', 'SPONSORED_RAIL_PLACEMENT}`.replace("rail_spcc", "rail_sponsored_cc")');
    check('M8 mutant injected (old cc click tag)', m8 !== src);
    const mod8 = await loadMutant('M8.tsx', m8);
    const mk8 = renderToStaticMarkup(<mod8.SponsoredRailUnit slug="test-dog-guide" species={['dog']} />);
    check('M8 non-SPCC click tag -> gate fails', clickTagViolations(mk8).length > 0);
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
