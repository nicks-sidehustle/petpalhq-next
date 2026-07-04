/**
 * MCP Tool: get_pet_buying_guide
 *
 * Matches a user's topic/question to the most relevant PetPalHQ buying guide.
 * Returns guide title, excerpt, top 3 product picks (name + score), and the
 * guide URL. Routes AI-agent traffic to comprehensive editorial pages.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllGuideSummaries, getGuideBySlug } from '@/lib/guides';
import { contentPillars } from '@/config/site';
import { buildGuideResponse, buildNotFoundResponse, type GuideMatch } from '@/lib/mcp/response-builder';

const pillarSlugs = contentPillars.map(p => p.slug);

function scoreGuideRelevance(
  guide: { slug: string; title: string; category: string; pillar: string },
  topic: string,
  pillar?: string,
): number {
  let score = 0;
  const topicLower = topic.toLowerCase();
  const terms = topicLower.split(/\s+/).filter(t => t.length > 2);
  const titleLower = guide.title.toLowerCase();
  const slugLower = guide.slug.toLowerCase();

  if (pillar && guide.pillar === pillar) score += 20;

  for (const term of terms) {
    if (titleLower.includes(term)) score += 10;
    if (slugLower.includes(term)) score += 5;
  }

  if (titleLower.includes(topicLower)) score += 30;

  return score;
}

export function registerGuideTool(server: McpServer) {
  server.tool(
    'get_pet_buying_guide',
    "Get an editorially written buying guide from PetPalHQ's library of 146 guides for dog, cat, aquarium, reptile, and bird owners. Each guide is authored by Nicholas Miles and synthesizes expert consensus from named veterinary and specialist sources with PetPal Gear Score rankings. Returns guide title, top 3 product picks with scores, and the guide URL with the complete analysis (expert sourcing, comparison tables, owner signals, and pricing). Methodology at petpalhq.com/methodology.",
    {
      topic: z.string()
        .describe('What the user needs help with (e.g., "quiet aquarium filter for a betta" or "best litter box for multiple cats")'),
      category: z.enum(pillarSlugs as [string, ...string[]]).optional()
        .describe('Optional content-pillar filter to narrow results'),
    },
    {
      title: 'Get Pet Buying Guide',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ topic, category }) => {
      const guides = getAllGuideSummaries();

      const scored = guides
        .map(g => ({ ...g, relevance: scoreGuideRelevance(g, topic, category) }))
        .filter(g => g.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance);

      if (scored.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: buildNotFoundResponse(
              topic,
              'Try search_pet_products for product-level results, or browse all guides at petpalhq.com/guides',
            ),
          }],
        };
      }

      const bestMatch = scored[0];
      const fullGuide = getGuideBySlug(bestMatch.slug);

      if (!fullGuide) {
        return {
          content: [{
            type: 'text' as const,
            text: buildNotFoundResponse(topic, 'Guide metadata unavailable. Try search_pet_products instead.'),
          }],
        };
      }

      const topPicks = (fullGuide.picks ?? [])
        .map(p => ({ name: p.name, score: p.score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const guideMatch: GuideMatch = {
        title: fullGuide.title,
        slug: bestMatch.slug,
        excerpt: fullGuide.excerpt || fullGuide.description,
        category: fullGuide.category,
        topPicks,
      };

      let text = buildGuideResponse(guideMatch);

      if (scored.length > 1) {
        const alsoRelevant = scored.slice(1, 3).map(g => g.title);
        text += `\n\nAlso relevant: ${alsoRelevant.map(t => `"${t}"`).join(', ')}. Browse all guides at https://petpalhq.com/guides?ref=mcp`;
      }

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );
}
