import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();
export const GUIDES_DIR = path.join(ROOT, 'src/content/guides');
export const DATA_GUIDES_PATH = path.join(ROOT, 'src/data/guides.ts');
export const PRODUCTS_PATH = path.join(ROOT, 'src/data/products.ts');
export const SITE_CONFIG_PATH = path.join(ROOT, 'src/config/site.ts');

export function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function listMarkdownGuides() {
  if (!fs.existsSync(GUIDES_DIR)) return [];
  return fs
    .readdirSync(GUIDES_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const fullPath = path.join(GUIDES_DIR, file);
      const raw = readText(fullPath);
      const { frontmatter, body } = parseFrontmatter(raw);
      return {
        slug,
        file,
        path: path.relative(ROOT, fullPath),
        frontmatter,
        body,
        wordCount: countWords(body),
        isStub: /under development|check back soon/i.test(body),
        hasFaqHeading: /##\s+Frequently Asked Questions/i.test(body),
        affiliateLinkCount: countMatches(raw, /https?:\/\/(?:www\.)?amazon\.com\/[^\s)"']+/gi),
      };
    });
}

export function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { frontmatter: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: {}, body: raw };

  const block = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trimStart();
  const frontmatter = {};

  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    frontmatter[key] = stripQuotes(value.trim());
  }

  return { frontmatter, body };
}

export function getConfiguredCategories() {
  if (!fs.existsSync(SITE_CONFIG_PATH)) return [];
  const text = readText(SITE_CONFIG_PATH);
  const categories = [];
  const objectRegex = /\{\s*id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?slug:\s*"([^"]+)"/g;
  let match;
  while ((match = objectRegex.exec(text))) {
    categories.push({ id: match[1], name: match[2], slug: match[3] });
  }
  return categories;
}

export function getConfiguredCategoryAliases() {
  if (!fs.existsSync(SITE_CONFIG_PATH)) return {};
  const text = readText(SITE_CONFIG_PATH);
  const aliasBlock = text.match(/export const categoryAliases[^=]*=\s*\{([\s\S]*?)\}\s*as const;/);
  if (!aliasBlock) return {};

  const aliases = {};
  const pairRegex = /["']([^"']+)["']\s*:\s*["']([^"']+)["']/g;
  let match;
  while ((match = pairRegex.exec(aliasBlock[1]))) {
    aliases[match[1].toLowerCase()] = match[2].toLowerCase();
  }
  return aliases;
}

export function buildCategoryKeySet(configuredCategories = getConfiguredCategories()) {
  const aliases = getConfiguredCategoryAliases();
  return new Set([
    ...configuredCategories.flatMap((cat) => [
      cat.id.toLowerCase(),
      cat.slug.toLowerCase(),
      cat.name.toLowerCase(),
    ]),
    ...Object.keys(aliases),
    ...Object.values(aliases),
  ]);
}

export function getDataGuideSlugs() {
  if (!fs.existsSync(DATA_GUIDES_PATH)) return [];
  const text = readText(DATA_GUIDES_PATH);
  return unique([...text.matchAll(/slug:\s*['"]([^'"]+)['"]/g)].map((match) => match[1])).sort();
}

