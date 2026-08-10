#!/usr/bin/env npx tsx
/**
 * Money-link attribution invariant — FAIL-CLOSED (attribution §6).
 *
 * Locks the revenue-critical half of PetPal's affiliate contract. Three
 * existing gates cover adjacent ground but none asserts this one:
 *   - scripts/test/sources-no-affiliate.test.tsx → citation surfaces must NOT
 *     be monetized (the inverse of this gate).
 *   - scripts/test/go-redirect.test.ts           → /go/ must not leak s/p to Amazon.
 *   - scripts/test/tracking-tag.test.ts          → bucket resolver rule order.
 * Nothing asserted that every MONEY link is actually attributed. This gate does.
 *
 * ── The two-surface contract ────────────────────────────────────────────────
 * PetPal Amazon URLs live in exactly two kinds of place, with OPPOSITE rules:
 *
 *   MONEY surfaces (must be attributed)
 *     picks[].affiliateUrl, picks[].affiliateLink, picks[].body, markdown body.
 *     These render as clickable buy links. They are rewritten to the internal
 *     `/go/{id}` redirect at render time (the global `marked` link renderer in
 *     src/lib/guides.ts, or AffiliateLink), and /go/[id]/route.ts attaches the
 *     tracking tag SERVER-SIDE. The inline `tag=` in the content layer is the
 *     belt to that suspenders — this gate requires it so the link stays
 *     attributed even if a surface ever renders the raw href.
 *
 *   CITATION surfaces (must NOT be attributed)
 *     picks[].authoritySources[].url — Amazon product listings cited as
 *     spec/price EVIDENCE, not buy links. Portfolio citability law (ports SHE
 *     PR #408): a monetized href inside a citation surface is a compliance +
 *     AI-citation-trust defect. PickAuthoritySources renders these as inert,
 *     un-linked text on purpose.
 *
 * ── Why the citation half is asserted here too ─────────────────────────────
 * A bulk grep of the content layer makes the 663 untagged Amazon URLs at
 * `picks[].authoritySources[].url` look like 663 lost commissions. They are
 * not: they are never rendered as links. Mass-"fixing" them by adding `tag=`
 * would earn nothing and would breach the citability law. This gate encodes
 * that fact so the false positive cannot be re-litigated into a regression.
 *
 * ── Fail-closed ────────────────────────────────────────────────────────────
 * CITATION_PATHS is a closed allowlist. Any Amazon URL at a frontmatter path
 * NOT on it is treated as a money link and MUST carry `tag=petpalhq08-20`, so
 * new content — and new frontmatter fields nobody thought to wire up — cannot
 * ship unattributed.
 *
 * Run: `npx tsx scripts/test/money-link-attribution.test.ts` (wired into
 * `validate:content`, so it runs on every `prebuild`).
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { siteConfig } from '../../src/config/site';
import { AMAZON_TAGS } from '../../src/config/tracking-ids';
import { amazonToGoHref } from '../../src/lib/affiliate-href';
import { buildAmazonDest } from '../../src/lib/go-destination';

const GUIDES_DIR = path.join(process.cwd(), 'src/content/guides');

/** The site's active Amazon tracking ID. Every money link must carry this. */
const EXPECTED_TAG = 'petpalhq08-20';

/**
 * Closed allowlist of CITATION frontmatter paths — Amazon URLs here are
 * evidence, render un-linked, and must stay untagged. Everything else that
 * holds an Amazon URL is a money link (fail-closed).
 */
const CITATION_PATHS = new Set(['picks.[].authoritySources.[].url']);

