#!/usr/bin/env npx tsx
/**
 * BUY PATH FLOOR — the in-repo canary. READS THE BUILT HTML, NOT THE SOURCE.
 *
 * Owner, 2026-09-09 ~8:40am PT (portfolio-wide, scope addendum 8:47am):
 *
 *   "We always want products on guides and review pages to have either a direct
 *    link or a direct search results link."
 *
 * Every product card on every guide, in EVERY state — LIVE, DARK, deferred,
 * no-ASIN — carries a cookie-setting link: the exact `/go/{ASIN}` → `/dp/` page
 * when an ASIN exists, a direct Amazon search-results link when none does. A
 * card with no link at all is a defect: the click is what sets the 24h
 * whole-cart cookie, so a card nobody can click earns nothing.
 *
 * WHY THIS FILE READS `.next/server/app/guides/*.html` (W4 finding 1 on PR #180).
 * The first cut of this gate iterated `getAllGuides()` — parsed frontmatter. The
 * verifier mutated `FeaturedPicksGrid.tsx` to emit `href=""` on every rank-1
 * card: 239 built guides shipped a link-less card, `npm run build` exited 0, and
 * this gate still printed "0 link-less card(s)". The defect lives in the RENDER
 * dimension and the assertion was written in the DATA dimension, so it could not
 * fail on its own subject (guard-vocabulary law). The buy path is a property of
 * the shipped markup, so the shipped markup is what is parsed here — same choice,
 * and the same `postbuild` slot, as scripts/test/product-schema-gate.test.ts.
 *
 * Six jobs:
 *   1. VOCABULARY MUTATION. Every withdrawn availability phrase (owner,
 *      2026-09-08 ~10:45pm PT) is matched by the guard's own regex — including
 *      the exact strings this branch deleted — and the copy that STAYS is not.
 *   2. NOTHING WENT MISSING. Each guide renders one card, one deep dive and (where
 *      the guide has a comparison table) one comparison cell PER ROSTER PICK. A
 *      surface that quietly loses a product would otherwise read as "no link-less
 *      cards" — the false-green this gate exists to close (§8rr).
 *   3. THE FLOOR. Every card, every comparison cell and every deep dive carries at
 *      least one `/go/{id}` href with a non-empty id, and no anchor inside them
 *      carries a dead href (`""`, `#`, `javascript:`).
 *   4. DESTINATION. Every id found in the markup resolves, through the SAME
 *      function the /go/ route uses, to a real Amazon destination: /dp/{ASIN} for
 *      an ASIN, /s?k= with a real term for a search phrase.
 *   5. TAG (P5). Every destination carries the guide's own resolved tracking tag,
 *      from the same resolver the route calls. A buy path that sets the wrong
 *      bucket's cookie is worse than none.
 *   6. VACUITY. The build exists, the corpus actually has cards, and both buy-path
 *      shapes are exercised — otherwise jobs 2-5 pass by reading nothing.
 *
 * Run: `npx tsx scripts/test/buy-path-floor.test.ts` (needs `next build` output).
 */
import fs from 'node:fs';
import path from 'node:path';
import { getGuideBySlug } from '../../src/lib/guides';
import { buildAmazonDest } from '../../src/lib/go-destination';
import { resolveTagForSlug } from '../../src/config/tracking-ids';

const BUILD_DIR = path.join(process.cwd(), '.next/server/app/guides');

/**
 * The availability vocabulary the owner withdrew from every card surface on
 * 2026-09-08 ~10:45pm PT. Mirrors AVAILABILITY_VOCABULARY in
 * snapshot-availability-gate.test.ts — one list, two layers.
 */
const AVAILABILITY_VOCABULARY =
  /\b(unavailable|out of stock|no featured offer|no buyable amazon offer|no identified amazon listing|no longer available|sold out|discontinued|back ?order(ed)?|in[- ]stock|check availability|current price and availability)\b/i;

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) return;
  failures++;
  console.error(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
}

// ---------------------------------------------------------------------------
// Built-markup parsing
// ---------------------------------------------------------------------------

/** Scripts carry the RSC flight payload; nothing a reader clicks lives in one. */
function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
}

