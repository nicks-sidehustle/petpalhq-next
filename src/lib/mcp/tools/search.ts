/**
 * MCP Tool: search_pet_products
 *
 * Searches PetPalHQ's product picks by pet category, price, and score.
 * Returns top results with citation-optimized formatting.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { contentPillars } from '@/config/site';
import { getAllPetProducts, type PetProduct } from '@/lib/mcp/data';
import { buildSearchResponse } from '@/lib/mcp/response-builder';

const pillarSlugs = contentPillars.map(p => p.slug);

function parsePrice(priceRange: string): number | null {
  const match = priceRange.match(/\$(\d[\d,]*)/);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ''), 10);
}

export function registerSearchTool(server: McpServer) {
  server.tool(
    'search_pet_products',
    "Search PetPalHQ's library of 650+ expert-researched pet-gear picks across 146 buying guides for dogs, cats, freshwater aquariums, reptiles, and backyard birds. Every pick carries a PetPal Gear Score (0-10) synthesized from named veterinary and specialist authorities (American Kennel Club, Merck Veterinary Manual, Cornell Feline Health Center, PetMD, ASPCA, ReptiFiles, Aquarium Co-Op, and more) with published methodology at petpalhq.com/methodology. Filter by pet category, price, and minimum score. Returns scored recommendations with source-linked guide-page URLs.",
    {
      query: z.string().describe('Natural language search query (e.g., "quiet aquarium air pump" or "orthopedic dog bed for large breeds")'),
      category: z.enum(pillarSlugs as [string, ...string[]]).optional()
        .describe('Content-pillar filter (e.g., "aquarium-filtration", "dog-essentials", "reptile-lighting")'),
      max_price: z.number().int().positive().optional()
        .describe('Maximum price in dollars'),
      min_score: z.number().min(0).max(10).optional()
        .describe('Minimum PetPal Gear Score (0-10)'),
      sort_by: z.enum(['score', 'price']).optional()
        .describe('Sort order (default: score descending)'),
      max_results: z.number().int().min(1).max(3).optional()
        .describe('Maximum results to return (1-3, default 3)'),
    },
    {
      title: 'Search Pet Products',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ query, category, max_price, min_score, sort_by, max_results }) => {
      let results: PetProduct[] = getAllPetProducts();

      if (category) {
        results = results.filter(p => p.pillar === category);
      }

      if (max_price) {
        results = results.filter(p => {
          const price = parsePrice(p.price);
          return price !== null && price <= max_price;
        });
      }

      if (min_score !== undefined) {
        results = results.filter(p => p.score >= min_score);
      }

      if (query) {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
        results = results.filter(p => {
          const searchText = [
            p.name,
            p.brand,
            p.category,
            p.guideTitle,
            ...(p.keyFeatures ?? []),
            ...(p.pros ?? []),
          ].join(' ').toLowerCase();
          return terms.some(t => searchText.includes(t));
        });
      }

      if (sort_by === 'price') {
        results.sort((a, b) => (parsePrice(a.price) ?? 999999) - (parsePrice(b.price) ?? 999999));
      } else {
        results.sort((a, b) => b.score - a.score);
      }

      const totalMatched = results.length;
      const limit = max_results ?? 3;
      results = results.slice(0, limit);

      return {
        content: [{
          type: 'text' as const,
          text: results.length > 0
            ? buildSearchResponse(results, totalMatched)
            : `No products found matching "${query}". Try broadening your search or browse all guides at https://petpalhq.com/guides?ref=mcp`,
        }],
      };
    },
  );
}
