/**
 * MCP Tool: compare_pet_products
 *
 * Side-by-side comparison of 2-4 pet products on PetPal Gear Score, price,
 * and key differentiators. Returns a winner determination.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllPetProducts, type PetProduct } from '@/lib/mcp/data';
import { buildCompareResponse, buildNotFoundResponse } from '@/lib/mcp/response-builder';

function resolveProduct(name: string): PetProduct | null {
  const products = getAllPetProducts();
  const lower = name.toLowerCase();

  return (
    products.find(p => p.anchor === name || p.anchor === lower) ??
    products.find(p => p.name.toLowerCase().includes(lower)) ??
    products.find(p => {
      const terms = lower.split(/\s+/).filter(t => t.length > 2);
      return terms.length > 0 && terms.every(t => p.name.toLowerCase().includes(t));
    }) ??
    null
  );
}

export function registerCompareTool(server: McpServer) {
  server.tool(
    'compare_pet_products',
    "Side-by-side comparison of 2-4 pet products using PetPalHQ's expert-consensus data. Compares PetPal Gear Score, price, and top pros/cons, and returns a data-backed winner determination with source-linked guide-page URLs. Methodology at petpalhq.com/methodology.",
    {
      products: z.array(z.string()).min(2).max(4)
        .describe('Product names to compare (e.g., ["Tetra Whisper Air Pump", "hygger Quiet Air Pump"])'),
    },
    {
      title: 'Compare Pet Products',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ products: productNames }) => {
      const resolved = productNames.map(name => ({ name, product: resolveProduct(name) }));

      const notFound = resolved.filter(r => !r.product);
      if (notFound.length === resolved.length) {
        return {
          content: [{
            type: 'text' as const,
            text: buildNotFoundResponse(
              productNames.join(', '),
              'Try search_pet_products to find correct product names, then compare.',
            ),
          }],
        };
      }

      const found = resolved
        .filter((r): r is { name: string; product: PetProduct } => r.product !== null)
        .map(r => r.product);

      let text = buildCompareResponse(found);

      if (notFound.length > 0) {
        const missing = notFound.map(r => r.name).join(', ');
        text += `\n\nNote: Could not find products: ${missing}. Try search_pet_products to verify product names.`;
      }

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );
}
