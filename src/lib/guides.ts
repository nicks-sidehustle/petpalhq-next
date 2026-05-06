import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import type { FAQItem } from './schema';
import { categoryAliases } from '@/config/site';

const guidesDirectory = path.join(process.cwd(), 'src/content/guides');

// New richly-typed frontmatter sections

export interface GuideTopPick {
  name: string;
  keyFeature: string;
  sources: string[];
  verifiedDate?: string;
}

export interface GuidePick {
  rank: number;
  label: string;
  name: string;
  brand: string;
  score: number;
  price: string;
  image: string;
  asin?: string;
  reviewSlug?: string;
  keyFeatures: string[];
  body: string;
  bodyHtml: string;
  pros: string[];
  cons: string[];
  verdict: string;
  verdictHtml?: string;
}

export interface GuideComparisonRow {
  label: string;
  values: string[];
}

export interface GuideComparison {
  rows: GuideComparisonRow[];
}

export interface GuideMethodologyFactor {
  name: string;
  weight: number;
  definition: string;
}

export interface GuideMethodology {
  formula?: string;
  factors?: GuideMethodologyFactor[];
}

export interface GuideEcosystemTable {
  columns: string[];
  rows: { product: string; values: string[] }[];
}

export interface GuideEcosystemSection {
  narrative: string;
  narrativeHtml: string;
  table?: GuideEcosystemTable;
}

export interface GuideSources {
  expert?: string[];
  community?: string[];
  verifiedDate?: string;
  authorBio?: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  pillar: string;
  publishDate: string;
  updatedDate: string;
  readTime: string;
  featured: boolean;
  image: string;
  content: string;
  htmlContent: string;
  faqItems: FAQItem[];
  headings: GuideHeading[];
  products: string[];
  reviewMethod?: string;
  lastProductCheck?: string;
  expertSourceCount?: number;

  heroImage?: string;
  shortAnswer?: string;
  topPicks?: GuideTopPick[];
  picks?: GuidePick[];
  comparison?: GuideComparison;
  methodology?: GuideMethodology;
  ecosystemSection?: GuideEcosystemSection;
  whenNotToBuy?: string;
  whenNotToBuyHtml?: string;
  bottomLine?: string[];
  bottomLineHtml?: string[];
  sources?: GuideSources;
  related?: string[];

  // Hub-and-spoke architecture
  hub?: string;
  guideType?: 'hub' | 'spoke';
  spokes?: string[];

  // Species sub-axis for Cats & Dogs guides only.
  // Aquarium / Reptile / Bird guides leave this undefined.
  species?: ('dog' | 'cat')[];
  speciesPrimary?: 'dog' | 'cat';
  sectionAnchors?: { forDogs?: string; forCats?: string };

  // Per-species editorial guidance for dual-species spokes. Markdown source
  // lives in frontmatter so the page template can render it (body markdown is
  // not rendered). Auto-affiliate-link injector runs over both fields at
  // parse time so pick mentions become Amazon links.
  forDogs?: string;
  forDogsHtml?: string;
  forCats?: string;
  forCatsHtml?: string;
}

export type GuideSummary = Omit<
  Guide,
  | 'content'
  | 'htmlContent'
  | 'faqItems'
  | 'headings'
  | 'topPicks'
  | 'picks'
  | 'comparison'
  | 'methodology'
  | 'ecosystemSection'
  | 'whenNotToBuy'
  | 'whenNotToBuyHtml'
  | 'bottomLine'
  | 'sources'
  | 'related'
>;

export interface GuideHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export function extractFAQFromMarkdown(markdown: string): FAQItem[] {
  const faqHeadingMatch = markdown.match(
    /##\s+Frequently Asked Questions\s*\n([\s\S]*?)(?:\n##\s|\s*$)/i
  );
  if (!faqHeadingMatch) return [];