export function getProductRecords() {
  if (!fs.existsSync(PRODUCTS_PATH)) return [];
  const text = readText(PRODUCTS_PATH);
  const records = [];
  const objectBlocks = text.match(/\{\s*slug:\s*["'][\s\S]*?\n\s*\}/g) ?? [];

  for (const block of objectBlocks) {
    const record = {
      slug: firstString(block, 'slug'),
      title: firstString(block, 'title'),
      category: firstString(block, 'category'),
      amazonLink: firstString(block, 'amazonLink'),
      asin: firstString(block, 'asin'),
      price: firstNumber(block, 'price'),
      rating: firstNumber(block, 'rating'),
      reviewCount: firstNumber(block, 'reviewCount'),
      featured: /featured:\s*true/.test(block),
      hasLastVerified: /lastVerified:/.test(block),
    };
    if (record.slug) records.push(record);
  }

  return records.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function buildGuideAudit() {
  const markdownGuides = listMarkdownGuides();
  const legacyGuideDataExists = fs.existsSync(DATA_GUIDES_PATH);
  const dataGuideSlugs = getDataGuideSlugs();
  const configuredCategories = getConfiguredCategories();
  const categoryKeys = buildCategoryKeySet(configuredCategories);

  const markdownSlugs = markdownGuides.map((guide) => guide.slug);
  const markdownSlugSet = new Set(markdownSlugs);
  const dataSlugSet = new Set(dataGuideSlugs);
  const requiredFields = ['title', 'description', 'excerpt', 'category', 'publishDate', 'updatedDate', 'readTime'];

  const guideIssues = markdownGuides.map((guide) => {
    const missingFields = requiredFields.filter((field) => !guide.frontmatter[field]);
    const category = String(guide.frontmatter.category ?? '').toLowerCase();
    const invalidCategory = Boolean(category && !categoryKeys.has(category));
    return {
      slug: guide.slug,
      path: guide.path,
      category: guide.frontmatter.category ?? '',
      wordCount: guide.wordCount,
      isStub: guide.isStub,
      hasMetadataEntry: dataSlugSet.has(guide.slug),
      missingFields,
      invalidCategory,
      hasFaqHeading: guide.hasFaqHeading,
      affiliateLinkCount: guide.affiliateLinkCount,
    };
  });

  return {
    markdownCount: markdownGuides.length,
    legacyGuideDataExists,
    dataGuideCount: dataGuideSlugs.length,
    configuredCategories,
    markdownOnlySlugs: legacyGuideDataExists ? markdownSlugs.filter((slug) => !dataSlugSet.has(slug)).sort() : [],
    dataOnlySlugs: legacyGuideDataExists ? dataGuideSlugs.filter((slug) => !markdownSlugSet.has(slug)).sort() : [],
    stubGuides: guideIssues.filter((guide) => guide.isStub).map((guide) => guide.slug),
    invalidCategoryGuides: guideIssues.filter((guide) => guide.invalidCategory),
    missingFieldGuides: guideIssues.filter((guide) => guide.missingFields.length > 0),
    guideIssues,
  };
}

export function buildProductAudit() {
  const products = getProductRecords();
  const configuredCategories = getConfiguredCategories();
  const categoryKeys = buildCategoryKeySet(configuredCategories);

  const productsMissingAmazonTag = products.filter(
    (product) => product.amazonLink && !/[?&]tag=xmasgearhq-20\b/.test(product.amazonLink),
  );
  const productsMissingFreshness = products.filter((product) => !product.hasLastVerified);
  const invalidCategoryProducts = products.filter(
    (product) => product.category && !categoryKeys.has(product.category.toLowerCase()),
  );

  return {
    productCount: products.length,
    configuredCategories,
    products,
    productsMissingAmazonTag,
    productsMissingFreshness,
    invalidCategoryProducts,
    duplicateAsins: duplicates(products.map((product) => product.asin).filter(Boolean)),
  };
}

export function renderGuideAuditMarkdown(audit) {
  return `# ChristmasGearHQ Current-State Audit

Generated by \`node scripts/audit-guides.mjs --markdown\`.

## Guide inventory
- Markdown guide files: ${audit.markdownCount}
- Legacy \`src/data/guides.ts\`: ${audit.legacyGuideDataExists ? `${audit.dataGuideCount} entries` : 'not present; Markdown is canonical'}
- Markdown guides missing metadata entries: ${audit.markdownOnlySlugs.length}
- Metadata entries missing Markdown files: ${audit.dataOnlySlugs.length}
- Stub / under-development guides: ${audit.stubGuides.length}
- Guides with categories outside \`src/config/site.ts\`: ${audit.invalidCategoryGuides.length}
- Guides with missing required frontmatter: ${audit.missingFieldGuides.length}

## Configured categories
${audit.configuredCategories.map((cat) => `- ${cat.name} (\`${cat.slug}\`)`).join('\n') || '- None found'}

## Markdown-only guides
${audit.markdownOnlySlugs.map((slug) => `- ${slug}`).join('\n') || '- None'}

## Metadata-only guides
${audit.dataOnlySlugs.map((slug) => `- ${slug}`).join('\n') || '- None'}

## Stub / under-development guides
${audit.stubGuides.map((slug) => `- ${slug}`).join('\n') || '- None'}

## Invalid guide categories
${audit.invalidCategoryGuides.map((guide) => `- ${guide.slug}: \`${guide.category}\``).join('\n') || '- None'}

## Missing guide frontmatter
${audit.missingFieldGuides.map((guide) => `- ${guide.slug}: ${guide.missingFields.join(', ')}`).join('\n') || '- None'}

## Known strategic implications
- The site needs a single guide source of truth before RSS, sitemap, search, and guide templates can be trusted.
- The category model does not reflect the full content inventory and should be redesigned before broad template work.
- Stub guides should not be treated as refreshed flagship content until rewritten.
`;
}

export function renderProductAuditMarkdown(audit) {
  return `# ChristmasGearHQ Product Audit

Generated by \`node scripts/audit-products.mjs --markdown\`.

## Product inventory
- Product entries: ${audit.productCount}
- Products missing Amazon tag \`xmasgearhq-20\`: ${audit.productsMissingAmazonTag.length}
- Products missing \`lastVerified\`: ${audit.productsMissingFreshness.length}
- Products with categories outside \`src/config/site.ts\`: ${audit.invalidCategoryProducts.length}
- Duplicate ASINs: ${audit.duplicateAsins.length}

## Invalid product categories
${audit.invalidCategoryProducts.map((product) => `- ${product.slug}: \`${product.category}\``).join('\n') || '- None'}

## Products missing freshness metadata
${audit.productsMissingFreshness.map((product) => `- ${product.slug}`).join('\n') || '- None'}

## Products missing canonical Amazon tag
${audit.productsMissingAmazonTag.map((product) => `- ${product.slug}: ${product.amazonLink}`).join('\n') || '- None'}

## Known strategic implications
- Product freshness should be modeled before guide refreshes claim current recommendations.
- Affiliate links should be centralized so sponsored/noopener handling and tracking are consistent.
`;
}

function firstString(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*["']([^"']+)["']`));
  return match?.[1] ?? '';
}

function firstNumber(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*([0-9]+(?:\\.[0-9]+)?)`));
  return match ? Number(match[1]) : undefined;
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '');
}

function countWords(text) {
  const words = text.trim().match(/\b[\w'-]+\b/g);
  return words ? words.length : 0;
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function unique(values) {
  return [...new Set(values)];
}

function duplicates(values) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes].sort();
}
