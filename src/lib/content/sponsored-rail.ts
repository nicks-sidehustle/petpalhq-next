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

/**
 * Wild-bird feeding guides (owner ruling 2026-09-29): "Bird pages: show the
 * feeders only on guides about wild-bird feeding; other bird-category pages
 * (coops, parrots, baths, aviaries, chickens) show no sponsored unit."
 * The only bird campaigns are wild-bird feeders, so bird products are matched
 * by this explicit slug allowlist, never by category. Every other Birds guide
 * renders nothing. Add a slug here only for a guide about feeding wild birds.
 */
export const WILD_BIRD_FEEDING_SLUGS: ReadonlySet<string> = new Set([
  "best-hummingbird-feeders-2026",
  "best-smart-bird-feeders-2026",
  "best-squirrel-proof-bird-feeders-2026",
  "smart-bird-feeders-backyard-birdwatching",
  "best-bird-feeder-pole-systems-baffles-2026",
]);

const DOG_WORDS = new Set(["dog", "dogs", "puppy", "puppies"]);
const CAT_WORDS = new Set(["cat", "cats", "kitten", "kittens"]);

/** Dog/cat named explicitly by whole words in the slug (e.g. "trim-your-dogs-nails"). */
export function slugAnimals(slug: string): Array<"dog" | "cat"> {
  const words = slug.toLowerCase().split(/[^a-z]+/);
  const out: Array<"dog" | "cat"> = [];
  if (words.some((w) => DOG_WORDS.has(w))) out.push("dog");
  if (words.some((w) => CAT_WORDS.has(w))) out.push("cat");
  return out;
}

/**
 * Map a guide to the campaign animals it fits (owner 2026-09-29, W4 #209):
 *  - Wild-bird feeding guides (allowlist above) -> ["bird"]; any other Birds
 *    guide -> nothing.
 *  - Dog/cat comes from the guide's `species`, narrowed by the slug: a slug
 *    that names only dogs (or only cats) is a dog-only (cat-only) guide even
 *    when its frontmatter lists both, so it never gets the other animal.
 *  - No `species`: dog/cat only from explicit slug words (dog/puppy, cat/
 *    kitten); neither -> nothing. Category is never used to guess an animal.
 * Aquarium / Reptile / small-pet / uncategorized guides map to nothing, so
 * the unit does not render there.
 */
export function guideAnimals(
  slug: string,
  species: readonly string[] | undefined | null,
  category: string | undefined | null,
): SponsoredAnimal[] {
  if (WILD_BIRD_FEEDING_SLUGS.has(slug)) return ["bird"];
  if ((category ?? "").trim().toLowerCase() === "birds") return [];
  const fromSlug = slugAnimals(slug);
  const fromSpecies = (species ?? []).filter(
    (s): s is "dog" | "cat" => s === "dog" || s === "cat",
  );
  if (fromSpecies.length === 0) return fromSlug;
  // Slug names exactly one of dog/cat: keep only that one.
  if (fromSlug.length === 1) return fromSpecies.filter((a) => a === fromSlug[0]);
  return fromSpecies;
}

/**
 * The guide's own pick ASINs (live and suppressed picks). page.tsx passes
 * these to GuideSideRail so the sponsored unit never shows one of them;
 * scripts/test/sponsored-rail.test.tsx checks that wiring on the real page.
 */
export function guidePickAsins(guide: {
  picks?: ReadonlyArray<{ asin?: string | null }> | null;
  suppressedPicks?: ReadonlyArray<{ asin?: string | null }> | null;
}): string[] {
  return [...(guide.picks ?? []), ...(guide.suppressedPicks ?? [])]
    .map((p) => p.asin)
    .filter((a): a is string => Boolean(a));
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
