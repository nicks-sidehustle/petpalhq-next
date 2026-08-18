/**
 * Site-wide guide and product link maps for PetPalHQ's 3-pass body-text auto-linker.
 *
 * Design principles:
 * - Reads all .md files directly with fs + gray-matter (no parseGuide call — avoids circular deps)
 * - Module-level memoization — cache invalidates on Node restart (fine for Next.js builds)
 * - Deterministic: alphabetical file order, first-occurrence wins for duplicate names
 * - Category-aware: editorial guides only link to other editorial guides;
 *   Playground guides only link to other Playground guides
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getDeadAsinEntry, getPickGuardEntry, isHardGateStatus } from './dead-asin-guard';
import { getCachedPrice, isSnapshotUnbuyable } from './price-cache';

const guidesDirectory = path.join(process.cwd(), 'src/content/guides');

export interface GuideLinkEntry {
  title: string;
  url: string;
  category: string;
}

/**
 * One entry of the site-wide product map, carrying the two facts the injector
 * needs in order to decide whether a given guide may use it:
 *
 * - `kind`: `'name'` keys are the pick's full product name (brand + model),
 *   unambiguous enough to mean the same product in any guide on the site.
 *   `'alias'` keys are per-guide shorthand ("the VEVOR", "the Tractive") that
 *   only means one specific product inside the guide that authored it.
 * - `asin`: lets a consumer scope an alias to guides that actually stock the
 *   product, instead of letting the string match anywhere it happens to occur.
 */
export interface ProductMapEntry {
  url: string;
  asin: string;
  kind: 'name' | 'alias';
}

// Module-level caches — populated once per Node process / build
let _guideMap: Map<string, GuideLinkEntry> | null = null;
let _productEntries: Map<string, ProductMapEntry> | null = null;
let _productMap: Map<string, string> | null = null;
let _hubMap: Map<string, string> | null = null;

/**
 * Interaction-gated affiliate href — mirrors guides.ts:buildAmazonUrl (DG-2).
 * Emits an internal `/go/{ASIN}` link (the /go route 302s to Amazon
 * server-side) so injected body links are never bare crawlable amazon.com
 * hrefs. See DG0-DIAGNOSIS H5.
 */
function buildAmazonUrl(asin: string): string {
  return `/go/${asin}`;
}

function frontmatterString(value: unknown, fallback = ''): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

interface RawGuideData {
  slug: string;
  title: string;
  category: string;
  hub: string;
  picks: Array<{ name?: string; asin?: string; rank?: number; aliases?: string[] }>;
}

/**
 * Reads all guide .md files and returns lightweight metadata.
 * Sorted alphabetically by slug for deterministic conflict resolution.
 */
function readAllGuideData(): RawGuideData[] {
  if (!fs.existsSync(guidesDirectory)) return [];

  const files = fs.readdirSync(guidesDirectory)
    .filter((f) => f.endsWith('.md'))
    .sort(); // alphabetical → deterministic first-occurrence wins

  return files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const filePath = path.join(guidesDirectory, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);

    const picks: Array<{ name?: string; asin?: string; rank?: number; aliases?: string[] }> = Array.isArray(data.picks)
      ? (data.picks as Array<Record<string, unknown>>).map((p) => ({
          name: frontmatterString(p?.name) || undefined,
          asin: frontmatterString(p?.asin) || undefined,
          rank: typeof p?.rank === 'number' ? p.rank : undefined,
          aliases: Array.isArray(p?.aliases)
            ? (p.aliases as unknown[]).filter((a): a is string => typeof a === 'string' && a.length > 0)
            : undefined,
        }))
      : [];

    return {
      slug,
      title: frontmatterString(data.title, slug),
      category: frontmatterString(data.category, 'Uncategorized'),
      hub: frontmatterString(data.hub),
      picks,
    };
  });
}

/**
 * Returns a memoized map of guide titles → GuideLinkEntry.
 * Keys are exact guide titles, sorted longest-first to prevent substring collisions.
 * Duplicate titles: first alphabetical slug wins.
 */
export function getSiteWideGuideMap(): Map<string, GuideLinkEntry> {
  if (_guideMap !== null) return _guideMap;

  const all = readAllGuideData();
  const raw = new Map<string, GuideLinkEntry>();

  for (const g of all) {
    if (g.title && !raw.has(g.title)) {
      raw.set(g.title, {
        title: g.title,
        url: `/guides/${g.slug}`,
        category: g.category,
      });
    }
  }

  // Sort by title length descending so longer titles match before substrings
  const sorted = new Map(
    [...raw.entries()].sort((a, b) => b[0].length - a[0].length),
  );

  _guideMap = sorted;
  return _guideMap;
}

/**
 * True when an ASIN has no buyable offer per either automatic, site-wide gate:
 * the dead-ASIN guard's hard-gate statuses, or the price snapshot's
 * availability field. Mirrors exactly the two conditions that force
 * `available: false` in guides.ts parsePicks().
 */
function isGloballyUnbuyable(asin: string, slug?: string, rank?: number): boolean {
  const guardEntry =
    slug !== undefined && rank !== undefined
      ? getPickGuardEntry(asin, slug, rank)
      : getDeadAsinEntry(asin);
  if (guardEntry && isHardGateStatus(guardEntry.status)) return true;
  const cached = getCachedPrice(asin);
  // Same predicate the roster splits on (guides.ts parsePicks). An Amazon-sold
  // backorder is a live conversion path under the 2026-08-18 ruling, so it
  // keeps its auto-links — stripping them here would half-apply the ruling:
  // pick visible, in-body mentions silently dead.
  return !!cached && isSnapshotUnbuyable(cached);
}

