#!/usr/bin/env node
import { buildGuideAudit, buildProductAudit } from './lib/content-audit.mjs';

const guideAudit = buildGuideAudit();
const productAudit = buildProductAudit();

const errors = [];
const warnings = [];

for (const guide of guideAudit.missingFieldGuides) {
  errors.push(`${guide.path}: missing required frontmatter: ${guide.missingFields.join(', ')}`);
}

for (const guide of guideAudit.invalidCategoryGuides) {
  errors.push(`${guide.path}: category "${guide.category}" is not defined in src/config/site.ts`);
}

if (process.argv.includes('--legacy-guides') && guideAudit.legacyGuideDataExists) {
  for (const slug of guideAudit.dataOnlySlugs) {
    warnings.push(`legacy src/data/guides.ts references "${slug}" but src/content/guides/${slug}.md does not exist`);
  }

  for (const slug of guideAudit.markdownOnlySlugs) {
    warnings.push(`src/content/guides/${slug}.md is not represented in src/data/guides.ts`);
  }
}

for (const slug of guideAudit.stubGuides) {
  warnings.push(`src/content/guides/${slug}.md appears to be a stub/under-development guide`);
}

for (const product of productAudit.invalidCategoryProducts) {
  errors.push(`src/data/products.ts product "${product.slug}" uses unknown category "${product.category}"`);
}

for (const product of productAudit.productsMissingAmazonTag) {
  errors.push(`src/data/products.ts product "${product.slug}" Amazon link is missing tag=xmasgearhq-20`);
}

for (const product of productAudit.productsMissingFreshness) {
  warnings.push(`src/data/products.ts product "${product.slug}" is missing lastVerified freshness metadata`);
}

for (const asin of productAudit.duplicateAsins) {
  warnings.push(`src/data/products.ts has duplicate ASIN "${asin}"`);
}

console.log(`Content validation checked ${guideAudit.markdownCount} Markdown guides, ${guideAudit.dataGuideCount} guide metadata entries, and ${productAudit.productCount} products.`);

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error('\nErrors:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('\nContent validation passed.');
