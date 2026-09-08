#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { buildGuideAudit, buildProductAudit } from './lib/content-audit.mjs';

/**
 * `listPrice` SHAPE — owner emergency ruling 2026-09-07, rules 2 and 4.
 *
 * A dark card prints the maker's list price, and rule 4 says every figure has a
 * source: the maker's page, fetch-verified, with a URL and a date. So the field
 * is all-or-nothing. A partial block is worse than no block — it renders a
 * figure with no provenance, or drops silently and leaves the card dark for a
 * reason no one can see. An amazon.com sourceUrl is a category error: that is a
 * Buy-Box price wearing a list-price label, and the snapshot already owns that
 * figure. Non-positive amounts are not prices.
 *
 * Mirrors isValidListPrice() in src/lib/dark-card.ts — the renderer drops an
 * invalid block, and this is what makes that drop impossible to ship unnoticed.
 */
const LIST_PRICE_KEYS = ['amount', 'currency', 'sourceUrl', 'sourceLabel', 'verifiedAt'];

function listPriceErrors(slug, picks) {
  const out = [];
  picks.forEach((pick, idx) => {
    if (!pick || typeof pick !== 'object' || pick.listPrice === undefined) return;
    const where = `src/content/guides/${slug}.md pick #${pick.rank ?? idx + 1} (${pick.name ?? 'unnamed'})`;
    const lp = pick.listPrice;
    if (!lp || typeof lp !== 'object' || Array.isArray(lp)) {
      out.push(`${where}: listPrice must be a mapping with ${LIST_PRICE_KEYS.join(', ')}`);
      return;
    }
    const missing = LIST_PRICE_KEYS.filter(
      (k) => lp[k] === undefined || lp[k] === null || String(lp[k]).trim() === '',
    );
    if (missing.length) {
      out.push(`${where}: listPrice is missing required key(s): ${missing.join(', ')}`);
    }
    if (lp.amount !== undefined && (typeof lp.amount !== 'number' || !(lp.amount > 0))) {
      out.push(`${where}: listPrice.amount must be a positive number (got ${JSON.stringify(lp.amount)})`);
    }
    if (typeof lp.sourceUrl === 'string' && /(^|\/\/|\.)amazon\.[a-z.]+/i.test(lp.sourceUrl)) {
      out.push(
        `${where}: listPrice.sourceUrl is an amazon.com URL — a LIST price comes from the maker, ` +
          `never from the listing whose price we are standing in for (ruling rule 4)`,
      );
    }
    if (lp.verifiedAt !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(lp.verifiedAt))) {
      out.push(`${where}: listPrice.verifiedAt must be YYYY-MM-DD (got ${JSON.stringify(lp.verifiedAt)})`);
    }
  });
  return out;
}

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

// listPrice shape across the whole guide corpus.
const guidesDir = path.join(process.cwd(), 'src/content/guides');
let listPriceBlocks = 0;
if (fs.existsSync(guidesDir)) {
  for (const file of fs.readdirSync(guidesDir).filter((f) => f.endsWith('.md'))) {
    const slug = file.replace(/\.md$/, '');
    const { data } = matter(fs.readFileSync(path.join(guidesDir, file), 'utf8'));
    const picks = Array.isArray(data.picks) ? data.picks : [];
    listPriceBlocks += picks.filter((p) => p && typeof p === 'object' && p.listPrice !== undefined).length;
    for (const err of listPriceErrors(slug, picks)) errors.push(err);
  }
}

for (const product of productAudit.invalidCategoryProducts) {
  errors.push(`src/data/products.ts product "${product.slug}" uses unknown category "${product.category}"`);
}

for (const product of productAudit.productsMissingAmazonTag) {
  errors.push(`src/data/products.ts product "${product.slug}" Amazon link is missing tag=petpalhq08-20`);
}

for (const product of productAudit.productsMissingFreshness) {
  warnings.push(`src/data/products.ts product "${product.slug}" is missing lastVerified freshness metadata`);
}

for (const asin of productAudit.duplicateAsins) {
  warnings.push(`src/data/products.ts has duplicate ASIN "${asin}"`);
}

console.log(`Content validation checked ${listPriceBlocks} pick listPrice block(s).`);
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
