#!/usr/bin/env npx tsx
/**
 * Product JSON-LD gate — reads the BUILT HTML, not the source (#143).
 *
 * GSC URL-inspection on /guides/best-automatic-litter-boxes-2026 returned
 * rich-results FAIL: 5 Product ERRORs ("no offers / review / aggregateRating")
 * plus Review snippets emitted twice per product. Both defects were invisible
 * to every source-level check, because both were properties of the assembled
 * `@graph` rather than of any one builder:
 *
 *   1. DUPLICATE PRODUCT ENTITY — the ItemList inlined a second, bare
 *      `item: { "@type": "Product", name, brand }` for every pick. Five picks
 *      meant ten Product nodes: five complete, five with no offers, no review
 *      and no rating. Those five bare ones were the five ERRORs.
 *   2. DUPLICATE REVIEW SNIPPET — each complete Product carried a Review AND
 *      an AggregateRating synthesised from the same single editorial score
 *      (`reviewCount: 1`), so the same judgment registered twice. Picks with
 *      ownerVoice quotes emitted more Review nodes still, one per Reddit quote.
 *
 * So this gate parses the shipped markup and asserts the invariants that
 * Google actually reads:
 *
 *   A. ONE Product entity per product — no duplicate @id, and no inline
 *      Product literal anywhere inside an ItemList.
 *   B. AT MOST ONE Review per Product, and it is the editorial one (author
 *      resolves to the site Person entity, rating on the declared 1-10 scale).
 *   C. `offers` present, snapshot-priced, for exactly the picks the price
 *      snapshot says are buyable — and absent for every other pick. Never a
 *      price this repo cannot show you the source of.
 *   D. NO `aggregateRating` anywhere. This repo holds one editorial score per
 *      pick, not a rating population; there is nothing honest to aggregate.
 *      If real aggregate data ever lands, change this assertion deliberately.
 *
 * Runs over every built guide, with the litter-box guide from the issue
 * asserted by name so the regression that filed #143 can never come back
 * silently.
 *
 * Run: `npx tsx scripts/test/product-schema-gate.test.ts`
 *      (wired into `postbuild` — it needs `next build` output to exist).
 */
import fs from 'node:fs';
import path from 'node:path';
import { getAllSlugs, getGuideBySlug, slugifyHeading, type GuidePick } from '../../src/lib/guides';
import { getSnapshotEntry, isResolvableAsin, isSnapshotUnbuyable } from '../../src/lib/price-cache';
import { SITE_URL } from '../../src/lib/schema';

/** The page whose GSC rich-results FAIL filed #143. */
const ISSUE_GUIDE = 'best-automatic-litter-boxes-2026';

const BUILD_DIR = path.join(process.cwd(), '.next/server/app/guides');
const PERSON_ID = `${SITE_URL}/#person-nick-miles`;
const LD_JSON = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

let failures = 0;
function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  failures++;
}

type Node = Record<string, unknown>;

/** Every JSON-LD node in a built page, flattened out of its @graph wrappers. */
function graphNodes(html: string): Node[] {
  const nodes: Node[] = [];
  LD_JSON.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LD_JSON.exec(html)) !== null) {
    const parsed = JSON.parse(m[1]) as Node;
    const graph = parsed['@graph'];
    if (Array.isArray(graph)) nodes.push(...(graph as Node[]));
    else nodes.push(parsed);
  }
  return nodes;
}

function asArray(value: unknown): Node[] {
  if (Array.isArray(value)) return value as Node[];
  if (value && typeof value === 'object') return [value as Node];
  return [];
}

/** What the price snapshot says this pick's Offer node should look like. */
function expectedOffer(pick: GuidePick): { price: string } | null {
  if (pick.available === false) return null;
  if (!isResolvableAsin(pick.asin)) return null;
  const entry = getSnapshotEntry(pick.asin);
  if (!entry?.price || isSnapshotUnbuyable(entry)) return null;
  const match = entry.price.match(/\$([\d,.]+)/);
  if (!match) return null;
  const price = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(price) ? { price: price.toFixed(2) } : null;
}

