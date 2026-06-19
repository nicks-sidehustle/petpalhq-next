#!/usr/bin/env npx tsx
/**
 * validate-authority-sources.ts
 *
 * WARN-ONLY structured-authority-source check for PetPalHQ guides.
 *
 * This sprint, authority-source coverage is a soft signal, NOT a ship gate:
 *   - A top-3 pick (rank 1–3) with fewer than 2 authoritySources → WARN
 *   - Any authoritySource missing a url → WARN
 *
 * It NEVER exits non-zero (always exit 0) so a missing URL or thin coverage
 * never hard-fails a ship. It is wired into `npm run validate:content` as a
 * non-fatal step. To make it gating later, flip ALLOW_FAILURE to false.
 *
 * Usage:
 *   npx tsx scripts/validate-authority-sources.ts                # all guides
 *   npx tsx scripts/validate-authority-sources.ts --slug <slug>  # single guide
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const GUIDES_DIR = path.join(process.cwd(), 'src/content/guides');
const MIN_SOURCES_TOP3 = 2;
const ALLOW_FAILURE = true; // WARN-only this sprint — never block a ship.

const args = process.argv.slice(2);
const slugIdx = args.indexOf('--slug');
const SINGLE_SLUG = slugIdx !== -1 ? args[slugIdx + 1] : null;

interface RawSource {
  outlet?: unknown;
  url?: unknown;
  stat?: unknown;
}
interface RawPick {
  name?: unknown;
  rank?: unknown;
  authoritySources?: unknown;
}

function loadGuideFiles(): string[] {
  if (!fs.existsSync(GUIDES_DIR)) return [];
  let files = fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md')).sort();
  if (SINGLE_SLUG) {
    files = files.filter((f) => f.replace(/\.md$/, '') === SINGLE_SLUG);
  }
  return files;
}

const warnings: string[] = [];
let guidesWithPicks = 0;
let picksChecked = 0;

for (const filename of loadGuideFiles()) {
  const slug = filename.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(GUIDES_DIR, filename), 'utf8');
  const { data } = matter(raw);
  const picks = Array.isArray((data as Record<string, unknown>).picks)
    ? ((data as Record<string, unknown>).picks as RawPick[])
    : [];
  if (picks.length === 0) continue;
  guidesWithPicks += 1;

  for (const pick of picks) {
    picksChecked += 1;
    const rank = typeof pick.rank === 'number' ? pick.rank : 0;
    const name = typeof pick.name === 'string' ? pick.name : '(unnamed)';
    const sources = Array.isArray(pick.authoritySources)
      ? (pick.authoritySources as RawSource[])
      : [];

    // Rule 1: top-3 picks should carry ≥2 authoritySources.
    if (rank >= 1 && rank <= 3 && sources.length < MIN_SOURCES_TOP3) {
      warnings.push(
        `${slug}: top-3 pick (rank ${rank}) "${name}" has ${sources.length} authoritySources (want ≥${MIN_SOURCES_TOP3})`,
      );
    }

    // Rule 2: any source lacking a url.
    sources.forEach((s, i) => {
      const url = typeof s.url === 'string' ? s.url.trim() : '';
      const outlet = typeof s.outlet === 'string' ? s.outlet : `source #${i + 1}`;
      if (!url) {
        warnings.push(`${slug}: pick "${name}" source "${outlet}" is missing a url`);
      }
    });
  }
}

console.log(
  `\nAuthority-source check — ${guidesWithPicks} guide(s) with picks, ${picksChecked} pick(s) inspected.`,
);

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} authority-source warning(s) (non-fatal this sprint):`);
  for (const w of warnings) console.log(`- ${w}`);
} else {
  console.log('All inspected picks have ≥2 authoritySources and every source has a url.');
}

// WARN-only: never block a ship on missing URLs or thin coverage.
process.exit(ALLOW_FAILURE ? 0 : warnings.length ? 1 : 0);