/**
 * Returns a memoized map of pick name/alias → {url, asin, kind}.
 * Covers all picks across all guides (site-wide product map).
 * Keys are sorted longest-first. Duplicate keys: first alphabetical slug wins.
 *
 * `kind` is what makes the greedy-alias fix possible: see ProductMapEntry, and
 * parseGuide()'s alias-scoping filter in guides.ts, which drops `'alias'`
 * entries whose product is not on the reading guide's own roster.
 */
export function getSiteWideProductEntries(): Map<string, ProductMapEntry> {
  if (_productEntries !== null) return _productEntries;

  const all = readAllGuideData();
  const raw = new Map<string, ProductMapEntry>();

  for (const g of all) {
    for (const pick of g.picks) {
      if (!pick.asin) continue;
      // §8m gates, applied at the SOURCE of the site-wide map.
      //
      // Both automatic gates are ASIN-level and therefore global: if
      // data/dead-asins.json says DEAD/NO-OFFER, or the price snapshot says
      // the ASIN has no buyable offer today, then NO guide may auto-link it —
      // not just the guide that lists it as a pick. parseGuide()'s deadAsinUrls
      // safety net only strips the *current* guide's gated picks, so a product
      // gated on guide A could still leak back as a live /go/ CTA in guide B's
      // prose via A's alias entry in this map. Dropping the entry here closes
      // that cross-guide path once.
      //
      // Guide-local `available: false` frontmatter is deliberately NOT applied
      // here — it's a per-guide editorial call, not a site-wide liveness fact,
      // and parseGuide()'s safety net already handles it for the guide that
      // set it.
      // rank default MUST match parsePicks() in guides.ts, which defaults a
      // missing `rank` to 0. A different sentinel here would build a different
      // pick-reference key, so a rank-less pick could suppress on its own page
      // while keeping a live site-wide /go/ alias everywhere else. Latent today
      // (0 picks corpus-wide lack a rank) and aligned so it stays that way.
      if (isGloballyUnbuyable(pick.asin, g.slug, pick.rank ?? 0)) continue;
      const url = buildAmazonUrl(pick.asin);
      const asin = pick.asin;
      if (pick.name && !raw.has(pick.name)) raw.set(pick.name, { url, asin, kind: 'name' });
      if (Array.isArray(pick.aliases)) {
        for (const alias of pick.aliases) {
          if (typeof alias === 'string' && alias && !raw.has(alias)) {
            raw.set(alias, { url, asin, kind: 'alias' });
          }
        }
      }
    }
  }

  // Sort by name length descending to prevent substring collisions
  const sorted = new Map(
    [...raw.entries()].sort((a, b) => b[0].length - a[0].length),
  );

  _productEntries = sorted;
  return _productEntries;
}

/**
 * Returns a memoized map of pick name/alias → Amazon affiliate URL — the flat
 * projection of getSiteWideProductEntries(), same keys in the same order.
 *
 * NOTE for callers doing link injection: this map is NOT safe to hand to the
 * injector as-is. It contains per-guide shorthand aliases that hijack prose in
 * other guides (see ProductMapEntry). Use getSiteWideProductEntries() and
 * apply the roster scope, as parseGuide() does.
 */
export function getSiteWideProductMap(): Map<string, string> {
  if (_productMap !== null) return _productMap;
  _productMap = new Map(
    [...getSiteWideProductEntries().entries()].map(([key, e]) => [key, e.url]),
  );
  return _productMap;
}

/**
 * Returns the `hub:` frontmatter field for a guide slug (spoke guides point
 * at their parent hub's slug; hub guides themselves and un-clustered guides
 * have no `hub:` field, in which case this returns undefined).
 *
 * Used by the tracking-ID resolver (src/config/tracking-ids.ts) to bucket a
 * guide by product type — NOT by the species-based `category:` field, which
 * cannot express product-type buckets (e.g. bird-feeder cams vs. feeders).
 */
export function getGuideHubBySlug(slug: string): string | undefined {
  if (_hubMap === null) {
    const all = readAllGuideData();
    const raw = new Map<string, string>();
    for (const g of all) {
      if (g.hub) raw.set(g.slug, g.hub);
    }
    _hubMap = raw;
  }
  return _hubMap.get(slug);
}

/**
 * Returns a map of guide title → URL scoped to the same category pool as
 * `currentCategory`, with the current guide's own title excluded.
 *
 * Category pools:
 * - Playground guides (category === "Playground") → only other Playground guides
 * - Editorial guides (everything else) → only other editorial guides
 *
 * v1: exact title match only (no slug-derived aliases).
 */
export function buildGuideLinkMap(
  currentCategory: string,
  currentSlug: string,
): Map<string, string> {
  const full = getSiteWideGuideMap();
  const isPlayground = currentCategory === 'Playground';

  const filtered = new Map<string, string>();

  for (const [title, entry] of full.entries()) {
    // Category pool filter
    const entryIsPlayground = entry.category === 'Playground';
    if (isPlayground !== entryIsPlayground) continue;

    // Self-link filter: skip if this entry's URL is /guides/<currentSlug>
    if (entry.url === `/guides/${currentSlug}`) continue;

    filtered.set(title, entry.url);
  }

  return filtered;
}
