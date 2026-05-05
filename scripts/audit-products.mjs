#!/usr/bin/env node
import { buildProductAudit, renderProductAuditMarkdown } from './lib/content-audit.mjs';

const audit = buildProductAudit();
const asMarkdown = process.argv.includes('--markdown');

if (asMarkdown) {
  console.log(renderProductAuditMarkdown(audit));
} else {
  console.log(JSON.stringify(audit, null, 2));
}