function checkGuide(slug: string, html: string) {
  const guide = getGuideBySlug(slug);
  if (!guide) return fail(`${slug}: built HTML exists but the guide no longer parses`);

  const nodes = graphNodes(html);
  const products = nodes.filter((n) => n['@type'] === 'Product');
  const url = `${SITE_URL}/guides/${slug}`;

  // ── A. One Product entity per product ───────────────────────────────────
  const ids = products.map((p) => String(p['@id'] ?? ''));
  for (const [i, id] of ids.entries()) {
    if (!id) fail(`${slug}: Product #${i + 1} ("${String(products[i].name)}") has no @id`);
  }
  const dupIds = ids.filter((id, i) => id && ids.indexOf(id) !== i);
  if (dupIds.length) fail(`${slug}: duplicate Product @id ${[...new Set(dupIds)].join(', ')}`);

  const names = products.map((p) => String(p.name ?? ''));
  const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupNames.length)
    fail(`${slug}: same product emitted as two Product entities: ${[...new Set(dupNames)].join(', ')}`);

  // The #143 regression itself: an ItemList must REFERENCE its products by
  // @id, never inline a second Product literal.
  for (const list of nodes.filter((n) => n['@type'] === 'ItemList')) {
    for (const el of asArray(list.itemListElement)) {
      const item = el.item as Node | undefined;
      if (!item) continue;
      if (item['@type'] !== undefined)
        fail(
          `${slug}: ItemList inlines a "${String(item['@type'])}" literal for "${String(el.name)}" — reference the Product by @id instead`,
        );
      else if (!ids.includes(String(item['@id'])))
        fail(`${slug}: ItemList item @id "${String(item['@id'])}" resolves to no Product in the graph`);
    }
  }

  for (const product of products) {
    const label = `${slug} / ${String(product.name)}`;

    // ── B. At most one Review, and it is the editorial one ────────────────
    const reviews = asArray(product.review);
    if (Array.isArray(product.review))
      fail(`${label}: review is an array (${reviews.length}) — exactly one Review per Product`);
    if (reviews.length > 1) fail(`${label}: ${reviews.length} Review nodes — expected at most 1`);
    for (const review of reviews) {
      if (review['@type'] !== 'Review') fail(`${label}: review node is "${String(review['@type'])}"`);
      const author = review.author as Node | undefined;
      if (author?.['@id'] !== PERSON_ID)
        fail(`${label}: Review author is not the site Person entity (${JSON.stringify(author)})`);
      const rating = review.reviewRating as Node | undefined;
      if (rating) {
        const value = Number(rating.ratingValue);
        const worst = Number(rating.worstRating);
        const best = Number(rating.bestRating);
        if (!(value >= worst && value <= best))
          fail(`${label}: reviewRating ${value} is outside its declared ${worst}-${best} scale`);
      }
    }

    // ── D. No aggregateRating ─────────────────────────────────────────────
    if (product.aggregateRating !== undefined)
      fail(`${label}: emits aggregateRating — this repo holds no aggregate rating data`);

    // Community quotes belong under citation as Quotation, never under review.
    for (const citation of asArray(product.citation)) {
      if (citation['@type'] === 'Review')
        fail(`${label}: a Review node is being smuggled in through citation`);
    }
  }

  // ── C. offers exactly where the snapshot backs one ──────────────────────
  for (const pick of guide.picks ?? []) {
    if (!pick.asin) continue;
    const id = `${url}#${slugifyHeading(pick.name)}`;
    const product = products.find((p) => p['@id'] === id);
    if (!product) {
      fail(`${slug}: pick "${pick.name}" emits no Product node`);
      continue;
    }
    const expected = expectedOffer(pick);
    const offers = product.offers as Node | undefined;
    if (!expected) {
      if (offers)
        fail(
          `${slug} / ${pick.name}: emits offers but the price snapshot backs none (${pick.asin}) — omit rather than guess`,
        );
      continue;
    }
    if (!offers) {
      fail(`${slug} / ${pick.name}: snapshot has a buyable price for ${pick.asin} but no offers emitted`);
      continue;
    }
    const label = `${slug} / ${pick.name}`;
    if (offers.price !== expected.price)
      fail(`${label}: offers.price "${String(offers.price)}" ≠ snapshot "${expected.price}"`);
    if (offers.priceCurrency !== 'USD') fail(`${label}: offers.priceCurrency is not USD`);
    if (!offers.url) fail(`${label}: offers has no url`);
    const availability = String(offers.availability ?? '');
    const wanted = pick.backorderDisclosure
      ? 'https://schema.org/BackOrder'
      : 'https://schema.org/InStock';
    if (availability !== wanted) fail(`${label}: availability "${availability}" — expected "${wanted}"`);
  }
}

// ── Run ────────────────────────────────────────────────────────────────────

if (!fs.existsSync(BUILD_DIR)) {
  console.error(
    `\n✗ No build output at ${BUILD_DIR}.\n` +
      `  This gate reads the shipped markup, so it needs a build first: \`npx next build\`.\n`,
  );
  process.exit(1);
}

const slugs = getAllSlugs();
const built = slugs.filter((slug) => fs.existsSync(path.join(BUILD_DIR, `${slug}.html`)));

console.log(`\nProduct JSON-LD gate — ${built.length}/${slugs.length} guides in build output`);

if (!built.includes(ISSUE_GUIDE)) {
  console.error(`\n✗ ${ISSUE_GUIDE}.html missing from the build — the #143 page must always be checked.\n`);
  process.exit(1);
}
if (built.length !== slugs.length) {
  const missing = slugs.filter((s) => !built.includes(s));
  fail(`${missing.length} guides have no built HTML: ${missing.slice(0, 5).join(', ')}`);
}

for (const slug of built) {
  checkGuide(slug, fs.readFileSync(path.join(BUILD_DIR, `${slug}.html`), 'utf-8'));
}

// The issue page, asserted by name and by shape.
const issueNodes = graphNodes(fs.readFileSync(path.join(BUILD_DIR, `${ISSUE_GUIDE}.html`), 'utf-8'));
const issueProducts = issueNodes.filter((n) => n['@type'] === 'Product');
const issuePicks = (getGuideBySlug(ISSUE_GUIDE)?.picks ?? []).filter((p) => p.asin);
if (issueProducts.length !== issuePicks.length)
  fail(`${ISSUE_GUIDE}: ${issueProducts.length} Product nodes for ${issuePicks.length} picks — expected 1:1`);
for (const product of issueProducts) {
  if (!product.offers) fail(`${ISSUE_GUIDE} / ${String(product.name)}: no offers (all five picks are buyable)`);
  if (asArray(product.review).length !== 1)
    fail(`${ISSUE_GUIDE} / ${String(product.name)}: expected exactly one Review`);
}

if (failures > 0) {
  console.error(`\n✗ Product JSON-LD gate: ${failures} failure(s)\n`);
  process.exit(1);
}
console.log(
  `  ✓ ${built.length} guides — one Product per pick, ≤1 Review each, snapshot-backed offers, no aggregateRating\n`,
);
