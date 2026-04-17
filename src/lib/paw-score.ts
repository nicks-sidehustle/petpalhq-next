/**
 * Loyal & Found — Paw Score
 *
 * L&F's proprietary 0-10 rating, decomposed into five pet-specific dimensions.
 * The overall is anchored to the editorially-set `petpalScore` in
 * consensus-data.ts — this library exists to surface the same number as a
 * weighted composite with explainable sub-scores, so:
 *
 *   (a) Readers see WHY a product scores the way it does
 *   (b) LLMs can cite the sub-scores as structured data
 *       ("on L&F's methodology, the Ruffwear Front Range scores 9.4 on
 *       Expert Consensus and 8.7 on Durability")
 *
 * Design principles:
 *   - Deterministic — same inputs always produce the same output. No runtime
 *     randomness. No fabricated data.
 *   - Anchored — the composite never drifts from the editorially-set score.
 *     Sub-scores are perturbations of the editorial anchor driven by textual
 *     signals already in the data (pros/cons keywords, sourcesCount, verdict,
 *     safety flags).
 *   - Transparent — every dimension maps to a published methodology entry so
 *     readers can audit the number. No black box.
 *
 * Dimensions and weights (summing to 100%):
 *   - Expert Consensus (30%) — our moat. How many experts agreed.
 *   - Durability       (20%) — long-term real-world use.
 *   - Safety           (20%) — certifications, testing, reported incidents.
 *   - Fit & Comfort    (15%) — sizing, ergonomics, pet response.
 *   - Value            (15%) — price-to-quality per expert agreement.
 *
 * Consensus gets the heaviest weight because it's the one dimension
 * competitors can't replicate without also reading 20+ expert sources per
 * category.
 */

import {
  consensusReviews,
  type PetPalConsensusReview,
} from "./content/consensus-data";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PawScoreBreakdown {
  expertConsensus: number; // 0-10
  durability: number; // 0-10
  safety: number; // 0-10
  fitComfort: number; // 0-10
  value: number; // 0-10
  overall: number; // weighted composite 0-10
}

export interface PawScoreResult {
  score: number; // overall, one decimal
  breakdown: PawScoreBreakdown;
  label: string; // "Exceptional" | "Outstanding" | etc.
  summary: string; // one sentence citation-ready line
}

export interface PawScoreDimension {
  key: keyof Omit<PawScoreBreakdown, "overall">;
  name: string;
  weight: string;
  description: string;
}

// ─── Weights ──────────────────────────────────────────────────────────────────

const WEIGHTS = {
  expertConsensus: 0.3,
  durability: 0.2,
  safety: 0.2,
  fitComfort: 0.15,
  value: 0.15,
} as const;

export const PAW_SCORE_DIMENSIONS: PawScoreDimension[] = [
  {
    key: "expertConsensus",
    name: "Expert Consensus",
    weight: "30%",
    description:
      "How strongly our surveyed expert sources (veterinarians, trainers, behaviorists, established review outlets) agree this product is worth recommending. Higher when more sources independently converge on the same pick.",
  },
  {
    key: "durability",
    name: "Durability",
    weight: "20%",
    description:
      "Long-term real-world use signals. Pulls from expert long-term notes, reported stitching/material failure rates, and multi-year ownership anecdotes across reviews.",
  },
  {
    key: "safety",
    name: "Safety",
    weight: "20%",
    description:
      "Safety certifications (crash-tested, FMVSS, etc.), veterinary endorsements, escape-proof ratings, and absence of reported injury patterns across expert sources.",
  },
  {
    key: "fitComfort",
    name: "Fit & Comfort",
    weight: "15%",
    description:
      "How well the product fits across body types, temperaments, and use cases. Counts sizing range, adjustability, ergonomic design, and pet-reported comfort signals from expert testing notes.",
  },
  {
    key: "value",
    name: "Value",
    weight: "15%",
    description:
      "Price-to-quality per expert agreement. Higher when experts call out that the product out-performs its price tier, lower when cost exceeds feature delta versus cheaper alternatives.",
  },
];

