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

const guidesDirectory = path.join(process.cwd(), 'src/content/guides');

export interface GuideLinkEntry {
  title: string;
  url: string;
  category: string;
}

// Module-level caches — populated once per Node process / build
let _guideMap: Map<string, GuideLinkEntry> | null = null;
let _productMap: Map<string, string> | null = null;

/** Canonical Amazon affiliate URL — mirrors guides.ts:buildAmazonUrl */
function buildAmazonUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=petpalhq08-20`;
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
  picks: Array<{ name?: string; asin?: string }>;
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

    const picks: Array<{ name?: string; asin?: string }> = Array.isArray(data.picks)
      ? (data.picks as Array<Record<string, unknown>>).map((p) => ({
          name: frontmatterString(p?.name) || undefined,
          asin: frontmatterString(p?.asin) || undefined,
        }))
      : [];

    return {
      slug,
      title: frontmatterString(data.title, slug),
      category: frontmatterString(data.category, 'Uncategorized'),
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
 * Returns a memoized map of pick names → Amazon affiliate URL.
 * Covers all picks across all guides (site-wide product map).
 * Keys are sorted longest-first. Duplicate names: first alphabetical slug wins.
 */
export function getSiteWideProductMap(): Map<string, string> {
  if (_productMap !== null) return _productMap;

  const all = readAllGuideData();
  const raw = new Map<string, string>();

  for (const g of all) {
    for (const pick of g.picks) {
      if (pick.name && pick.asin && !raw.has(pick.name)) {
        raw.set(pick.name, buildAmazonUrl(pick.asin));
      }
    }
  }

  // Sort by name length descending to prevent substring collisions
  const sorted = new Map(
    [...raw.entries()].sort((a, b) => b[0].length - a[0].length),
  );

  _productMap = sorted;
  return _productMap;
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
