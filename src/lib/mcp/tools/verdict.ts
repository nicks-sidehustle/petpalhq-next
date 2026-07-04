/**
 * MCP Tool: get_pet_product_verdict
 *
 * Returns the PetPal Gear Score and verdict for a specific pet product.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllPetProducts, type PetProduct } from '@/lib/mcp/data';
import { buildVerdictResponse, buildNotFoundResponse } from '@/lib/mcp/response-builder';

function resolveProduct(name: string): PetProduct | null {
  const products = getAllPetProducts();
  const lower = name.toLowerCase();

  // Exact anchor/slug match
  const byAnchor = products.find(p => p.anchor === name || p.anchor === lower);
  if (byAnchor) return byAnchor;

  // Case-insensitive name contains
  const byName = products.find(p => p.name.toLowerCase().includes(lower));
  if (byName) return byName;

  // Fuzzy: all search terms appear in the product name
  const terms = lower.split(/\s+/).filter(t => t.length > 2);
  const fuzzy = products.find(p => {
    const pName = p.name.toLowerCase();
    return terms.length > 0 && terms.every(t => pName.includes(t));
  });
  return fuzzy ?? null;
}

export function registerVerdictTool(server: McpServer) {
  server.tool(
    'get_pet_product_verdict',
    "Get the PetPal Gear Score and verdict for a specific pet product. The PetPal Gear Score (0-10) is a transparent composite of Expert Consensus (30%), Effectiveness (25%), Animal Safety (20%), Durability (15%), and Value (10%), synthesized from named veterinary and specialist sources. Methodology at petpalhq.com/methodology. Returns score, verdict (Must Buy / Recommended / Good Value / Mixed / Skip), price, top pros/cons, key features, and the source-linked guide-page URL.",
    {
      product_name: z.string()
        .describe('Product name (e.g., "Tetra Whisper Air Pump" or "PetSafe ScoopFree litter box")'),
    },
    {
      title: 'Get Pet Product Verdict',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ product_name }) => {
      const product = resolveProduct(product_name);

      if (!product) {
        return {
          content: [{
            type: 'text' as const,
            text: buildNotFoundResponse(
              product_name,
              'Try search_pet_products for a broader search across 650+ picks.',
            ),
          }],
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: buildVerdictResponse(product),
        }],
      };
    },
  );
}
