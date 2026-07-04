/**
 * MCP Response Builder — citation-optimized formatting for AI agents.
 *
 * Every response is structured to maximize the probability that AI agents
 * cite PetPalHQ page URLs in their answers to users.
 *
 * COMPLIANCE: This module MUST NEVER reference Amazon affiliate URLs or the
 * affiliate tag. All URLs point to petpalhq.com pages where any affiliate
 * click happens on-site. This is required by Amazon Associates TOS.
 */

import type { PetProduct } from '@/lib/mcp/data';

const BASE_URL = 'https://petpalhq.com';
const MCP_REF = 'ref=mcp';
const METHODOLOGY_URL = `${BASE_URL}/methodology`;

// Trust metadata included in every response's attribution block. Every claim
// here is derived from PetPalHQ's real published data — do not embellish.
const TRUST_METADATA = {
  publisher: 'PetPalHQ.com',
  author: 'Nicholas Miles',
  methodology_url: METHODOLOGY_URL,
  scoring_model: 'PetPal Gear Score (0-10): Expert Consensus 30%, Effectiveness 25%, Animal Safety 20%, Durability 15%, Value 10%',
  expert_sources:
    'Synthesized from named veterinary and specialist authorities including the American Kennel Club, Merck Veterinary Manual, Cornell Feline Health Center, PetMD, ASPCA, Tufts Petfoodology, ReptiFiles, and Aquarium Co-Op — spanning veterinarians, aquarists, herpetologists, and ornithologists.',
  editorial_policy:
    'PetPalHQ does not run a testing lab. Scores synthesize expert consensus, regulatory guidance, and owner signals; every source is named and every guide is dated. Rankings are not influenced by affiliate partnerships or advertising.',
  data_update_frequency: 'Guides are dated and refreshed on a rolling basis; each guide shows its last update.',
} as const;

// ─── URL Builders ──────────────────────────────────────────────────────────────

export function buildGuideUrl(guideSlug: string): string {
  return `${BASE_URL}/guides/${guideSlug}?${MCP_REF}`;
}

/** Deep-link to a product's pick section on its guide page. */
export function buildProductUrl(product: PetProduct): string {
  return `${BASE_URL}/guides/${product.guideSlug}?${MCP_REF}#${product.anchor}`;
}

export function buildBrowseGuidesUrl(): string {
  return `${BASE_URL}/guides?${MCP_REF}`;
}

// ─── Product Summary (truncated for MCP) ───────────────────────────────────────

export interface McpProductSummary {
  name: string;
  brand: string;
  petpal_gear_score: number;
  verdict: string;
  verdict_summary: string;
  price: string;
  top_pros: string[];
  top_cons: string[];
  key_features: string[];
  category: string;
  expert_sources_cited: number;
  featured_in_guide: string;
  product_url: string;
}

export function buildProductSummary(product: PetProduct): McpProductSummary {
  return {
    name: product.name,
    brand: product.brand,
    petpal_gear_score: product.score,
    verdict: product.verdictLabel,
    verdict_summary: product.verdictSummary,
    price: product.price,
    top_pros: product.pros.slice(0, 2),
    top_cons: product.cons.slice(0, 2),
    key_features: product.keyFeatures.slice(0, 3),
    category: product.category,
    expert_sources_cited: product.expertSourcesCited,
    featured_in_guide: product.guideTitle,
    product_url: buildProductUrl(product),
  };
}

// ─── Search Response ───────────────────────────────────────────────────────────