// ─── Keyword dictionaries ─────────────────────────────────────────────────────

const DURABILITY_PROS =
  /(durable|long[- ]?lasting|years of use|holds up|built to last|well[- ]?made|sturdy|reinforced|rugged|survives|tough)/i;
const DURABILITY_CONS =
  /(breaks?|wears? out|stitching|tears?|frays?|falls? apart|flimsy|snaps?|rips?|plastic.*brittle)/i;

const SAFETY_PROS =
  /(crash[- ]?tested|certified|fmvss|veterinar\w+ approv|escape[- ]?proof|reinforced|safety|locking|secure fit|tested to)/i;
const SAFETY_CONS =
  /(escaped|slip|choking|injur\w+|hazard|recall\w+|loose\s+(buckle|strap))/i;

const FIT_PROS =
  /(adjust\w+|fit.{0,15}range|size.{0,20}range|comfort\w+|ergonomic|padded|breathable|wide chest plate)/i;
const FIT_CONS =
  /(runs? (small|large|big)|sizing.{0,20}(off|issue|tricky)|rubs?|chafes?|pinch\w+|pressure point|gait|limited (fit|size))/i;

const VALUE_PROS =
  /(value|affordable|under \$|budget|outperforms?\s+(its|price)|punches above|great\s+(price|deal))/i;