  const faqSection = faqHeadingMatch[1];
  const items: FAQItem[] = [];

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

function resolvePillar(explicitPillar: string | undefined, category: string): string {
  if (explicitPillar) return explicitPillar;
  const key = category.toLowerCase() as keyof typeof categoryAliases;
  return (categoryAliases as Record<string, string>)[key] || 'uncategorized';
}

function parseDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function frontmatterString(value: unknown, fallback = ''): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => frontmatterString(v)).filter(Boolean);
}

function parseTopPicks(value: unknown): GuideTopPick[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: GuideTopPick[] = value
    .map((entry: Record<string, unknown>) => ({
      name: frontmatterString(entry?.name),
      keyFeature: frontmatterString(entry?.keyFeature),
      sources: asStringArray(entry?.sources),
      verifiedDate: frontmatterString(entry?.verifiedDate) || undefined,
    }))
    .filter((p) => p.name);
  return out.length ? out : undefined;
}

function parsePicks(value: unknown): GuidePick[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: GuidePick[] = value
    .map((entry: Record<string, unknown>) => {
      const body = frontmatterString(entry?.body);
      return {
        rank: typeof entry?.rank === 'number' ? entry.rank : 0,
        label: frontmatterString(entry?.label),
        name: frontmatterString(entry?.name),
        brand: frontmatterString(entry?.brand),
        score: typeof entry?.score === 'number' ? entry.score : 0,
        price: frontmatterString(entry?.price),
        image: frontmatterString(entry?.image),
        asin: frontmatterString(entry?.asin) || undefined,
        reviewSlug: frontmatterString(entry?.reviewSlug) || undefined,
        keyFeatures: asStringArray(entry?.keyFeatures),
        body,
        bodyHtml: body ? (marked(body) as string) : '',
        pros: asStringArray(entry?.pros),
        cons: asStringArray(entry?.cons),
        verdict: frontmatterString(entry?.verdict),
      };
    })
    .filter((p) => p.name);
  return out.length ? out : undefined;
}

function parseComparison(value: unknown): GuideComparison | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as { rows?: unknown };
  if (!Array.isArray(v.rows)) return undefined;
  const rows: GuideComparisonRow[] = v.rows
    .map((row: Record<string, unknown>) => ({
      label: frontmatterString(row?.label),
      values: asStringArray(row?.values),
    }))
    .filter((r) => r.label);
  return rows.length ? { rows } : undefined;
}

function parseMethodology(value: unknown): GuideMethodology | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as { formula?: unknown; factors?: unknown };
  const factors: GuideMethodologyFactor[] | undefined = Array.isArray(v.factors)
    ? v.factors
        .map((f: Record<string, unknown>) => ({
          name: frontmatterString(f?.name),
          weight: typeof f?.weight === 'number' ? f.weight : 0,
          definition: frontmatterString(f?.definition),
        }))
        .filter((f) => f.name)
    : undefined;
  return {
    formula: frontmatterString(v.formula) || undefined,
    factors: factors && factors.length ? factors : undefined,
  };
}

function parseEcosystem(value: unknown): GuideEcosystemSection | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as { narrative?: unknown; table?: unknown };
  const narrative = frontmatterString(v.narrative);
  if (!narrative) return undefined;
  let table: GuideEcosystemTable | undefined;
  if (v.table && typeof v.table === 'object') {
    const t = v.table as { columns?: unknown; rows?: unknown };
    const columns = asStringArray(t.columns);
    const rows = Array.isArray(t.rows)
      ? t.rows
          .map((r: Record<string, unknown>) => ({
            product: frontmatterString(r?.product),
            values: asStringArray(r?.values),
          }))
          .filter((r) => r.product)
      : [];
    if (columns.length && rows.length) table = { columns, rows };
  }
  return {
    narrative,
    narrativeHtml: marked(narrative) as string,
    table,
  };
}

