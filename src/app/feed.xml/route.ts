import { siteConfig } from '@/config/site';
import { getAllGuideSummaries } from '@/lib/guides';

export async function GET() {
  const sortedGuides = getAllGuideSummaries()
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, 20);

  const items = sortedGuides.map((guide) => {
    const link = `${siteConfig.url}/guides/${guide.slug}`;
    const pubDate = new Date(guide.publishDate).toUTCString();
    const enclosure = guide.image
      ? `<enclosure url="${escapeXml(guide.image)}" type="image/jpeg" length="0" />`
      : '';

    return `    <item>
      <title>${escapeXml(guide.title)}</title>
      <description>${escapeXml(guide.description)}</description>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(guide.category)}</category>
      ${enclosure}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <description>${escapeXml(siteConfig.description)}</description>
    <link>${siteConfig.url}</link>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
