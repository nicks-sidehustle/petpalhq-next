import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Explicitly welcome AI agents to the MCP server + discovery manifest.
      allow: ['/', '/api/mcp', '/.well-known/'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
