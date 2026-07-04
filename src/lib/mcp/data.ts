/**
 * MCP Data Adapter — flattens PetPalHQ buying guides into a queryable
 * product index for the MCP tools.
 *
 * PetPalHQ's real data lives in the markdown buying guides (`src/content/guides`)
 * parsed by `@/lib/guides`. Each guide carries a set of ranked `GuidePick`
 * entries — those picks ARE the products. This module joins each pick back to
 * its guide context so MCP responses can cite the exact on-site page + anchor.
 *
 * COMPLIANCE: This module never emits Amazon URLs. Product URLs point to the
 * guide page + pick anchor on petpalhq.com.
 */

import {
  getAllGuides,
  slugifyHeading,
  type GuidePick,
} from '@/lib/guides';
import { scoreToVerdict } from '@/lib/content/consensus-data';

export interface PetProduct {
  name: string;
  brand: string;
  /** PetPal Gear Score for this pick (0-10) */
  score: number;
  /** Verdict label derived from the documented score thresholds */
  verdictLabel: string;
  /** The pick's own one-line editorial verdict */
  verdictSummary: string;
  price: string;
  rank: number;
  pros: string[];
  cons: string[];
  keyFeatures: string[];
  /** Number of named authority sources cited for this pick */
  expertSourcesCited: number;
  /** Slug of the guide this pick appears in */
  guideSlug: string;
  guideTitle: string;
  /** Display category of the parent guide (e.g. "Aquarium") */
  category: string;
  /** Content-pillar slug of the parent guide (e.g. "aquarium-filtration") */
  pillar: string;
  /** In-page anchor for the pick on the guide page */
  anchor: string;
}

let productCache: PetProduct[] | null = null;

function toProduct(pick: GuidePick, guide: { slug: string; title: string; category: string; pillar: string }): PetProduct {
  return {
    name: pick.name,
    brand: pick.brand,
    score: pick.score,
    verdictLabel: scoreToVerdict(pick.score),
    verdictSummary: (pick.verdict ?? '').slice(0, 220),
    price: pick.price,
    rank: pick.rank,
    pros: pick.pros ?? [],
    cons: pick.cons ?? [],
    keyFeatures: pick.keyFeatures ?? [],
    expertSourcesCited: pick.authoritySources?.length ?? 0,
    guideSlug: guide.slug,
    guideTitle: guide.title,
    category: guide.category,
    pillar: guide.pillar,
    anchor: slugifyHeading(pick.name),
  };
}

/** Flatten every ranked pick across every guide into a single product index. */
export function getAllPetProducts(): PetProduct[] {
  if (productCache) return productCache;

  const products: PetProduct[] = [];
  for (const guide of getAllGuides()) {
    const ctx = { slug: guide.slug, title: guide.title, category: guide.category, pillar: guide.pillar };
    for (const pick of guide.picks ?? []) {
      if (!pick?.name) continue;
      products.push(toProduct(pick, ctx));
    }
  }

  if (process.env.NODE_ENV === 'production') productCache = products;
  return products;
}
