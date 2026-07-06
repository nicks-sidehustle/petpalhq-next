import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Explicitly welcome AI agents to the MCP server + discovery manifest.
      allow: ['/', '/api/mcp', '/.well-known/'],
      // Interaction-gated affiliate redirects (DG-2). Crawlers must NOT follow
      // /go/{id} links — they exist only to 302 real human clicks to Amazon.
      // Blocking them here is what stops bots from generating phantom affiliate
      // clicks by following bare hrefs (see DG0-DIAGNOSIS H5).
      disallow: ['/go/'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
