/**
 * PetPalHQ Consensus Review Data
 *
 * Each entry aggregates expert reviews from veterinarians, aquarists,
 * herpetologists, and ornithologists into a single PetPal Gear Score.
 *
 * PetPal Gear Score methodology:
 *   Expert Consensus  30%  — agreement across surveyed expert sources
 *   Effectiveness     25%  — does the product reliably do its core function
 *   Animal Safety     20%  — safe for the animal (chemical, thermal, mechanical)
 *   Durability        15%  — long-term reliability under wet/hot/varied conditions
 *   Value             10%  — price-to-quality given expected lifespan
 *
 * Verdict thresholds (network-consistent):
 *   >= 9.0  "Must Buy"
 *   >= 8.0  "Recommended"
 *   >= 7.5  "Good Value"
 *   >= 6.0  "Mixed"
 *   <  6.0  "Skip"
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExpertQuote {
  /** Publication or reviewer name */
  source: string;
  /** Direct quote from the review */
  quote: string;
  /** Numerical rating from that source, normalized to 10-point scale */
  rating?: number;
  /** URL to the source review */
  url?: string;
}

export type Verdict = "Must Buy" | "Recommended" | "Good Value" | "Mixed" | "Skip";

export type ConsensusCategory =
  | "Water Quality & Cycling"
  | "Aquarium Filtration"
  | "Aquarium Care & Cleaning"
  | "Reptile Habitat"
  | "Reptile Lighting & Heat"
  | "Bird Feeders & Backyard"
  | "Expert Care Guides";

export interface PillarScores {
  expertConsensus: number;  // 0-10
  effectiveness: number;    // 0-10
  animalSafety: number;     // 0-10
  durability: number;       // 0-10
  value: number;            // 0-10
}

export interface ConsensusReview {
  /** Unique kebab-case identifier */
  id: string;
  /** Display name */
  productName: string;
  /** URL slug (matches id) */
  slug: string;
  /** Product category — matches site content pillars */
  category: ConsensusCategory;
  /** Optional subcategory for finer grouping */
  subcategory?: string;
  /** Product image path or URL */
  image: string;
  /** Individual pillar scores */
  pillarScores: PillarScores;
  /** PetPal Gear Score — weighted composite (0-10) */
  petpalGearScore: number;
  /** Price range string (e.g., "$135", "$50-$80") */
  priceRange: string;
  /** Product tier */
  priceBand: "premium" | "recommended" | "practical";
  /** Number of expert sources analyzed */
  sourcesCount: number;
  /** ISO date string of last research pass */
  lastUpdated: string;
  /** Verdict derived from PetPal Gear Score thresholds */
  verdict: Verdict;
  /** Key advantages — exactly 5 per product */
  pros: string[];
  /** Key disadvantages — exactly 4 per product */
  cons: string[];
  /** Notable quotes from expert reviewers */
  expertQuotes: ExpertQuote[];
  /** Highlighted features */
  keyFeatures?: string[];
  /** Target audience descriptors */
  bestFor?: string[];
  /** Affiliate links */
  affiliateLinks: {
    amazon: string;
  };
  /** Is this the top pick in its category? */
  topPick?: boolean;
  /** Is this the best practical-tier option in its category? */
  practicalPick?: boolean;
  /** Estimated years of usable life based on owner data */
  estimatedYears?: number;
  /** Storage / footprint dimensions or description */
  storageNote?: string;
  /** Setup time estimate */
  setupTime?: string;
}

// ─── Scoring Helpers ────────────────────────────────────────────────────────

const WEIGHTS = {
  expertConsensus: 0.30,
  effectiveness: 0.25,
  animalSafety: 0.20,
  durability: 0.15,
  value: 0.10,
} as const;

/** Calculate weighted composite PetPal Gear Score from pillar scores */
export function calculateComposite(scores: PillarScores): number {
  const raw =
    scores.expertConsensus * WEIGHTS.expertConsensus +
    scores.effectiveness * WEIGHTS.effectiveness +
    scores.animalSafety * WEIGHTS.animalSafety +
    scores.durability * WEIGHTS.durability +
    scores.value * WEIGHTS.value;
  return Math.round(raw * 10) / 10;
}

/** Derive verdict from PetPal Gear Score */
export function scoreToVerdict(score: number): Verdict {
  if (score >= 9.0) return "Must Buy";
  if (score >= 8.0) return "Recommended";
  if (score >= 7.5) return "Good Value";
  if (score >= 6.0) return "Mixed";
  return "Skip";
}

/** Convert verdict to CSS data-attribute value */
export function verdictToSlug(verdict: Verdict): string {
  return verdict.toLowerCase().replace(/\s+/g, "-");
}

// ─── Data ───────────────────────────────────────────────────────────────────
//
// Reviews are populated as content guides ship. Empty array on initial v2
// scaffold — products will be added as we build out aquarium, reptile, and
// birds guides per the BRIEF_PETPAL_V2.md content plan.

export const consensusReviews: ConsensusReview[] = [];

// ─── Lookup Helpers ─────────────────────────────────────────────────────────

/** Get the top-picked reviews across all categories, sorted by score desc */
export function getTopPicks(limit = 6): ConsensusReview[] {
  return [...consensusReviews]
    .filter((r) => r.topPick)
    .sort((a, b) => b.petpalGearScore - a.petpalGearScore)
    .slice(0, limit);
}

/** Get all reviews sorted by score (highest first) */
export function getAllReviewsByScore(): ConsensusReview[] {
  return [...consensusReviews].sort((a, b) => b.petpalGearScore - a.petpalGearScore);
}

/** Find a review by its slug */
export function findReviewBySlug(slug: string): ConsensusReview | undefined {
  return consensusReviews.find((r) => r.slug === slug);
}

/** Find all reviews in a given category */
export function findReviewsByCategory(category: ConsensusCategory): ConsensusReview[] {
  return consensusReviews.filter((r) => r.category === category);
}
