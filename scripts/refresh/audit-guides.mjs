#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildGuideAudit, renderGuideAuditMarkdown, ROOT } from '../lib/content-audit.mjs';

const audit = buildGuideAudit();
const reportsDir = path.join(ROOT, 'docs/refresh/reports');
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'guide-inventory.json'), `${JSON.stringify(audit, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, 'guide-inventory.md'), renderGuideAuditMarkdown(audit));
console.log(`Wrote docs/refresh/reports/guide-inventory.md and guide-inventory.json`);
console.log(`Markdown guides: ${audit.markdownCount}; legacy src/data/guides.ts: ${audit.legacyGuideDataExists ? `${audit.dataGuideCount} entries` : 'not present'}; markdown-only: ${audit.markdownOnlySlugs.length}; metadata-only: ${audit.dataOnlySlugs.length}`);
