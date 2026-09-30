#!/usr/bin/env npx tsx
/**
 * WARN-ONLY REPORT — label-shaped comparison charts that still carry prices.
 *
 * Owner decision 2026-09-30: comparison charts carry no prices; prices live
 * only on the product cards with their dated stamps. Headers-shaped charts
 * already fail the build on any price column or money figure
 * (src/lib/comparison-table.ts). Label-shaped charts (`rows: [{label, values}]`)
 * are NOT blocked yet: 108 guides still carry price rows until their cleanup
 * PRs merge. This script lists them and ALWAYS exits 0.
 *
 * >>> FLIP TO BLOCKING after the label-chart price cleanup PRs land: set
 * >>> BLOCKING = true (exit 1 on any finding) in its own gate PR.
 *
 * Run: `npx tsx scripts/report-label-chart-prices.ts` (wired into
 * `validate:content`).
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { labelChartPriceFindings } from '../src/lib/comparison-table';

const BLOCKING = false; // FLIP TO true after the label-chart price cleanup PRs merge.

const dir = path.join(import.meta.dirname, '..', 'src', 'content', 'guides');
const hits: Array<[string, string[]]> = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
  const findings = labelChartPriceFindings(matter(fs.readFileSync(path.join(dir, file), 'utf8')).data.comparison);
  if (findings.length) hits.push([file.replace(/\.md$/, ''), findings]);
}

const tag = BLOCKING ? 'FAIL' : 'WARN (non-blocking; flip to blocking after the label-chart price cleanup PRs merge)';
if (!hits.length) {
  console.log('label-chart-prices: 0 label charts carry a price row or money figure');
} else {
  for (const [slug, findings] of hits) console.warn(`  ${slug}: ${findings.join('; ')}`);
  console.warn(`label-chart-prices: ${tag}: ${hits.length} label chart(s) still carry a price row or money figure`);
}
if (BLOCKING && hits.length) process.exit(1);
