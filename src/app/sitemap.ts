import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { getAllGuides, getAllGuideSummaries } from '@/lib/guides';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  // Static pages — canonical URLs only.
  // /reviews redirects to /guides; the legacy /reviews/[category] routes
  // were removed (they 404 now), so neither is emitted here.
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/methodology`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/author/nick-miles`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/affiliate-disclosure`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
  ];

  // Guide pages — one entry per guide (hubs and spokes)
  const guidePages = getAllGuideSummaries().map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified: new Date(guide.updatedDate),
    changeFrequency: 'monthly' as const,
    priority: guide.guideType === 'hub' ? 0.85 : 0.8,
  }));

  // Score methodology pages — one per guide with methodology data.
  // lastModified tracks the guide's updatedDate (same value as its own entry);
  // /scores uses the newest guide updatedDate.
  const newestUpdated = getAllGuides().reduce(
    (max, g) => (g.updatedDate > max ? g.updatedDate : max),
    '',
  );
  const scoreIndexPage = [
    {
      url: `${baseUrl}/scores`,
      lastModified: new Date(newestUpdated),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ];
  const metricPages = getAllGuides()
    .filter((g) => g.methodology)
    .map((g) => ({
      url: `${baseUrl}/metrics/${g.slug}-score`,
      lastModified: new Date(g.updatedDate),
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    }));

  return [...staticPages, ...guidePages, ...scoreIndexPage, ...metricPages];
}
