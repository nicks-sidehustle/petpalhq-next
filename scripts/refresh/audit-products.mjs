#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildProductAudit, renderProductAuditMarkdown, ROOT } from '../lib/content-audit.mjs';

const audit = buildProductAudit();
const reportsDir = path.join(ROOT, 'docs/refresh/reports');
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'product-inventory.json'), `${JSON.stringify(audit, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, 'product-inventory.md'), renderProductAuditMarkdown(audit));
console.log(`Wrote docs/refresh/reports/product-inventory.md and product-inventory.json`);
console.log(`Products: ${audit.productCount}; missing tag: ${audit.productsMissingAmazonTag.length}; missing lastVerified: ${audit.productsMissingFreshness.length}`);
