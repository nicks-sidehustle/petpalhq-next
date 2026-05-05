#!/usr/bin/env node
import { buildGuideAudit, renderGuideAuditMarkdown } from './lib/content-audit.mjs';

const audit = buildGuideAudit();
const asMarkdown = process.argv.includes('--markdown');

if (asMarkdown) {
  console.log(renderGuideAuditMarkdown(audit));
} else {
  console.log(JSON.stringify(audit, null, 2));
}

