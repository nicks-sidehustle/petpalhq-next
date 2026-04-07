import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const guidesDirectory = path.join(process.cwd(), 'src/content/guides');

export interface Guide {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  publishDate: string;
  updatedDate: string;
  readTime: string;
  featured: boolean;
  image: string;
  products?: string[];
  content: string;       // raw markdown
  htmlContent: string;   // rendered HTML
}

async function markdownToHtml(content: string): Promise<string> {
  const result = await remark().use(html).process(content);
  return result.toString();
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

      return {
        slug,
        title: data.title || slug,
        description: data.description || '',
        excerpt: data.excerpt || '',
        category: data.category || 'Uncategorized',
        publishDate: data.publishDate || '',
        updatedDate: data.updatedDate || data.publishDate || '',
        readTime: data.readTime || '',
        featured: data.featured || false,
        image: data.image || '',
        products: data.products || [],
        content,
        htmlContent: await markdownToHtml(content),
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

  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    excerpt: data.excerpt || '',
    category: data.category || 'Uncategorized',
    publishDate: data.publishDate || '',
    updatedDate: data.updatedDate || data.publishDate || '',
    readTime: data.readTime || '',
    featured: data.featured || false,
    image: data.image || '',
    products: data.products || [],
    content,
    htmlContent: await markdownToHtml(content),
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
