#!/usr/bin/env node
/**
 * validate-dead-asin-guard.mjs
 *
 * §8m regression gate for the 2026-07-29 full-corpus ASIN liveness sweep
 * (ASIN-LIVENESS-SWEEP-2026-07-29.md). data/dead-asins.json is the generator-
 * input source of truth for every ASIN found delisted, out-of-stock, or
 * resolving to a used Buy Box on a new-titled pick; src/lib/guides.ts wires it
 * into parsePicks() as the single central enforcement point, so no guide's
 * frontmatter needs manual `available: false` for these ASINs to render
 * honestly (no live CTA, no auto-linked prose, OutOfStock JSON-LD).
 *
 * This script is a STRICT, always-fatal gate (unlike the WARN-by-default
 * legacy checks in validate-guide-integrity.mjs) because a guarded ASIN
 * leaking through in a buyable role is a compliance regression, not editorial
 * debt. It fails the build on:
 *
 *   1. malformedGuard    — data/dead-asins.json itself doesn't parse, or an
 *                          entry is missing status/reason/lastVerified/guides,
 *                          or status isn't one of dead/no_offer/used_buybox.
 *   2. explicitOverride  — a guide's pick frontmatter sets `available: true`
 *                          on an ASIN the guard lists — a direct attempt to
 *                          override the guard from content, even though the
 *                          runtime forces it back to false; flagged so the
 *                          contradiction gets cleaned up, not silently masked.
 *   3. strayGuardedLink  — a literal markdown link (in guide body or visible
 *                          frontmatter prose) resolving to a guarded ASIN via
 *                          an amazon.com/dp/{ASIN} or /go/{ASIN} href. These
 *                          bypass the pick system entirely (parsePicks never
 *                          sees them), so the central guard can't gate them.
 *
 * Usage:
 *   node scripts/validate-dead-asin-guard.mjs                # all guides
 *   node scripts/validate-dead-asin-guard.mjs --slug <slug>  # single guide
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const GUIDES_DIR = path.join(process.cwd(), 'src/content/guides');
const GUARD_PATH = path.join(process.cwd(), 'data/dead-asins.json');

const args = process.argv.slice(2);
const slugIdx = args.indexOf('--slug');
const SINGLE_SLUG = slugIdx !== -1 ? args[slugIdx + 1] : null;

const VALID_STATUSES = new Set(['dead', 'no_offer', 'used_buybox']);

// Amazon dp link with a capturing group for the ASIN; internal /go/{asin} redirect.
const AMAZON_DP_RE = /amazon\.[a-z.]+\/(?:[^/]+\/)*dp\/([A-Z0-9]{10})/i;
const GO_HREF_RE = /\/go\/([A-Z0-9]{10})/i;
const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

// ─── Load + validate the guard file itself ─────────────────────────────────

function loadGuard() {
  if (!fs.existsSync(GUARD_PATH)) {
    console.error(`Guard file not found: ${GUARD_PATH}`);
    process.exit(1);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(GUARD_PATH, 'utf8'));
  } catch (err) {
    console.error(`data/dead-asins.json failed to parse: ${err.message}`);
    process.exit(1);
  }

  const findings = [];
  for (const [asin, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') {
      findings.push({ check: 'malformedGuard', message: `${asin}: entry is not an object` });
      continue;
    }
    if (!VALID_STATUSES.has(entry.status)) {
      findings.push({
        check: 'malformedGuard',
        message: `${asin}: status "${entry.status}" is not one of dead/no_offer/used_buybox`,
      });
    }
    if (typeof entry.reason !== 'string' || !entry.reason) {
      findings.push({ check: 'malformedGuard', message: `${asin}: missing "reason"` });
    }
    if (typeof entry.lastVerified !== 'string' || !entry.lastVerified) {
      findings.push({ check: 'malformedGuard', message: `${asin}: missing "lastVerified"` });
    }
    if (!Array.isArray(entry.guides) || entry.guides.length === 0) {
      findings.push({ check: 'malformedGuard', message: `${asin}: missing/empty "guides" array` });
    }
  }

  return { raw, findings };
}

// ─── Guide Loading (mirrors validate-guide-integrity.mjs) ──────────────────

function loadGuides() {
  if (!fs.existsSync(GUIDES_DIR)) {
    console.error(`Guides directory not found: ${GUIDES_DIR}`);
    process.exit(1);
  }

  let files = fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md')).sort();

  if (SINGLE_SLUG) {
    files = files.filter((f) => f.replace(/\.md$/, '') === SINGLE_SLUG);
    if (files.length === 0) {
      console.error(`No guide found with slug: ${SINGLE_SLUG}`);
      process.exit(1);
    }
  }

  return files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(GUIDES_DIR, filename), 'utf8');
    try {
      const { data, content } = matter(raw);
      return { slug, filename, content, data: data ?? {}, parseError: null };
    } catch (err) {
      return { slug, filename, content: '', data: {}, parseError: err.message };
    }
  });
}

function asString(v) {
  return typeof v === 'string' ? v : '';
}

/** Visible frontmatter prose fields — mirrors visibleProseStrings() in validate-guide-integrity.mjs. */
function visibleProseStrings(data) {
  const parts = [];
  for (const key of ['shortAnswer', 'reviewMethod', 'whenNotToBuy', 'forDogs', 'forCats']) {
    if (typeof data[key] === 'string') parts.push(data[key]);
  }
  const picks = Array.isArray(data.picks) ? data.picks : [];
  for (const pick of picks) {
    if (pick && typeof pick === 'object') {
      if (typeof pick.body === 'string') parts.push(pick.body);
      if (typeof pick.verdict === 'string') parts.push(pick.verdict);
    }
  }
  if (Array.isArray(data.bottomLine)) {
    for (const item of data.bottomLine) if (typeof item === 'string') parts.push(item);
  }
  return parts;
}

