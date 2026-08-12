/**
 * Alias scoping — greedy auto-linker regression check (2026-08-12).
 *
 * THE DEFECT. The site-wide product map keys every pick by BOTH its full
 * product name and its per-guide `aliases:` shorthand, and the injector applies
 * that map as one corpus-wide regex over every guide's prose. Full names mean
 * the same product everywhere; aliases do not. "the VEVOR" is declared on a
 * bike trailer in best-dog-bike-trailers-2026, so every time
 * best-dog-bathing-tubs-wash-stations-2026 called its own wash station "the
 * VEVOR" the reader got a live CTA to a bike trailer. 827 anchors site-wide
 * pointed a product mention at a DIFFERENT guide's product.
 *
 * THE GUARD (src/lib/guides.ts parseGuide). An `'alias'` entry from the
 * site-wide map is usable in a guide only when that guide's own roster contains
 * the alias's ASIN. `'name'` entries stay site-wide — cross-guide linking by
 * full product name is the intended feature.
 *
 * Four jobs. Jobs 2-4 exist because the obvious one-line version of this fix —
 * dropping aliases from the site-wide map entirely — passes job 1 while
 * silently deleting 495 CORRECT links, and because a guard that matches nothing
 * also passes job 1.
 *
 *  1. UNDER-scoping: no injected /go/ anchor in any guide points at an ASIN
 *     off that guide's roster unless the anchor text is a full product `name`.
 *  2. OVER-scoping: an alias whose product IS on the reading guide's roster
 *     still links, even when the alias was declared in a different guide's
 *     frontmatter. Pinned on "Tractive" in at-home-pet-health-monitoring-tools,
 *     whose alias lives in best-dog-gps-trackers-2026.
 *  3. The proven case, pinned by name: best-dog-bathing-tubs-wash-stations-2026
 *     never links to the bike trailer B0CWR5H5JT.
 *  4. VACUITY: the corpus still actually contains cross-guide alias collisions
 *     and injected /go/ anchors. If a future change empties the product map or
 *     stops injecting, jobs 1 and 3 pass trivially.
 *
 * Run: npx tsx scripts/test/alias-scoping.test.ts
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAllGuides, type Guide, type GuidePick } from '../../src/lib/guides';
import { getSiteWideProductEntries } from '../../src/lib/guide-links';

let failures = 0;
function check(label: string, ok: boolean) {
  if (!ok) {
    failures++;
    console.error(`  FAIL: ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Frontmatter facts: each guide's own ASIN roster, and which guides declare
// which alias. Read raw rather than through parseGuide so the reference is
// independent of the code under test.
// ---------------------------------------------------------------------------
const guidesDir = path.join(process.cwd(), 'src/content/guides');
const rosterByGuide = new Map<string, Set<string>>();
const aliasDeclaredBy = new Map<string, Set<string>>(); // lowercased alias -> declaring guides
const aliasAsin = new Map<string, string>(); // lowercased alias -> ASIN
// Anchor texts the EDITOR wrote by hand as `[text](url)` in a guide's source.
// Those links are authored, not injected — an editor naming another guide's
// product on purpose is not a hijack, and this guard has no say over them.
const authoredAnchorText = new Map<string, Set<string>>();

for (const file of fs.readdirSync(guidesDir).filter((f) => f.endsWith('.md')).sort()) {
  const slug = file.replace(/\.md$/, '');
  const source = fs.readFileSync(path.join(guidesDir, file), 'utf8');
  const { data } = matter(source);
  const authored = new Set<string>();
  for (const m of source.matchAll(/\[([^\]\n]+)\]\(\s*(?:https?:|\/)[^)\s]*\s*\)/g)) {
    authored.add(m[1].replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase());
  }
  authoredAnchorText.set(slug, authored);
  const roster = new Set<string>();
  for (const pick of (Array.isArray(data.picks) ? data.picks : []) as Array<Record<string, unknown>>) {
    if (!pick?.asin) continue;
    const asin = String(pick.asin);
    roster.add(asin);
    for (const alias of Array.isArray(pick.aliases) ? (pick.aliases as unknown[]) : []) {
      if (typeof alias !== 'string' || !alias) continue;
      const key = alias.toLowerCase();
      if (!aliasDeclaredBy.has(key)) aliasDeclaredBy.set(key, new Set());
      aliasDeclaredBy.get(key)!.add(slug);
      if (!aliasAsin.has(key)) aliasAsin.set(key, asin);
    }
  }
  rosterByGuide.set(slug, roster);
}

// Full product names, from the map under test. These are the keys that ARE
// allowed to link across guides.
const nameKeys = new Set<string>();
for (const [key, entry] of getSiteWideProductEntries()) {
  if (entry.kind === 'name') nameKeys.add(key.toLowerCase());
}

// ---------------------------------------------------------------------------
// Every generated anchor, across every surface parseGuide injects into.
// ---------------------------------------------------------------------------
interface Anchor { guide: string; surface: string; asin: string; text: string }

// Pair each <a> OPEN TAG with the text that immediately follows it, stopping at
// the next tag boundary rather than at `</a>`. injectAffiliateLinks has no
// bracket guard, so it can inject a link inside a hand-authored `[text](url)`
// and emit a nested <a> (a separate defect, tracked apart from scoping). A
// naive `<a…>(.*?)</a>` reader mis-attributes the INNER anchor's text to the
// OUTER anchor's href and invents hijacks that are not there. Reading open tags
// individually attributes each href to the text it actually wraps.
const anchorOpenRe = /<a\b[^>]*?href="([^"]*)"[^>]*>/gi;
const unescapeHtml = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'");

const anchors: Anchor[] = [];
function collect(guide: string, surface: string, html: string | undefined) {
  if (!html) return;
  anchorOpenRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = anchorOpenRe.exec(html))) {
    if (!m[1].startsWith('/go/')) continue;
    let asin = m[1].slice(4).split(/[?#]/)[0];
    try { asin = decodeURIComponent(asin); } catch { /* keep raw */ }
    const rest = html.slice(m.index + m[0].length);
    const text = unescapeHtml(rest.slice(0, rest.search(/<\/?[a-z]/i) >= 0 ? rest.search(/<\/?[a-z]/i) : rest.length))
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue; // open tag immediately followed by a nested <a> — no text of its own
    anchors.push({ guide, surface, asin, text });
  }
}