function parseSources(value: unknown): GuideSources | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const out: GuideSources = {
    expert: asStringArray(v.expert),
    community: asStringArray(v.community),
    verifiedDate: frontmatterString(v.verifiedDate) || undefined,
    authorBio: frontmatterString(v.authorBio) || undefined,
  };
  if (
    !out.expert?.length &&
    !out.community?.length &&
    !out.verifiedDate &&
    !out.authorBio
  ) {
    return undefined;
  }
  return out;
}

function buildPickLinkMap(picks: GuidePick[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!picks) return map;
  for (const p of picks) {
    if (p.name && p.asin) map.set(p.name, buildAmazonUrl(p.asin));
  }
  return map;
}

/**
 * Wraps each occurrence of a pick name in markdown link syntax pointing to its
 * Amazon affiliate URL. Sorts by length desc so longer names match before substrings.
 * Case-insensitive match, original case preserved in output.
 */
function injectAffiliateLinks(text: string, links: Map<string, string>): string {
  if (!text || links.size === 0) return text;
  const entries = [...links.entries()].sort((a, b) => b[0].length - a[0].length);
  const escapedNames = entries.map(([name]) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = new RegExp(`\\b(?:${escapedNames.join('|')})\\b`, 'gi');
  return text.replace(pattern, (match) => {
    const entry = entries.find(([n]) => n.toLowerCase() === match.toLowerCase());
    return entry ? `[${match}](${entry[1]})` : match;
  });
}

function parseGuide(slug: string, fileContents: string): Guide {
  const { data, content } = matter(fileContents);
  const category = frontmatterString(data.category, 'Uncategorized');
  const whenNotToBuy = frontmatterString(data.whenNotToBuy) || undefined;

  // Auto-link product names to Amazon affiliate URLs in pick body, pick verdict, and bottomLine
  const rawPicks = parsePicks(data.picks);
  const linkMap = buildPickLinkMap(rawPicks);
  const picks: GuidePick[] | undefined = rawPicks?.map((p) => {
    const linkedBody = injectAffiliateLinks(p.body, linkMap);
    const linkedVerdict = injectAffiliateLinks(p.verdict, linkMap);
    return {
      ...p,
      bodyHtml: linkedBody ? (marked(linkedBody) as string) : '',
      verdictHtml: linkedVerdict ? (marked.parseInline(linkedVerdict) as string) : undefined,
    };
  });

  const rawBottomLine = Array.isArray(data.bottomLine) ? asStringArray(data.bottomLine) : undefined;
  const bottomLineHtml = rawBottomLine?.map(
    (item) => marked.parseInline(injectAffiliateLinks(item, linkMap)) as string,
  );

  // Per-species sections (markdown). Auto-affiliate-link injection applies the
  // same way it does to pick body and bottomLine — pick names become Amazon
  // affiliate links. Fields are NOT injected on the FAQ or shortAnswer.
  const rawForDogs = frontmatterString(data.forDogs) || undefined;
  const rawForCats = frontmatterString(data.forCats) || undefined;
  const linkedForDogs = rawForDogs ? injectAffiliateLinks(rawForDogs, linkMap) : undefined;
  const linkedForCats = rawForCats ? injectAffiliateLinks(rawForCats, linkMap) : undefined;
  const forDogsHtml = linkedForDogs ? (marked(linkedForDogs) as string) : undefined;
  const forCatsHtml = linkedForCats ? (marked(linkedForCats) as string) : undefined;

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
    expertSourceCount:
      typeof data.expertSourceCount === 'number' ? data.expertSourceCount : undefined,

    heroImage: frontmatterString(data.heroImage) || frontmatterString(data.image) || undefined,
    shortAnswer: frontmatterString(data.shortAnswer) || undefined,
    topPicks: parseTopPicks(data.topPicks),
    picks,
    comparison: parseComparison(data.comparison),
    methodology: parseMethodology(data.methodology),
    ecosystemSection: parseEcosystem(data.ecosystemSection),
    whenNotToBuy,
    whenNotToBuyHtml: whenNotToBuy ? (marked(whenNotToBuy) as string) : undefined,
    bottomLine: rawBottomLine,
    bottomLineHtml,
    sources: parseSources(data.sources),
    related: asStringArray(data.related).length ? asStringArray(data.related) : undefined,

    hub: frontmatterString(data.hub) || undefined,
    guideType:
      data.guideType === 'hub' || data.guideType === 'spoke' ? data.guideType : undefined,
    spokes: asStringArray(data.spokes).length ? asStringArray(data.spokes) : undefined,

    species: (() => {
      const arr = asStringArray(data.species).map((s) => s.toLowerCase());
      const out = arr.filter((s): s is 'dog' | 'cat' => s === 'dog' || s === 'cat');
      return out.length ? out : undefined;
    })(),
    speciesPrimary:
      data.speciesPrimary === 'dog' || data.speciesPrimary === 'cat'
        ? data.speciesPrimary
        : undefined,
    sectionAnchors:
      data.sectionAnchors && typeof data.sectionAnchors === 'object'
        ? {
            forDogs:
              frontmatterString(
                (data.sectionAnchors as Record<string, unknown>).forDogs,
              ) || undefined,
            forCats:
              frontmatterString(
                (data.sectionAnchors as Record<string, unknown>).forCats,
              ) || undefined,
          }
        : undefined,

    forDogs: rawForDogs,
    forDogsHtml,
    forCats: rawForCats,
    forCatsHtml,
  };
}

