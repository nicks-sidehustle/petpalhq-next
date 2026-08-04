/**
 * cross-category.ts — "Readers also shopping" cross-category rail picks.
 *
 * Ported from SmartHomeExplorer/DormGearHQ's grid side-rail pilot ("Rail
 * v2"). Surfaces guide links from a DIFFERENT top-level category than the
 * current page, so the rail complements (not duplicates) the seasonal-promo
 * card above it and the in-article RelatedGuides/SpokesList blocks (which
 * stay same-topic, in-flow).
 *
 * ADAPTATION vs SHE/dormgear: those sites resolve candidates through a
 * category-pool file (contextual-promo-pools.ts) plus a hub-spoke map —
 * neither exists in PetPalHQ. PetPalHQ's getAllGuideSummaries()
 * (src/lib/guides.ts) already returns {slug, title, category, image} for the
 * whole corpus, so it is used directly as both the candidate pool and the
 * slug→title/image resolver — a slug that doesn't resolve a real title is
 * dropped rather than shown with a guessed one (honesty law: never fabricate
 * a guide title). Cross-category grouping uses the guide's own `category`
 * field (e.g. "Aquarium", "Reptile", "Cats & Dogs", "Birds") rather than a
 * pool key, since PetPalHQ has no pool-key concept.
 *
 * Guides authored without a hero `image` (about half the corpus, per the
 * v2 scaffold) resolve to an empty string, not a placeholder path — those are
 * dropped rather than shown with a broken/fallback thumbnail (same guard as
 * dormgear's cross-category picks loop, adapted for PetPalHQ's empty-string
 * convention instead of a `/images/default-guide.png` sentinel).
 *
 * Deterministic, no Math.random(): candidates are ordered by a stable
 * per-slug hash (seeded with the current page's slug) so the same guide sees
 * the same picks on every render/deploy, but different guides see a
 * different-looking slice of the candidate pool.
 */

import { getAllGuideSummaries } from "@/lib/guides";

export interface CrossCategoryPick {
  slug: string;
  title: string;
  category?: string;
  image: string;
}

/** djb2 string hash — deterministic, no Math.random(). */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Stable per-seed ordering: sorts by hash(seed + item key). */
function deterministicOrder<T>(items: T[], seed: string, keyOf: (item: T) => string): T[] {
  return [...items].sort((a, b) => hashString(seed + keyOf(a)) - hashString(seed + keyOf(b)));
}

/**
 * Resolve up to `limit` (default 3) cross-category guide picks for a page,
 * each with a real thumbnail image for the rail's chip layout. Returns []
 * when nothing resolves — CrossCategoryPicks renders nothing in that case (no
 * empty-shell card).
 */
export function getCrossCategoryPicks(
  args: { slug: string; category?: string | null },
  limit = 3
): CrossCategoryPick[] {
  const candidates = getAllGuideSummaries().filter((g) => {
    if (g.slug === args.slug) return false;
    if (!g.image) return false; // no real thumbnail on record — drop, don't fall back
    if (args.category && g.category === args.category) return false; // stay cross-category
    return true;
  });

  const picks: CrossCategoryPick[] = candidates.map((g) => ({
    slug: g.slug,
    title: g.title,
    category: g.category,
    image: g.image,
  }));

  return deterministicOrder(picks, args.slug, (p) => p.slug).slice(0, limit);
}
