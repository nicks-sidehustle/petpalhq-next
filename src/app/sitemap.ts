import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { categories } from '@/data/categories';
import { guides } from '@/data/guides';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/reviews`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/affiliate-disclosure`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/our-network`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/author/rachel-cooper`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  const categoryPages = categories.map((cat) => ({
    url: `${baseUrl}/reviews/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const guidePages = guides.map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified: new Date(guide.updatedDate),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  return [...staticPages, ...categoryPages, ...guidePages];
}
