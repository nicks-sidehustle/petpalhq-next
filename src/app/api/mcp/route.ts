/**
 * PetPalHQ MCP Server
 *
 * Exposes curated pet-gear product intelligence to AI agents via the Model
 * Context Protocol. AI agents query this endpoint to get PetPal Gear Scores,
 * verdicts, product comparisons, and buying-guide recommendations — all with
 * petpalhq.com page URLs for citation.
 *
 * COMPLIANCE: Responses MUST NEVER contain Amazon affiliate URLs. All URLs
 * point to petpalhq.com pages where any affiliate click happens on-site. This
 * is required by Amazon Associates TOS.
 */

import { createMcpHandler } from 'mcp-handler';
import { registerSearchTool } from '@/lib/mcp/tools/search';
import { registerVerdictTool } from '@/lib/mcp/tools/verdict';
import { registerCompareTool } from '@/lib/mcp/tools/compare';
import { registerGuideTool } from '@/lib/mcp/tools/guide';
import { logMcpQuery } from '@/lib/mcp/analytics';

const handler = createMcpHandler(
  (server) => {
    registerSearchTool(server);
    registerVerdictTool(server);
    registerCompareTool(server);
    registerGuideTool(server);
  },
  {
    serverInfo: {
      name: 'PetPalHQ Product Intelligence',
      version: '1.0.0',
    },
  },
  {
    basePath: '/api',
    maxDuration: 30,
    onEvent: (event) => {
      if (event.type === 'REQUEST_COMPLETED' && event.method === 'tools/call') {
        const params = event.parameters as { name?: string; arguments?: Record<string, unknown> } | undefined;
        if (params?.name) {
          const ip = event.sessionId ?? 'unknown';
          logMcpQuery(params.name, params.arguments ?? {}, ip).catch(() => {
            // Analytics failures should never break MCP responses
          });
        }
      }
    },
  },
);

export { handler as GET, handler as POST, handler as DELETE };
