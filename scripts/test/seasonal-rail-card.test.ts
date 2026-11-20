#!/usr/bin/env npx tsx
/**
 * SEASONAL RAIL CARD GATE — reads the BUILT HTML (postbuild), like
 * buy-path-floor.test.ts and product-schema-gate.test.ts.
 *
 * Owner 2026-11-19 (Black Friday week card): NO price figures and no "deal" /
 * "% off" / "save" / "cheapest" claims at all. CLAUDE.md §3 (no availability
 * language, Amazon-only /go/ links), §4 (no figure without a live read; no
 * price positioning; no dark or refurbished pick) and §5 (no originated facts).
 *
 * For every `<aside data-seasonal-promo="rail">` in .next/server/app/guides/*.html:
 *   1. No "$" anywhere in the card markup, and its visible text carries no price
 *      figure, no price-positioning word and no availability word
 *      (seasonal-rail-eligibility.ts — the same lists the generator filters on).
 *   2. Exactly one /go/<ASIN> href, carrying st=rail_v2_<season key>, s=<page>
 *      and p=rail_v2. That ASIN must be a CURRENT pick of the source guide that
 *      isEligibleSeasonalPick() accepts (not dark / gone / not-found /
 *      dead-asins / backorder / refurbished / replacement-pending), read from
 *      today's data files — not from the generated map.
 *   3. The only other href is the backlink /guides/<source guide>[#anchor], and
 *      the source guide exists. Any other href fails.
 *   4. The active season's label is on the card; no card on a holdout page
 *      (isRailHoldout, checked independently); the backlink's #anchor exists
 *      in the source guide's built HTML.
 *   5. The set of guides carrying a card equals the set getRailPromo() resolves
 *      for (so holdout pages carry none, and a dropped card is noticed). When
 *      the kill-switch is off or no season window is open, that set is empty
 *      and the gate checks for zero cards.
 * Job 0 runs first and always: planted bad cards (price, banned word, dark
 * ASIN, external href) must each FAIL naming the planted guide, and a known
 * good card must pass — so the checks cannot go vacuous while the card is off.
 *
 * Run: `npx tsx scripts/test/seasonal-rail-card.test.ts` (needs `next build`).
 */
import fs from "node:fs";
import path from "node:path";
import { getActiveRailSeason, BLACK_FRIDAY_WEEK_2026 } from "../../src/config/seasonal-rail";
import { getAllSlugs, getGuideBySlug, slugifyHeading } from "../../src/lib/guides";
import { getRailPromo } from "../../src/lib/content/rail-promo";
import { isRailHoldout } from "../../src/lib/content/rail-holdout";
import {
  cardTextViolations,
  isEligibleSeasonalPick,
} from "../../src/lib/content/seasonal-rail-eligibility";

const BUILD_DIR = path.join(process.cwd(), ".next/server/app/guides");

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Rendered rail cards in a page's HTML (scripts — the RSC payload — stripped). */
export function extractCards(html: string): string[] {
  const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  return body.match(/<aside\b[^>]*data-seasonal-promo="rail"[^>]*>[\s\S]*?<\/aside>/gi) ?? [];
}

