// PetPalHQ Products
// Each product is a verified Amazon SKU with browser-checked ASIN.
// Products are added as content guides ship — empty on initial v2 scaffold.

export interface Product {
  slug: string;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  image: string;
  amazonLink: string;
  asin: string;
  lastVerified: string;
  availabilityStatus: "available" | "unavailable" | "unknown";
  retailer: "amazon";
  overview: string;
  verdict: string;
  pros: string[];
  cons: string[];
  specs: Record<string, string>;
  featured: boolean;
  /** Links to consensus-data.ts entry by slug. Null/undefined until consensus review is written. */
  consensusSlug?: string;
  /** Product tier for premium-first display ordering */
  priceBand?: "premium" | "recommended" | "practical";
}

export const products: Product[] = [];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
