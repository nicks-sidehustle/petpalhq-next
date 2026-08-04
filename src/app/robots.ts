import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Explicitly welcome AI agents to the MCP server + discovery manifest.
        allow: ['/', '/api/mcp', '/.well-known/'],
        // Interaction-gated affiliate redirects (DG-2). Crawlers must NOT follow
        // /go/{id} links — they exist only to 302 real human clicks to Amazon.
        // Blocking them here is what stops bots from generating phantom affiliate
        // clicks by following bare hrefs (see DG0-DIAGNOSIS H5).
        disallow: ['/go/'],
      },
      {
        // Bandwidth-wasting low-value SEO-tool crawlers (2026-07-30 data-transfer
        // overage remediation). Never add AI-assistant/citation bots here
        // (GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, ClaudeBot,
        // Claude-User, anthropic-ai, cohere-ai, CCBot, Amazonbot,
        // Applebot-Extended, Google-Extended, Googlebot, Bingbot) — those must
        // stay fully allowed via the '*' rule above.
        userAgent: [
          'AhrefsBot',
          'SemrushBot',
          'MJ12bot',
          'DotBot',
          'BLEXBot',
          'DataForSeoBot',
          'PetalBot',
        ],
        disallow: ['/'],
      },
      // AI crawlers — explicitly allowed, including llms.txt (parity w/ SHE/dormgear).
      // Grouped as ONE rule (not one per bot) with a disallow list that MIRRORS the
      // wildcard group's disallow above: per RFC 9309 group selection, a crawler
      // matching its own product token (e.g. "GPTBot") uses ONLY that group and
      // never falls back to the '*' group — a bare per-bot `allow: '/'` with no
      // disallow silently reopened /go/ (the anti-phantom-affiliate-click control)
      // to these 9 bots. Reviewed finding, 2026-08-03.
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'Claude-User',
          'Googlebot',
          'Bingbot',
          'Bravbot',
        ],
        allow: '/',
        disallow: ['/go/'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