const guides: Guide[] = getAllGuides();
for (const g of guides) {
  const pickSurfaces = (label: string, picks: GuidePick[] | undefined) =>
    (picks ?? []).forEach((p, i) => {
      const id = p.asin ?? p.name ?? String(i);
      collect(g.slug, `${label}[${id}].bodyHtml`, p.bodyHtml);
      collect(g.slug, `${label}[${id}].verdictHtml`, p.verdictHtml);
    });
  pickSurfaces('picks', g.picks);
  pickSurfaces('suppressedPicks', g.suppressedPicks);
  (g.bottomLineHtml ?? []).forEach((h, i) => collect(g.slug, `bottomLineHtml[${i}]`, h));
  collect(g.slug, 'forDogsHtml', g.forDogsHtml);
  collect(g.slug, 'forCatsHtml', g.forCatsHtml);
  collect(g.slug, 'whenNotToBuyHtml', g.whenNotToBuyHtml);
  collect(g.slug, 'htmlContent', g.htmlContent);
}

// ---------------------------------------------------------------------------
// Job 1 — UNDER-scoping. A /go/ anchor whose ASIN is off the reading guide's
// roster is only legitimate when the reader clicked a full product name.
// ---------------------------------------------------------------------------
const hijacks = anchors.filter((a) => {
  if (rosterByGuide.get(a.guide)?.has(a.asin)) return false;   // this guide's own product
  if (nameKeys.has(a.text.toLowerCase())) return false;        // full product name — allowed site-wide
  if (authoredAnchorText.get(a.guide)?.has(a.text.toLowerCase())) return false; // hand-authored
  return true;
});
// Prose may hand-author `[text](https://amazon.com/s?k=…)` search links, which
// the /go rewriter turns into a search-phrase href rather than an ASIN one.
const injectedHijacks = hijacks.filter((h) => !h.asin.includes(' '));
check(
  `no cross-guide alias hijacks (found ${injectedHijacks.length})`,
  injectedHijacks.length === 0,
);
for (const h of injectedHijacks.slice(0, 25)) {
  console.error(`    ${h.guide} | ${h.surface} | -> ${h.asin} | "${h.text}"`);
}

