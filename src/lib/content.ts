import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { getCreatorsAPIClient } from './creators-api';

const guidesDirectory = path.join(process.cwd(), 'src/content/guides');

// Simple in-memory cache for API pricing (TTL: 1 hour)
const pricingCache = new Map<string, { price: string; timestamp: number }>();
const PRICING_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Inject live pricing from Amazon Creators API into guide markdown.
 * Matches the pattern: **ASIN: BXXXXXXXXXX | Price: ~$XX.XX**
 * Replaces static prices with live API prices when available.
 */
async function injectLivePricing(content: string): Promise<string> {
  const asinPricePattern = /\*\*ASIN:\s+(B[A-Z0-9]{9,})\s*\|\s*Price:\s*~?\$[\d,.]+\*\*/g;
  const matches = [...content.matchAll(asinPricePattern)];

  if (matches.length === 0) return content;

  const client = getCreatorsAPIClient();
  let updated = content;

  for (const match of matches) {
    const asin = match[1];
    try {
      // Check cache first
      const cached = pricingCache.get(asin);
      let price: string;

      if (cached && Date.now() - cached.timestamp < PRICING_CACHE_TTL) {
        price = cached.price;
      } else {
        const offer = await client.getProductPricing(asin);
        price = offer.price;
        pricingCache.set(asin, { price, timestamp: Date.now() });
      }

      if (price !== '$0.00') {
        updated = updated.replace(match[0], `**ASIN: ${asin} | Price: ${price}**`);
      }
    } catch {
      // Keep static price on API failure
    }
  }

  return updated;
}

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Three-tier product pick for Loyal & Found value framework */
export interface TierPick {
  name: string;
  price: string;
  asin: string;
  subtitle: string;
  description: string;
  tradeOff: string;
}

/** Three-tier structure: budget / sweetSpot / splurge */
export interface GuideTiers {
  budget: TierPick;
  sweetSpot: TierPick;
  splurge: TierPick;
}

/** Products that were considered but not selected */
export interface PassedProduct {
  name: string;
  reason: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  collection: string;
  publishDate: string;
  updatedDate: string;
  readTime: string;
  featured: boolean;
  image: string;
  products?: string[];
  tiers?: GuideTiers;
  passedOn?: PassedProduct[];
  sources?: string[];
  sourceCount?: number;
  researchHours?: number;
  faq?: Array<{ question: string; answer: string }>;
  editorialIntro?: string;
  content: string;       // raw markdown
  htmlContent: string;   // rendered HTML with heading IDs
  headings: Heading[];   // extracted for TOC
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Inject slug-based id attributes into h2/h3 elements and extract
 * a headings list for TOC rendering.
 */
function processHeadings(htmlStr: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const processed = htmlStr.replace(
    /<(h[23])>(.*?)<\/\1>/g,
    (_match, tag: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim();
      const id = slugify(text);
      const level = (tag === 'h2' ? 2 : 3) as 2 | 3;
      headings.push({ id, text, level });
      return `<${tag} id="${id}">${inner}</${tag}>`;
    }
  );
  return { html: processed, headings };
}

async function markdownToHtml(content: string): Promise<{ html: string; headings: Heading[] }> {
  const result = await remark().use(html).process(content);
  return processHeadings(result.toString());
}

function parseDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export async function getAllGuides(): Promise<Guide[]> {
  if (!fs.existsSync(guidesDirectory)) return [];

  const files = fs.readdirSync(guidesDirectory).filter((f) => f.endsWith('.md'));

  const guides = await Promise.all(
    files.map(async (filename) => {
      const slug = filename.replace(/\.md$/, '');
      const filePath = path.join(guidesDirectory, filename);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);

      const { html: htmlContent, headings } = await markdownToHtml(content);
      return {
        slug,
        title: data.title || slug,
        description: data.description || '',
        excerpt: data.excerpt || '',
        category: data.category || 'Uncategorized',
        collection: data.collection || '',
        publishDate: data.publishDate || '',
        updatedDate: data.updatedDate || data.publishDate || '',
        readTime: data.readTime || '',
        featured: data.featured || false,
        image: data.image || '',
        products: data.products || [],
        tiers: data.tiers || undefined,
        passedOn: data.passedOn || undefined,
        sources: data.sources || undefined,
        sourceCount: data.sourceCount || undefined,
        researchHours: data.researchHours || undefined,
        faq: data.faq || undefined,
        editorialIntro: data.editorialIntro || undefined,
        content,
        htmlContent,
        headings,
      };
    })
  );

  guides.sort((a, b) => parseDate(b.publishDate).getTime() - parseDate(a.publishDate).getTime());

  return guides;
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  const filePath = path.join(guidesDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  // Inject live pricing from Amazon Creators API when credentials are available
  const pricedContent = await injectLivePricing(content);
  const { html: htmlContent, headings } = await markdownToHtml(pricedContent);

  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    excerpt: data.excerpt || '',
    category: data.category || 'Uncategorized',
    collection: data.collection || '',
    publishDate: data.publishDate || '',
    updatedDate: data.updatedDate || data.publishDate || '',
    readTime: data.readTime || '',
    featured: data.featured || false,
    image: data.image || '',
    products: data.products || [],
    tiers: data.tiers || undefined,
    passedOn: data.passedOn || undefined,
    sources: data.sources || undefined,
    sourceCount: data.sourceCount || undefined,
    researchHours: data.researchHours || undefined,
    faq: data.faq || undefined,
    editorialIntro: data.editorialIntro || undefined,
    content: pricedContent,
    htmlContent,
    headings,
  };
}

export async function getFeaturedGuides(limit?: number): Promise<Guide[]> {
  const allGuides = await getAllGuides();
  const featured = allGuides.filter((guide) => guide.featured);
  return limit ? featured.slice(0, limit) : featured;
}

export async function getGuidesByCategory(category: string): Promise<Guide[]> {
  const allGuides = await getAllGuides();
  return allGuides.filter(
    (guide) => guide.category.toLowerCase() === category.toLowerCase()
  );
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(guidesDirectory)) return [];
  return fs
    .readdirSync(guidesDirectory)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

/** Extract FAQ items from markdown — looks for ## FAQ or ## Frequently Asked Questions sections */
export function extractFAQFromMarkdown(content: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  const faqSectionMatch = content.match(/##\s+(?:FAQ|Frequently Asked Questions)([\s\S]*?)(?=\n##\s|\n$|$)/i);
  if (!faqSectionMatch) return faqs;

  const faqSection = faqSectionMatch[1];
  const questionPattern = /###\s+(.+?)\n([\s\S]*?)(?=\n###\s|\n##\s|$)/g;
  let match;
  while ((match = questionPattern.exec(faqSection)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim().replace(/\n+/g, ' ');
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }

  return faqs;
}