export function getAllGuides(): Guide[] {
  if (!fs.existsSync(guidesDirectory)) return [];

  const files = fs.readdirSync(guidesDirectory).filter((f) => f.endsWith('.md'));

  const guides = files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const filePath = path.join(guidesDirectory, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return parseGuide(slug, fileContents);
  });

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
    heroImage: guide.heroImage,
    shortAnswer: guide.shortAnswer,
    hub: guide.hub,
    guideType: guide.guideType,
    spokes: guide.spokes,
    species: guide.species,
    speciesPrimary: guide.speciesPrimary,
    sectionAnchors: guide.sectionAnchors,
  }));
}

export function getGuidesByPillar(pillarSlug: string): Guide[] {
  return getAllGuides().filter((guide) => guide.pillar === pillarSlug);
}

export function getGuideBySlug(slug: string): Guide | null {
  const filePath = path.join(guidesDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, 'utf8');
  return parseGuide(slug, fileContents);
}

export function getFeaturedGuides(limit?: number): Guide[] {
  const allGuides = getAllGuides();
  const featured = allGuides.filter((guide) => guide.featured);
  return limit ? featured.slice(0, limit) : featured;
}

export function getGuidesByCategory(category: string): Guide[] {
  const allGuides = getAllGuides();
  return allGuides.filter((guide) => guide.category.toLowerCase() === category.toLowerCase());
}

/**
 * Resolve all spokes for a given hub. Combines explicit `spokes:` frontmatter
 * with reverse lookup (any guide whose `hub` field matches), deduped by slug.
 * Returns guides in the order they appear in `spokes:`, then any reverse-lookup
 * additions in publish-date order. Missing slugs are skipped silently.
 */
export function getSpokesForHub(hubSlug: string): Guide[] {
  const all = getAllGuides();
  const hub = all.find((g) => g.slug === hubSlug);
  const ordered: Guide[] = [];
  const seen = new Set<string>();

  if (hub?.spokes?.length) {
    for (const slug of hub.spokes) {
      const g = all.find((x) => x.slug === slug);
      if (g && !seen.has(g.slug)) {
        ordered.push(g);
        seen.add(g.slug);
      }
    }
  }

  for (const g of all) {
    if (g.hub === hubSlug && !seen.has(g.slug)) {
      ordered.push(g);
      seen.add(g.slug);
    }
  }

  return ordered;
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(guidesDirectory)) return [];
  return fs
    .readdirSync(guidesDirectory)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

/** Canonical Amazon affiliate URL for a given ASIN. */
export function buildAmazonUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=petpalhq08-20`;
}
