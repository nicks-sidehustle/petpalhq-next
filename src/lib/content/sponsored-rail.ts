/**
 * sponsored-rail.ts — selects Amazon Creator Connections (Sponsored Products
 * for Creators) campaign products for the guide side rail (owner 2026-09-29).
 *
 * Data: data/sponsored-rail.json — accepted pet campaigns, with `name` and
 * `image` taken from the Creators API lookup. It carries NO price field by
 * design: the rail unit never shows a price, so nothing here is subject to the
 * live-read / price-stamp rules, and it is separate from the guides' own
 * pick/price data.
 *
 * Selection is deterministic (no Math.random()): the matching pool is sorted
 * by campaign EPC (desc, null last) then ASIN, and the window of up to 3 is
 * rotated by a hash of the guide slug, so every build shows the same unit on
 * the same guide while different guides spread across the pool.
 */

import sponsoredRailData from "../../../data/sponsored-rail.json";

export type SponsoredAnimal = "dog" | "cat" | "multi" | "bird" | "small-pet";

export interface SponsoredRailProduct {
  asin: string;
  brand: string | null;
  animal: SponsoredAnimal | null;
  /** Campaign "Up to" earnings per click, USD. Commission metric, never rendered. */
  epc: number | null;
  name: string;
  image: string;
}

export const SPONSORED_RAIL_PRODUCTS: SponsoredRailProduct[] =
  sponsoredRailData.products as SponsoredRailProduct[];

/** Subtag + CLL position for every rail sponsored click. */
export const SPONSORED_RAIL_PLACEMENT = "rail_sponsored_cc";

const CATEGORY_ANIMALS: Record<string, SponsoredAnimal[]> = {
  "cats & dogs": ["dog", "cat"],
  dog: ["dog"],
  dogs: ["dog"],
  cat: ["cat"],
  cats: ["cat"],
  birds: ["bird"],
};

/**
 * Map a guide to the campaign animals it fits. The guide's `species` (dog/cat)
 * wins; otherwise its `category`. Aquarium / Reptile / uncategorized guides
 * map to nothing, so the unit does not render there.
 */
export function guideAnimals(
  species: readonly string[] | undefined | null,
  category: string | undefined | null,
): SponsoredAnimal[] {
  const fromSpecies = (species ?? []).filter(
    (s): s is "dog" | "cat" => s === "dog" || s === "cat",
  );
  if (fromSpecies.length) return fromSpecies;
  return CATEGORY_ANIMALS[(category ?? "").trim().toLowerCase()] ?? [];
}

/** djb2 string hash — deterministic, no Math.random(). */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Up to `limit` sponsored products for a guide. `multi` campaigns fit dog and
 * cat guides. ASINs in `excludeAsins` (the guide's own picks) are never shown.
 * Returns [] when nothing matches.
 */
export function selectSponsoredRailProducts(
  args: {
    slug: string;
    animals: readonly SponsoredAnimal[];
    excludeAsins?: Iterable<string>;
  },
  products: readonly SponsoredRailProduct[] = SPONSORED_RAIL_PRODUCTS,
  limit = 3,
): SponsoredRailProduct[] {
  const exclude = new Set(args.excludeAsins ?? []);
  const fitsDogOrCat = args.animals.some((a) => a === "dog" || a === "cat");
  const pool = products
    .filter((p) => {
      if (!p.animal || exclude.has(p.asin)) return false;
      if (args.animals.includes(p.animal)) return true;
      return p.animal === "multi" && fitsDogOrCat;
    })
    .sort((a, b) => (b.epc ?? -1) - (a.epc ?? -1) || a.asin.localeCompare(b.asin));
  if (pool.length === 0) return [];
  const n = Math.min(limit, pool.length);
  const start = hashString(args.slug) % pool.length;
  return Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]);
}