/**
 * Every `<tag …>…</tag>` block whose opening tag matches `openRe`, sliced with a
 * DEPTH COUNTER rather than a lazy `.*?`. A lazy match closes on the first inner
 * `</section>` and silently truncates the surface — which is exactly how a gate
 * ends up certifying markup it never read.
 */
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

function hrefsIn(markup: string): string[] {
  return [...markup.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
}

/** The `{id}` of a `/go/{id}` href, decoded the way the route's param arrives. */
function goId(href: string): string | null {
  const m = /^\/go\/([^?"#]*)/.exec(href);
  if (!m || !m[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

const DEAD_HREF = (h: string) => h.trim() === '' || h.trim() === '#' || /^javascript:/i.test(h);

// ---------------------------------------------------------------------------
// 1. Vocabulary mutation — the guard must match the mechanism.
// ---------------------------------------------------------------------------
for (const phrase of [
  // the exact strings this branch deleted from the card surfaces
  'Check Amazon for current price and availability',
  'Currently unavailable on Amazon — checked 2026-09-08',
  'No longer available on Amazon — delisted',
  'No identified Amazon listing (checked 2026-09-08)',
  'No buyable Amazon offer — the one listing we found reads currently unavailable',
  // and the rest of the withdrawn vocabulary, with its kin
  'This item is out of stock',
  'No featured offer on this listing',
  'Sold out at Amazon',
  'This model is discontinued',
  'On backorder at Amazon',
  'The backordered variant ships in October',
  'Ships later than in-stock items',
  'check availability for smaller sizes before planning purchase',
]) {
  check(`withdrawn phrase must be caught: ${JSON.stringify(phrase)}`, AVAILABILITY_VOCABULARY.test(phrase));
}
// …and the copy that STAYS must not be. The owner kept the price note
// explicitly: it is about price, not availability.
for (const kept of [
  "Amazon's price may vary; check the current price.",
  'Check price',
  'List price · iRobot · verified 2026-09-07',
  'Last Amazon read 2026-09-08',
  'Ships on a delay — Amazon takes the order now and sends it later than a normal order. Checked 2026-09-08.',
  'May ship from a used-condition listing — verify condition before buying (checked 2026-09-08)',
]) {
  check(`kept copy must NOT be caught: ${JSON.stringify(kept)}`, !AVAILABILITY_VOCABULARY.test(kept));
}

// ---------------------------------------------------------------------------
// 2-6. The built corpus
// ---------------------------------------------------------------------------
if (!fs.existsSync(BUILD_DIR)) {
  console.error(`buy-path-floor: no build output at ${BUILD_DIR} — run \`next build\` first.`);
  process.exit(1);
}

const files = fs.readdirSync(BUILD_DIR).filter((f) => f.endsWith('.html')).sort();

let cards = 0;
let cells = 0;
let deepDives = 0;
let asinPaths = 0;
let searchPaths = 0;
const linkless = new Map<string, string[]>();
const searchRows: string[] = [];

for (const file of files) {
  const slug = file.replace(/\.html$/, '');
  const html = stripScripts(fs.readFileSync(path.join(BUILD_DIR, file), 'utf8'));
  const roster = getGuideBySlug(slug)?.picks ?? [];
  if (!roster.length) continue;

  const picksSection = blocks(html, 'section', /id="featured-picks"/)[0] ?? '';
  const cardBlocks = blocks(picksSection, 'article', /<article/i);
  const deepDiveBlocks = blocks(html, 'section', /class="[^"]*\bpick-card\b/);
  const ctaRow =
    [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)]
      .map((m) => m[0])
      .find((row) => /<th\b[^>]*scope="row"[^>]*>\s*Check price\s*<\/th>/i.test(row)) ?? '';
  const cellBlocks = ctaRow ? [...ctaRow.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/gi)].map((m) => m[0]) : [];

  cards += cardBlocks.length;
  deepDives += deepDiveBlocks.length;
  cells += cellBlocks.length;

  // --- job 2: nothing went missing. A surface that drops a product reads as
  // "no link-less cards" unless the count is checked against the roster.
  check(
    `${slug}: built page renders ${cardBlocks.length} pick card(s) for a roster of ${roster.length}`,
    cardBlocks.length === roster.length,
  );
  check(
    `${slug}: built page renders ${deepDiveBlocks.length} deep dive(s) for a roster of ${roster.length}`,
    deepDiveBlocks.length === roster.length,
  );
  if (ctaRow) {
    check(
      `${slug}: comparison "Check price" row renders ${cellBlocks.length} cell(s) for a roster of ${roster.length}`,
      cellBlocks.length === roster.length,
    );
  }

  // --- jobs 3-5: the floor, on every surface that carries a product.
  for (const [surface, list] of [
    ['card', cardBlocks],
    ['comparison-cell', cellBlocks],
    ['deep-dive', deepDiveBlocks],
  ] as Array<[string, string[]]>) {
    list.forEach((markup, i) => {
      const all = hrefsIn(markup);
      const ids = all.map(goId).filter((v): v is string => !!v);
      if (!ids.length) {
        const rows = linkless.get(slug) ?? [];
        rows.push(`${surface}[${i}]`);
        linkless.set(slug, rows);
        check(
          `${slug} ${surface}[${i}] renders with NO buy path at all — every card, in every ` +
            `state, carries a cookie-setting link (owner 2026-09-09 ~8:40am PT)`,
          false,
        );
        return;
      }
      for (const href of all) {
        check(
          `${slug} ${surface}[${i}] carries a dead href ${JSON.stringify(href)} — a link that ` +
            `resolves nowhere sets no cookie`,
          !DEAD_HREF(href),
        );
      }
      const tag = resolveTagForSlug(slug);
      for (const id of ids) {
        const dest = buildAmazonDest(id, undefined, tag);
        if (/^[A-Z0-9]{10}$/.test(id)) {
          if (surface === 'card') asinPaths++;
          check(
            `${slug} ${surface}[${i}] ASIN buy path must resolve to the exact product page`,
            dest.startsWith(`https://www.amazon.com/dp/${id}?`),
            dest,
          );
        } else {
          if (surface === 'card') {
            searchPaths++;
            searchRows.push(`${slug}  ${id}`);
          }
          const k = /\/s\?k=([^&]+)&/.exec(dest);
          check(
            `${slug} ${surface}[${i}] ASIN-less buy path must resolve to Amazon search results`,
            !!k,
            dest,
          );
          check(
            `${slug} ${surface}[${i}] search buy path must carry a real search term`,
            !!k && decodeURIComponent(k[1]).trim().length > 2,
            dest,
          );
        }
        check(
          `${slug} ${surface}[${i}] buy path must carry this guide's own tracking tag (P5)`,
          !!tag && dest.includes(`tag=${tag}`),
          dest,
        );
        check(
          `${slug} ${surface}[${i}] buy path must never leak the CLL position params to Amazon`,
          !/[?&](s|p)=/.test(dest),
          dest,
        );
      }
    });
  }
}

// --- job 6: vacuity. Every number above is only worth what it read.
check(`the build must contain guide pages`, files.length > 200, String(files.length));
check(`the corpus must actually contain cards`, cards > 1000, String(cards));
check(`deep dives must have been read`, deepDives > 1000, String(deepDives));
check(`comparison cells must have been read`, cells > 500, String(cells));
check(`at least one exact /dp/ buy path must be exercised`, asinPaths > 0, String(asinPaths));

const linklessCards = [...linkless.values()].reduce((n, r) => n + r.length, 0);
console.log(
  `buy-path-floor census (BUILT output, ${files.length} guide artifacts): ` +
    `${linklessCards} link-less surface(s) on ${linkless.size} guide(s); ` +
    `${cards} cards, ${cells} comparison cells, ${deepDives} deep dives read ` +
    `(cards: ${asinPaths} exact /dp/, ${searchPaths} /s?k= search).`,
);
if (searchRows.length) {
  console.log('  search-link cards (the bridge until §8qq rule 3 replaces the slot):');
  for (const r of searchRows) console.log(`    ${r}`);
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('buy-path-floor: PASS');