/** Every violation in one rendered card on page `slug`, each prefixed with the slug. */
export function checkCard(slug: string, card: string, seasonKey: string, label: string): string[] {
  const v: string[] = [];
  const say = (m: string) => v.push(`${slug}: ${m}`);

  // 1. Price / positioning / availability.
  if (card.includes("$")) say(`"$" in card markup`);
  const text = decode(card.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  for (const x of cardTextViolations(text)) say(`card text has ${x}`);

  // 4. Label.
  if (!text.includes(label)) say(`season label "${label}" missing`);

  // 2/3. Hrefs.
  const hrefs = [...card.matchAll(/\bhref="([^"]*)"/g)].map((m) => decode(m[1]));
  const go = hrefs.filter((h) => h.startsWith("/go/"));
  const back = hrefs.filter((h) => /^\/guides\/[a-z0-9-]+(#[a-z0-9-]+)?$/.test(h));
  const other = hrefs.filter((h) => !go.includes(h) && !back.includes(h));
  for (const h of other) say(`disallowed href "${h}" (only /go/<ASIN> and the /guides/ backlink)`);
  if (go.length !== 1) say(`expected exactly 1 /go/ href, found ${go.length}`);
  if (back.length !== 1) say(`expected exactly 1 /guides/ backlink, found ${back.length}`);
  if (go.length !== 1 || back.length !== 1) return v;

  const fromSlug = back[0].slice("/guides/".length).split("#")[0];
  const fromGuide = getGuideBySlug(fromSlug);
  if (!fromGuide) {
    say(`backlink source guide "${fromSlug}" does not exist`);
    return v;
  }
  const u = new URL(go[0], "https://example.invalid");
  const asin = decodeURIComponent(u.pathname.slice("/go/".length));
  if (!/^[A-Z0-9]{10}$/.test(asin)) say(`/go/ id "${asin}" is not an ASIN`);
  if (u.searchParams.get("st") !== `rail_v2_${seasonKey}`) say(`st="${u.searchParams.get("st")}", expected rail_v2_${seasonKey}`);
  if (u.searchParams.get("s") !== slug) say(`s="${u.searchParams.get("s")}", expected ${slug}`);
  if (u.searchParams.get("p") !== "rail_v2") say(`p="${u.searchParams.get("p")}", expected rail_v2`);
  const pick = fromGuide.picks?.find((p) => p.asin === asin);
  if (!pick) say(`ASIN ${asin} is not a current pick of ${fromSlug}`);
  else if (!isEligibleSeasonalPick(pick))
    say(`ASIN ${asin} is not eligible in ${fromSlug} (dark/gone/guarded/backorder/refurbished/replacement-pending)`);
  else {
    const anchor = back[0].split("#")[1];
    if (anchor && anchor !== slugifyHeading(pick.name)) say(`backlink anchor "#${anchor}" is not ${asin}'s deep dive`);
  }
  return v;
}

let failures = 0;
function fail(msg: string) {
  failures++;
  console.error(`  FAIL: ${msg}`);
}

// ---------------------------------------------------------------------------
// Job 0 — planted cards (always runs).
// ---------------------------------------------------------------------------
{
  const S = BLACK_FRIDAY_WEEK_2026;
  // A known-good fixture built from a real eligible pick.
  let goodSlug = "";
  let goodAsin = "";
  let goodAnchor = "";
  for (const slug of getAllSlugs()) {
    const g = getGuideBySlug(slug);
    const p = g?.picks?.find((x) => isEligibleSeasonalPick(x));
    if (p && cardTextViolations(g!.title).length === 0) {
      goodSlug = slug;
      goodAsin = p.asin!;
      goodAnchor = slugifyHeading(p.name);
      break;
    }
  }
  if (!goodSlug) fail("job 0: no eligible pick anywhere in the corpus (vacuous)");
  // Any dark pick in the corpus, on its own guide.
  let darkSlug = "";
  let darkAsin = "";
  for (const slug of getAllSlugs()) {
    const p = getGuideBySlug(slug)?.picks?.find((x) => x.asin && x.suppressionReason);
    if (p) {
      darkSlug = slug;
      darkAsin = p.asin!;
      break;
    }
  }
  if (!darkSlug) fail("job 0: no dark pick in the corpus to plant (dark-ASIN probe vacuous)");

  const card = (o: { slug: string; asin: string; from: string; note?: string; extra?: string }) =>
    `<aside data-seasonal-promo="rail" aria-label="Recommended pick"><p>${S.label}</p>` +
    `<p>Some Product</p><p>${o.note ?? "A plain sentence from the verdict."}</p>` +
    `<a href="/guides/${o.from}">From our guide</a>` +
    `<a href="/go/${o.asin}?st=rail_v2_${S.key}&amp;s=${o.slug}&amp;p=rail_v2">${S.cta}</a>${o.extra ?? ""}` +
    `<p>Affiliate link — we may earn a commission.</p></aside>`;

  const good = checkCard("PLANT-good", card({ slug: "PLANT-good", asin: goodAsin, from: `${goodSlug}#${goodAnchor}` }), S.key, S.label);
  if (good.length) fail(`job 0: known-good card failed: ${good.join("; ")}`);

  const plants: Array<[string, string]> = [
    ["PLANT-price", card({ slug: "PLANT-price", asin: goodAsin, from: goodSlug, note: "Now $49.99 this week." })],
    ["PLANT-usd", card({ slug: "PLANT-usd", asin: goodAsin, from: goodSlug, note: "Around 40 dollars this week." })],
    ["PLANT-deal", card({ slug: "PLANT-deal", asin: goodAsin, from: goodSlug, note: "The best deal of the week." })],
    ["PLANT-off", card({ slug: "PLANT-off", asin: goodAsin, from: goodSlug, note: "Now 30% off." })],
    ["PLANT-stock", card({ slug: "PLANT-stock", asin: goodAsin, from: goodSlug, note: "Back in stock today." })],
    ["PLANT-dark", card({ slug: "PLANT-dark", asin: darkAsin, from: darkSlug })],
    ["PLANT-notapick", card({ slug: "PLANT-notapick", asin: "B000000000", from: goodSlug })],
    ["PLANT-href", card({ slug: "PLANT-href", asin: goodAsin, from: goodSlug, extra: `<a href="https://www.chewy.com/x">Chewy</a>` })],
  ];
  for (const [slug, html] of plants) {
    const v = checkCard(slug, html, S.key, S.label);
    if (!v.length) fail(`job 0: planted bad card ${slug} PASSED the gate`);
    else if (!v.every((m) => m.startsWith(`${slug}:`))) fail(`job 0: ${slug} failure does not name the card: ${v[0]}`);
  }
  console.log(`seasonal-rail job 0: ${plants.length} planted bad cards each fail naming their guide; good card passes`);
}

// ---------------------------------------------------------------------------
// Jobs 1-5 — the BUILT output.
// ---------------------------------------------------------------------------
if (!fs.existsSync(BUILD_DIR)) {
  fail(`no build output at ${BUILD_DIR} — run \`next build\` first`);
} else {
  const files = fs.readdirSync(BUILD_DIR).filter((f) => f.endsWith(".html"));
  if (!files.length) fail("no built guide HTML (vacuous)");
  // Evaluate the window at BUILD time (the artifacts' mtime), not test time, so
  // a build that straddles a window edge is judged against what it rendered.
  const builtAt = new Date(Math.max(...files.map((f) => fs.statSync(path.join(BUILD_DIR, f)).mtimeMs)));
  const season = getActiveRailSeason(builtAt);
  const expected = new Set(getAllSlugs().filter((s) => getRailPromo(s, builtAt)));
  const actual = new Set<string>();
  let cards = 0;
  for (const f of files) {
    const slug = f.replace(/\.html$/, "");
    const html = fs.readFileSync(path.join(BUILD_DIR, f), "utf8");
    const found = extractCards(html);
    if (!found.length) continue;
    actual.add(slug);
    // Holdout, checked independently of the resolver.
    if (isRailHoldout(slug)) fail(`${slug}: seasonal rail card rendered on a HOLDOUT page`);
    // The backlink anchor must exist in the source page's built HTML.
    for (const c of found) {
      const back = c.match(/href="\/guides\/([a-z0-9-]+)#([a-z0-9-]+)"/);
      if (!back) continue;
      const srcFile = path.join(BUILD_DIR, `${back[1]}.html`);
      const srcHtml = back[1] === slug ? html : fs.existsSync(srcFile) ? fs.readFileSync(srcFile, "utf8") : "";
      if (!srcHtml.includes(`id="${back[2]}"`)) fail(`${slug}: backlink anchor #${back[2]} not found in built /guides/${back[1]}`);
    }
    if (found.length > 1) fail(`${slug}: ${found.length} seasonal rail cards (expected 1)`);
    for (const c of found) {
      cards++;
      if (!season) {
        fail(`${slug}: seasonal rail card rendered with no season window open`);
        continue;
      }
      for (const m of checkCard(slug, c, season.key, season.label)) fail(m);
    }
  }
  for (const s of expected) if (!actual.has(s)) fail(`${s}: expected a seasonal rail card, none in built HTML`);
  for (const s of actual) if (!expected.has(s)) fail(`${s}: seasonal rail card rendered but getRailPromo() resolves none (holdout / unmapped / ineligible)`);
  const asins = new Set(
    [...expected].map((s) => getRailPromo(s, builtAt)!.asin),
  );
  console.log(
    `seasonal-rail census (BUILT, ${files.length} guides): season=${season ? season.label : "none"}, ` +
      `kill-switch=${process.env.NEXT_PUBLIC_SEASONAL_PROMO?.trim() === "1" ? "on" : "off"}, ` +
      `${cards} card(s) on ${actual.size} guide(s), expected ${expected.size}, ${asins.size} distinct ASIN(s)`,
  );
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("seasonal-rail-card: PASS");