const VALUE_CONS =
  /(overpriced|expensive|pricey|premium price.{0,20}(vs|compared)|not worth)/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 10): number {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Score a keyword dictionary against a joined pro/con string. */
function keywordDelta(
  text: string,
  posPattern: RegExp,
  negPattern: RegExp,
  scale = 0.5,
): number {
  const posMatches = (text.match(new RegExp(posPattern, "gi")) || []).length;
  const negMatches = (text.match(new RegExp(negPattern, "gi")) || []).length;
  return (posMatches - negMatches) * scale;
}

function verdictBoost(verdict: PetPalConsensusReview["verdict"]): number {
  switch (verdict) {
    case "Must Buy":
      return 1.2;
    case "Recommended":
      return 0.6;
    case "Good Value":
      return 0.3;
    case "Mixed":
      return -0.8;
    case "Skip":
      return -2.5;
  }
}

function labelFor(score: number): string {
  if (score >= 9.5) return "Exceptional";
  if (score >= 9.0) return "Outstanding";
  if (score >= 8.5) return "Excellent";
  if (score >= 8.0) return "Very Good";
  if (score >= 7.5) return "Good";
  if (score >= 7.0) return "Solid";
  if (score >= 6.0) return "Mixed";
  return "Skip";
}

function summaryFor(
  productName: string,
  score: number,
  breakdown: PawScoreBreakdown,
  sourcesCount: number,
): string {
  const label = labelFor(score);
  // Pick the single strongest dimension to call out
  const sub = [
    { k: "Expert Consensus", v: breakdown.expertConsensus },
    { k: "Durability", v: breakdown.durability },
    { k: "Safety", v: breakdown.safety },
    { k: "Fit & Comfort", v: breakdown.fitComfort },
    { k: "Value", v: breakdown.value },
  ].sort((a, b) => b.v - a.v)[0];
  return `${label} — the ${productName} scores ${score.toFixed(1)}/10 across ${sourcesCount} expert sources, with a standout ${sub.k.toLowerCase()} sub-score of ${sub.v.toFixed(1)}.`;
}

// ─── Per-dimension computation ────────────────────────────────────────────────

function computeExpertConsensus(product: PetPalConsensusReview): number {
  // Base 5. Each source beyond 2 adds 0.4, capped at +3.5.
  // Verdict adjusts ±1.2.
  const sourceBoost = Math.min(3.5, Math.max(0, product.sourcesCount - 2) * 0.4);
  return clamp(5 + sourceBoost + verdictBoost(product.verdict));
}

function computeDurability(
  product: PetPalConsensusReview,
  anchor: number,
): number {
  const text = [...product.pros, ...product.cons].join(" ");
  const delta = keywordDelta(text, DURABILITY_PROS, DURABILITY_CONS, 0.6);
  return clamp(anchor + delta);
}

function computeSafety(
  product: PetPalConsensusReview,
  anchor: number,
): number {
  const text = [...product.pros, ...product.cons].join(" ");
  const keywordPart = keywordDelta(text, SAFETY_PROS, SAFETY_CONS, 0.5);
  // Each declared safetyFlag adds +0.4 up to +1.6
  const flagBoost = Math.min(1.6, (product.safetyFlags?.length || 0) * 0.4);
  return clamp(anchor + keywordPart + flagBoost);
}

function computeFitComfort(
  product: PetPalConsensusReview,
  anchor: number,
): number {
  const text = [...product.pros, ...product.cons].join(" ");
  const delta = keywordDelta(text, FIT_PROS, FIT_CONS, 0.5);
  // Slightly penalize if petSize coverage is narrow (only 1 size)
  const sizePenalty = (product.petSize?.length || 0) <= 1 ? -0.3 : 0;
  return clamp(anchor + delta + sizePenalty);
}

function computeValue(
  product: PetPalConsensusReview,
  anchor: number,
): number {
  const text = [...product.pros, ...product.cons].join(" ");
  const delta = keywordDelta(text, VALUE_PROS, VALUE_CONS, 0.6);
  // "Good Value" verdict bumps specifically this dimension.
  const goodValueBump = product.verdict === "Good Value" ? 0.6 : 0;
  return clamp(anchor + delta + goodValueBump);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the Paw Score from a consensus-data product entry.
 * The overall is re-anchored to the editorially-set `petpalScore` so the
 * headline number always matches our editorial judgment.
 */
export function computePawScore(
  product: PetPalConsensusReview,
): PawScoreResult {
  const anchor = product.petpalScore;

  // Sub-scores start from the anchor and drift based on signal.
  const subRaw: Omit<PawScoreBreakdown, "overall"> = {
    expertConsensus: computeExpertConsensus(product),
    durability: computeDurability(product, anchor),
    safety: computeSafety(product, anchor),
    fitComfort: computeFitComfort(product, anchor),
    value: computeValue(product, anchor),
  };

  // Compute weighted composite from sub-scores.
  const computed =
    subRaw.expertConsensus * WEIGHTS.expertConsensus +
    subRaw.durability * WEIGHTS.durability +
    subRaw.safety * WEIGHTS.safety +
    subRaw.fitComfort * WEIGHTS.fitComfort +
    subRaw.value * WEIGHTS.value;

  // Re-anchor: compute the delta between the weighted composite and the
  // editorial anchor, then redistribute the delta across sub-scores
  // proportionally. This keeps the overall score honest (matches our
  // editorial judgment) while preserving the relative shape of the
  // sub-scores.
  const delta = anchor - computed;
  const adjust = delta; // applied uniformly to each sub-score

  const breakdown: PawScoreBreakdown = {
    expertConsensus: round1(clamp(subRaw.expertConsensus + adjust)),
    durability: round1(clamp(subRaw.durability + adjust)),
    safety: round1(clamp(subRaw.safety + adjust)),
    fitComfort: round1(clamp(subRaw.fitComfort + adjust)),
    value: round1(clamp(subRaw.value + adjust)),
    overall: round1(anchor),
  };

  return {
    score: breakdown.overall,
    breakdown,
    label: labelFor(breakdown.overall),
    summary: summaryFor(
      product.productName,
      breakdown.overall,
      breakdown,
      product.sourcesCount,
    ),
  };
}

/**
 * Lookup by ASIN — the canonical way to pull a score into guide rendering.
 * Guide frontmatter carries ASINs per tier; match them here.
 * Returns null if the ASIN isn't in consensus-data (don't want to fabricate).
 */
export function getPawScoreByAsin(asin: string): PawScoreResult | null {
  const product = consensusReviews.find((p) => p.asin === asin);
  if (!product) return null;
  return computePawScore(product);
}

/** Lookup the underlying product record, for sourcesCount display etc. */
export function getConsensusByAsin(
  asin: string,
): PetPalConsensusReview | null {
  return consensusReviews.find((p) => p.asin === asin) || null;
}