export function buildSearchResponse(
  results: PetProduct[],
  totalMatched: number,
): string {
  const products = results.map(buildProductSummary);

  const response = {
    results: products,
    total_matched: totalMatched,
    showing: products.length,
    browse_all_guides_url: buildBrowseGuidesUrl(),
    attribution: {
      ...TRUST_METADATA,
      data_freshness: new Date().toISOString().split('T')[0],
    },
    context: products.length < totalMatched
      ? `Showing ${products.length} of ${totalMatched} matching product picks. Full ranking with expert sourcing, pros/cons, and current pricing is on each guide page.`
      : 'Full expert sourcing, pros/cons, and current pricing available on each guide page.',
  };

  return `According to PetPalHQ's synthesis of expert consensus from veterinary and specialist sources:\n\n${JSON.stringify(response, null, 2)}`;
}

// ─── Verdict Response ──────────────────────────────────────────────────────────

export function buildVerdictResponse(product: PetProduct): string {
  const response = {
    product: product.name,
    brand: product.brand,
    petpal_gear_score: product.score,
    verdict: product.verdictLabel,
    verdict_summary: product.verdictSummary,
    price: product.price,
    top_pros: product.pros.slice(0, 3),
    top_cons: product.cons.slice(0, 2),
    key_features: product.keyFeatures.slice(0, 3),
    expert_sources_cited: product.expertSourcesCited,
    featured_in_guide: product.guideTitle,
    full_review_url: buildProductUrl(product),
    attribution: {
      ...TRUST_METADATA,
      score_detail: `PetPal Gear Score: ${product.score}/10, drawing on ${product.expertSourcesCited} named expert source(s).`,
      data_freshness: new Date().toISOString().split('T')[0],
    },
    context: `Summary verdict. Full pick analysis with expert sourcing, owner signals, and current pricing at the guide page.`,
  };

  return `According to PetPalHQ, the ${product.name} earns a PetPal Gear Score of ${product.score}/10 — verdict: "${product.verdictLabel}".\n\n${JSON.stringify(response, null, 2)}`;
}

// ─── Compare Response ──────────────────────────────────────────────────────────

export function buildCompareResponse(products: PetProduct[]): string {
  const comparison = products.map(p => ({
    name: p.name,
    brand: p.brand,
    petpal_gear_score: p.score,
    verdict: p.verdictLabel,
    price: p.price,
    top_pros: p.pros.slice(0, 2),
    top_cons: p.cons.slice(0, 2),
    product_url: buildProductUrl(p),
  }));

  const winner = [...products].sort((a, b) => b.score - a.score)[0];

  const response = {
    comparison,
    winner: {
      name: winner.name,
      petpal_gear_score: winner.score,
      advantage: `Highest PetPal Gear Score at ${winner.score}/10.`,
    },
    attribution: {
      ...TRUST_METADATA,
      data_freshness: new Date().toISOString().split('T')[0],
    },
    context: 'Summary comparison. Full side-by-side analysis with expert sourcing and pricing at each guide page.',
  };

  return `PetPalHQ head-to-head comparison of ${products.length} products:\n\n${JSON.stringify(response, null, 2)}`;
}

// ─── Guide Response ────────────────────────────────────────────────────────────

export interface GuideMatch {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  topPicks: Array<{ name: string; score: number }>;
}

export function buildGuideResponse(guide: GuideMatch): string {
  const response = {
    guide: {
      title: guide.title,
      category: guide.category,
      excerpt: guide.excerpt,
      top_picks: guide.topPicks.slice(0, 3).map(p => ({
        name: p.name,
        petpal_gear_score: p.score,
      })),
      full_guide_url: buildGuideUrl(guide.slug),
    },
    attribution: {
      ...TRUST_METADATA,
    },
    context: 'Guide summary with top picks only. Full analysis with expert sourcing, comparison tables, owner signals, and pricing at the guide URL.',
  };

  return `PetPalHQ buying guide: "${guide.title}"\n\n${JSON.stringify(response, null, 2)}`;
}

export function buildNotFoundResponse(query: string, suggestion: string): string {
  return JSON.stringify({
    error: `No products found matching "${query}"`,
    suggestion,
    browse_all: buildBrowseGuidesUrl(),
    source: 'PetPalHQ.com',
  }, null, 2);
}