/** Any amazon.com URL. Stops at markdown/HTML delimiters so `](url)` is clean. */
const AMAZON_URL = /https?:\/\/(?:www\.)?amazon\.com\/[^\s"'`)<>\]]+/gi;
/** Amazon paths that are storefront/buy destinations (vs. help/CS pages). */
const AMAZON_COMMERCE_PATH = /amazon\.com\/(?:dp\/|gp\/product\/|s\?k=)/i;
const TAG_PARAM = /[?&]tag=([A-Za-z0-9_-]+)/;

let failures = 0;
function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  failures++;
}
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ✓ ${name}`);
  else fail(name);
}

console.log('money-link attribution gate:');

// ---------------------------------------------------------------------------
// 0. The expected tag must stay wired to site config + the resolver's base tag.
//    A rename in one place without the others is an attribution silent-failure.
// ---------------------------------------------------------------------------
check(`siteConfig.amazonTag is ${EXPECTED_TAG}`, siteConfig.amazonTag === EXPECTED_TAG);
check(`AMAZON_TAGS.base is ${EXPECTED_TAG}`, AMAZON_TAGS.base === EXPECTED_TAG);

// ---------------------------------------------------------------------------
// 1. Walk every guide's frontmatter, classify each Amazon URL by YAML path.
// ---------------------------------------------------------------------------
interface Found {
  file: string;
  yamlPath: string;
  url: string;
}
const moneyLinks: Found[] = [];
const citationLinks: Found[] = [];

function collect(node: unknown, trail: string[], file: string): void {
  if (node == null) return;
  if (typeof node === 'string') {
    const urls = node.match(AMAZON_URL);
    if (!urls) return;
    const yamlPath = trail.join('.');
    for (const url of urls) {
      const entry = { file, yamlPath, url };
      if (CITATION_PATHS.has(yamlPath)) citationLinks.push(entry);
      else moneyLinks.push(entry);
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v) => collect(v, trail.concat('[]'), file));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      collect(v, trail.concat(k), file);
    }
  }
}

const files = fs.existsSync(GUIDES_DIR)
  ? fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md')).sort()
  : [];

if (files.length === 0) fail('no guide files found — gate would vacuously pass');

for (const filename of files) {
  const raw = fs.readFileSync(path.join(GUIDES_DIR, filename), 'utf8');
  const { data, content } = matter(raw);
  collect(data, [], filename);
  // Markdown body prose is a money surface: its links become /go/ anchors via
  // the global `marked` link renderer in src/lib/guides.ts.
  for (const url of content.match(AMAZON_URL) ?? []) {
    moneyLinks.push({ file: filename, yamlPath: '(markdown body)', url });
  }
}

// ---------------------------------------------------------------------------
// 2. MONEY links: every commerce URL must carry tag=petpalhq08-20.
// ---------------------------------------------------------------------------
let moneyCommerce = 0;
let untaggedMoney = 0;
for (const { file, yamlPath, url } of moneyLinks) {
  // Non-commerce Amazon URLs (help pages, customer service) are never money
  // links and must stay untagged — tagging a help page is not a sale.
  if (!AMAZON_COMMERCE_PATH.test(url)) {
    if (TAG_PARAM.test(url)) {
      untaggedMoney++;
      fail(`${file} → ${yamlPath}: non-commerce Amazon URL carries a tracking tag → ${url}`);
    }
    continue;
  }
  moneyCommerce++;
  const tag = TAG_PARAM.exec(url)?.[1];
  if (!tag) {
    untaggedMoney++;
    fail(`${file} → ${yamlPath}: MONEY link missing tag=${EXPECTED_TAG} → ${url}`);
  } else if (tag !== EXPECTED_TAG) {
    untaggedMoney++;
    fail(`${file} → ${yamlPath}: MONEY link has wrong tag "${tag}" (expected ${EXPECTED_TAG}) → ${url}`);
  }
}
check(
  `all ${moneyCommerce} money-surface Amazon link(s) carry tag=${EXPECTED_TAG}`,
  moneyCommerce > 0 && untaggedMoney === 0,
);

// ---------------------------------------------------------------------------
// 3. CITATION links: must NOT carry a tracking tag (citability law).
// ---------------------------------------------------------------------------
let citationViolations = 0;
for (const { file, yamlPath, url } of citationLinks) {
  if (TAG_PARAM.test(url)) {
    citationViolations++;
    fail(
      `${file} → ${yamlPath}: CITATION source carries a tracking tag → ${url}\n` +
        '      Citation surfaces must stay neutral (portfolio citability law). These ' +
        'URLs render un-linked by PickAuthoritySources and earn nothing when tagged.',
    );
  }
}
check(
  `none of the ${citationLinks.length} citation source URL(s) are monetized`,
  citationViolations === 0,
);

// ---------------------------------------------------------------------------
// 4. Render-layer guarantee: every money link is routed through /go/, and /go/
//    resolves to a tagged amazon.com destination. That redirect is what
//    actually earns the commission, so assert the whole chain — not just the
//    stored string.
// ---------------------------------------------------------------------------
let unroutable = 0;
for (const { file, yamlPath, url } of moneyLinks) {
  if (!AMAZON_COMMERCE_PATH.test(url)) continue;
  const goHref = amazonToGoHref(url);
  if (goHref === null) {
    unroutable++;
    fail(
      `${file} → ${yamlPath}: money link is not routable to /go/ ` +
        `(render layer would emit it raw) → ${url}`,
    );
    continue;
  }
  const id = decodeURIComponent(goHref.replace(/^\/go\//, ''));
  const dest = buildAmazonDest(id, undefined, EXPECTED_TAG);
  if (!dest.includes(`tag=${EXPECTED_TAG}`)) {
    unroutable++;
    fail(`${file} → ${yamlPath}: /go/ resolution dropped the tag → ${dest}`);
  }
}
check(
  `all ${moneyCommerce} money link(s) route through /go/ to a tag=${EXPECTED_TAG} destination`,
  unroutable === 0,
);

// ---------------------------------------------------------------------------
console.log(
  `\n  scanned ${files.length} guide(s): ${moneyCommerce} money link(s), ` +
    `${citationLinks.length} citation source URL(s)`,
);

if (failures > 0) {
  console.error(`\nmoney-link attribution gate FAILED (${failures} violation(s)).`);
  console.error(
    'Every Amazon money link must carry tag=petpalhq08-20; citation sources must not.',
  );
  process.exit(1);
}
console.log('money-link attribution gate passed.');
