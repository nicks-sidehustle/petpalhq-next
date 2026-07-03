#!/usr/bin/env node
import { buildPicksAudit, buildProductAudit, renderProductAuditMarkdown } from './lib/content-audit.mjs';

const audit = buildProductAudit();
audit.picks = buildPicksAudit();
const asMarkdown = process.argv.includes('--markdown');

if (asMarkdown) {
  console.log(renderProductAuditMarkdown(audit));
  const p = audit.picks;
  console.log(`\n## Frontmatter picks (canonical inventory)\n- Guides scanned: ${p.guideCount}\n- Picks: ${p.pickCount}\n- Missing ASIN: ${p.picksMissingAsin.length}\n- Invalid ASIN format: ${p.picksInvalidAsin.length}\n- Missing price: ${p.picksMissingPrice.length}\n- Missing image: ${p.picksMissingImage.length}\n- Duplicate ASINs: ${p.duplicateAsins.length}\n- Parse failures: ${p.parseFailures.length}`);
} else {
  console.log(JSON.stringify(audit, null, 2));
}

