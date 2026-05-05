import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import type { FAQItem } from './schema';
import { categoryAliases } from '@/config/site';

const guidesDirectory = path.join(process.cwd(), 'src/content/guides');

export interface Guide {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  /** Resolved content pillar slug (from frontmatter or category alias) */
  pillar: string;
  publishDate: string;
  updatedDate: string;
  readTime: string;
  featured: boolean;
  image: string;
  content: string;       // raw markdown
  htmlContent: string;   // rendered HTML
  faqItems: FAQItem[];   // extracted from "## Frequently Asked Questions" section
  headings: GuideHeading[];
  /** Product slugs referenced in frontmatter */
  products: string[];
  /** Review methodology declared in frontmatter */
  reviewMethod?: string;
  /** Last date product data was verified */
  lastProductCheck?: string;
  /** Number of expert sources for this guide */
  expertSourceCount?: number;
}

export type GuideSummary = Omit<Guide, 'content' | 'htmlContent' | 'faqItems' | 'headings'>;

export interface GuideHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Extracts FAQ Q&A pairs from a markdown string.
 * Looks for a "## Frequently Asked Questions" heading, then parses
 * bold-formatted questions (**Q: ...**) followed by answer lines (A: ...).
 */
export function extractFAQFromMarkdown(markdown: string): FAQItem[] {
  const faqHeadingMatch = markdown.match(
    /##\s+Frequently Asked Questions\s*\n([\s\S]*?)(?:\n##\s|\s*$)/i
  );
  if (!faqHeadingMatch) return [];

  const faqSection = faqHeadingMatch[1];
  const items: FAQItem[] = [];

  // Match pairs of **Q: ...**\nA: ...
  const pairRegex = /\*\*Q:\s*([\s\S]+?)\*\*\s*\nA:\s*([\s\S]+?)(?=\n\n|\n\*\*Q:|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pairRegex.exec(faqSection)) !== null) {
    items.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }

  return items;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractHeadingsFromMarkdown(markdown: string): GuideHeading[] {
  return [...markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((match) => ({
    level: match[1].length as 2 | 3,
    text: match[2].trim(),
    id: slugifyHeading(match[2].trim()),
  }));
}

/** Resolve a category string to a content pillar slug via aliases */
function resolvePillar(explicitPillar: string | undefined, category: string): string {
  if (explicitPillar) return explicitPillar;
  const key = category.toLowerCase() as keyof typeof categoryAliases;
  return (categoryAliases as Record<string, string>)[key] || 'uncategorized';
}

function parseDate(dateStr: string): Date {
  // Handle "2026-02-08" format
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function frontmatterString(value: unknown, fallback = ''): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export function getAllGuides(): Guide[] {
  if (!fs.existsSync(guidesDirectory)) return [];
  
  const files = fs.readdirSync(guidesDirectory).filter(f => f.endsWith('.md'));
  
  const guides = files.map(filename => {
    const slug = filename.replace(/\.md$/, '');
    const filePath = path.join(guidesDirectory, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    
    const category = frontmatterString(data.category, 'Uncategorized');
    return {
      slug,
      title: frontmatterString(data.title, slug),
      description: frontmatterString(data.description),
      excerpt: frontmatterString(data.excerpt),
      category,
      pillar: resolvePillar(data.pillar, category),
      publishDate: frontmatterString(data.publishDate),
      updatedDate: frontmatterString(data.updatedDate, frontmatterString(data.publishDate)),
      readTime: frontmatterString(data.readTime),
      featured: data.featured || false,
      image: frontmatterString(data.image),
      content,
      htmlContent: marked(content) as string,
      faqItems: extractFAQFromMarkdown(content),
      headings: extractHeadingsFromMarkdown(content),
      products: Array.isArray(data.products) ? data.products : [],
      reviewMethod: data.reviewMethod,
      lastProductCheck: frontmatterString(data.lastProductCheck) || undefined,
      expertSourceCount: typeof data.expertSourceCount === 'number' ? data.expertSourceCount : undefined,
    };
  });

  // Sort by date, newest first
  guides.sort((a, b) => parseDate(b.publishDate).getTime() - parseDate(a.publishDate).getTime());

  return guides;
}

export function getAllGuideSummaries(): GuideSummary[] {
  return getAllGuides().map((guide) => ({
    slug: guide.slug,
    title: guide.title,
    description: guide.description,
    excerpt: guide.excerpt,
    category: guide.category,
    pillar: guide.pillar,
    publishDate: guide.publishDate,
    updatedDate: guide.updatedDate,
    readTime: guide.readTime,
    featured: guide.featured,
    image: guide.image,
    products: guide.products,
    reviewMethod: guide.reviewMethod,
    lastProductCheck: guide.lastProductCheck,
    expertSourceCount: guide.expertSourceCount,
  }));
}

export function getGuidesByPillar(pillarSlug: string): Guide[] {
  return getAllGuides().filter(guide => guide.pillar === pillarSlug);
}

export function getGuideBySlug(slug: string): Guide | null {
  const filePath = path.join(guidesDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);
  
  const category = frontmatterString(data.category, 'Uncategorized');
  return {
    slug,
    title: frontmatterString(data.title, slug),
    description: frontmatterString(data.description),
    excerpt: frontmatterString(data.excerpt),
    category,
    pillar: resolvePillar(data.pillar, category),
    publishDate: frontmatterString(data.publishDate),
    updatedDate: frontmatterString(data.updatedDate, frontmatterString(data.publishDate)),
    readTime: frontmatterString(data.readTime),
    featured: data.featured || false,
    image: frontmatterString(data.image),
    content,
    htmlContent: marked(content) as string,
    faqItems: extractFAQFromMarkdown(content),
    headings: extractHeadingsFromMarkdown(content),
    products: Array.isArray(data.products) ? data.products : [],
    reviewMethod: data.reviewMethod,
    lastProductCheck: frontmatterString(data.lastProductCheck) || undefined,
    expertSourceCount: typeof data.expertSourceCount === 'number' ? data.expertSourceCount : undefined,
  };
}

export function getFeaturedGuides(limit?: number): Guide[] {
  const allGuides = getAllGuides();
  const featured = allGuides.filter(guide => guide.featured);
  return limit ? featured.slice(0, limit) : featured;
}

export function getGuidesByCategory(category: string): Guide[] {
  const allGuides = getAllGuides();
  return allGuides.filter(guide => guide.category.toLowerCase() === category.toLowerCase());
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(guidesDirectory)) return [];
  return fs.readdirSync(guidesDirectory)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}