// ─── Checks ─────────────────────────────────────────────────────────────────

/** 2. explicitOverride — a pick's own frontmatter sets available:true on a guarded ASIN. */
function checkExplicitOverride(guide, guardedAsins) {
  const findings = [];
  const picks = Array.isArray(guide.data.picks) ? guide.data.picks : [];
  for (const pick of picks) {
    if (!pick || typeof pick !== 'object') continue;
    const asin = asString(pick.asin).trim();
    if (!asin || !guardedAsins.has(asin)) continue;
    if (pick.available === true) {
      findings.push({
        check: 'explicitOverride',
        message: `pick "${asString(pick.name) || asin}" (${asin}) sets available:true in frontmatter but is guarded by data/dead-asins.json — remove the override, the guard already forces it false`,
      });
    }
  }
  return findings;
}

/** 3. strayGuardedLink — a literal markdown link resolving to a guarded ASIN. */
function checkStrayGuardedLinks(guide, guardedAsins) {
  const findings = [];
  const haystacks = [guide.content, ...visibleProseStrings(guide.data)];
  const seen = new Set();

  for (const text of haystacks) {
    if (!text) continue;
    let m;
    MD_LINK_RE.lastIndex = 0;
    while ((m = MD_LINK_RE.exec(text)) !== null) {
      const href = m[2].trim();
      const dpMatch = href.match(AMAZON_DP_RE);
      const goMatch = href.match(GO_HREF_RE);
      const asin = (dpMatch?.[1] || goMatch?.[1] || '').toUpperCase();
      if (!asin || !guardedAsins.has(asin)) continue;
      const key = `${asin}:${href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        check: 'strayGuardedLink',
        message: `literal link "${m[0]}" resolves to guarded ASIN ${asin} — this bypasses parsePicks()'s central guard entirely; route it through the pick system or remove it`,
      });
    }
  }
  return findings;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const { raw: guardData, findings: guardFindings } = loadGuard();
const guardedAsins = new Set(Object.keys(guardData));
const guides = loadGuides();

console.log(
  `\nDead-ASIN guard check — ${guardedAsins.size} guarded ASIN${guardedAsins.size !== 1 ? 's' : ''}, ${guides.length} guide${guides.length !== 1 ? 's' : ''}\n`,
);

let totalFindings = guardFindings.length;
let guidesWithFindings = 0;

if (guardFindings.length) {
  console.log('data/dead-asins.json:');
  for (const f of guardFindings) console.log(`  [ERROR] (${f.check}) ${f.message}`);
  console.log('');
}

for (const guide of guides) {
  const findings = [];
  if (guide.parseError) {
    findings.push({ check: 'malformedGuard', message: `frontmatter failed to parse: ${guide.parseError}` });
  } else {
    findings.push(...checkExplicitOverride(guide, guardedAsins));
    findings.push(...checkStrayGuardedLinks(guide, guardedAsins));
  }

  if (findings.length === 0) continue;
  guidesWithFindings += 1;
  totalFindings += findings.length;
  console.log(`${guide.slug}:`);
  for (const f of findings) console.log(`  [ERROR] (${f.check}) ${f.message}`);
  console.log('');
}

console.log(
  `${totalFindings} finding${totalFindings !== 1 ? 's' : ''} (guard file + ${guidesWithFindings} of ${guides.length} guides).`,
);
console.log('');

if (totalFindings === 0) {
  console.log('EXIT 0 — dead-ASIN guard clean');
  process.exit(0);
}

console.log(`EXIT 1 — dead-ASIN guard violations must be fixed before shipping`);
process.exit(1);