// ---------------------------------------------------------------------------
// Job 2 — OVER-scoping. Scoping is by the READING guide's roster, not by the
// declaring guide. Deleting the roster check the wrong way (alias usable only
// in the guide that declared it) would break this.
// ---------------------------------------------------------------------------
// Corpus-wide, not a single pin: every anchor whose text is EXACTLY an alias
// the reading guide never declared, pointing at a product the reading guide
// DOES stock. Each one is a correct link that exists only because scoping keys
// on the reader's roster. A pinned single example is not enough here — the
// first version of this file pinned "Tractive" in at-home-pet-health-
// monitoring-tools with a substring match, and a mutation that dropped every
// alias from the site-wide map passed green, because that guide declares its
// own "the Tractive" and buildPickLinkMap covered the pin.
const foreignAliasLinks = anchors.filter((a) => {
  const key = a.text.toLowerCase();
  const declarers = aliasDeclaredBy.get(key);
  if (!declarers || declarers.has(a.guide)) return false;   // undeclared, or declared locally
  if (aliasAsin.get(key) !== a.asin) return false;           // not this alias's product
  return !!rosterByGuide.get(a.guide)?.has(a.asin);          // reader stocks it
});
const foreignAliasGuides = new Set(foreignAliasLinks.map((a) => a.guide));
check(
  `roster-scoped foreign aliases still link (found ${foreignAliasLinks.length} across ${foreignAliasGuides.size} guides)`,
  foreignAliasLinks.length > 300,
);
for (const a of foreignAliasLinks.slice(0, 3)) {
  console.log(
    `  e.g. ${a.guide} | ${a.surface} | "${a.text}" -> ${a.asin}` +
      ` (alias declared in ${[...(aliasDeclaredBy.get(a.text.toLowerCase()) ?? [])].join(', ')})`,
  );
}

// ---------------------------------------------------------------------------
// Job 3 — the proven case, pinned by name.
// ---------------------------------------------------------------------------
const VICTIM = 'best-dog-bathing-tubs-wash-stations-2026';
const TRAILER_ASIN = 'B0CWR5H5JT';
check(
  `fixture intact: ${VICTIM} does not stock ${TRAILER_ASIN}`,
  !rosterByGuide.get(VICTIM)?.has(TRAILER_ASIN),
);
const vevorHijacks = anchors.filter((a) => a.guide === VICTIM && a.asin === TRAILER_ASIN);
check(
  `wash-station prose never links to the bike trailer ${TRAILER_ASIN} (found ${vevorHijacks.length})`,
  vevorHijacks.length === 0,
);

// ---------------------------------------------------------------------------
// Job 4 — VACUITY. Jobs 1 and 3 are satisfied by an empty world; assert the
// world is not empty.
// ---------------------------------------------------------------------------
let collidingAliases = 0;
for (const [alias, declarers] of aliasDeclaredBy) {
  const asin = aliasAsin.get(alias)!;
  for (const [slug, roster] of rosterByGuide) {
    if (declarers.has(slug) || roster.has(asin)) continue;
    // Some guide that neither declares this alias nor stocks its product —
    // i.e. a guide the unscoped map WOULD have hijacked had the string occurred.
    collidingAliases++;
    break;
  }
}
check(`corpus still contains scopable aliases (found ${collidingAliases})`, collidingAliases > 100);
check(`injector still emits /go/ anchors (found ${anchors.length})`, anchors.length > 1000);
check(`site-wide map still carries full product names (found ${nameKeys.size})`, nameKeys.size > 500);

const sameGuide = anchors.filter((a) => rosterByGuide.get(a.guide)?.has(a.asin)).length;
console.log(
  `Guides: ${guides.length} | injected /go/ anchors: ${anchors.length} ` +
    `(same-guide ${sameGuide}, cross-guide-by-full-name ${anchors.length - sameGuide - injectedHijacks.length - (hijacks.length - injectedHijacks.length)}, ` +
    `authored search links ${hijacks.length - injectedHijacks.length})`,
);
console.log(
  `Scopable aliases in corpus: ${collidingAliases} | full product names site-wide: ${nameKeys.size}`,
);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('alias-scoping: PASS');
