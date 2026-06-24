#!/usr/bin/env node
/**
 * validate-guide-integrity.mjs
 *
 * Standalone integrity gate for PetPalHQ guide content. Formalizes the
 * mechanical findings from the 2026-06-23 Tier-1 adversarial review into a
 * deterministic checker. This script is READ-ONLY and intentionally separate
 * from the live gate scripts (check-content-metrics.ts / validate-content.mjs)
 * so it can be hardened independently without touching the running pipeline.
 *
 * Checks (WARN by default — the existing 128-guide corpus already violates
 * some; --strict flips findings to ERROR and exits 1):
 *   1. FAQ silent-failure  — "## Frequently Asked Questions" heading present
 *      but 0 "**Q:…?**\nA:…" pairs parse → FAQPage schema is silently dropped.
 *   2. Alias-not-in-prose  — a pick declares aliases[] but none appear in its
 *      body/verdict → the inline affiliate auto-link never fires.
 *   3. Stray outbound link — a markdown link whose href is an external http(s)
 *      URL to a non-Amazon host → violates the outbound-link policy.
 *   4. Templated scaffolding — the same ≥6-word sentence opener begins a
 *      sentence in ≥3 different picks' bodies in one guide → reads AI-generated.
 *   5. Duplicate ASIN       — two picks in one guide share the same asin →
 *      padding / wrong product match.
 *
 * Frontmatter is parsed with gray-matter (same approach as
 * check-content-metrics.ts) so picks[], aliases, body block scalars, and the
 * FAQ section in body markdown all parse correctly.
 *
 * Usage:
 *   node scripts/validate-guide-integrity.mjs                 # all guides
 *   node scripts/validate-guide-integrity.mjs --slug <slug>   # single guide
 *   node scripts/validate-guide-integrity.mjs --strict        # exit 1 on any finding
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// ─── CLI Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const STRICT_MODE = args.includes('--strict');
const slugIdx = args.indexOf('--slug');
const SINGLE_SLUG = slugIdx !== -1 ? args[slugIdx + 1] : null;

// ─── Constants ────────────────────────────────────────────────────────────────

const GUIDES_DIR = path.join(process.cwd(), 'src/content/guides');

// FAQ pair parser — must mirror the production FAQ extraction regex exactly so
// "silent failure" means the same thing here as on the page template.
const FAQ_PAIR_RE = /\*\*Q:\s*([\s\S]+?)\*\*\s*\nA:/g;
const FAQ_HEADING_RE = /^##\s+Frequently Asked Questions\s*$/im;

// Markdown inline link: [text](href)
const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

// Amazon affiliate hosts (face-value rule, see note in checkStrayLinks).
const AMAZON_HOST_RE = /(^|\.)amazon\.[a-z.]+$|(^|\.)amzn\.to$/i;

const SCAFFOLD_OPENER_WORDS = 6;
const SCAFFOLD_MIN_PICKS = 3;

// Check identifiers used in the corpus-wide summary.
const CHECKS = ['faqSilentFailure', 'aliasNotInProse', 'strayLink', 'scaffolding', 'duplicateAsin', 'parseError'];

// ─── Guide Loading ────────────────────────────────────────────────────────────

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
    // One malformed YAML guide must not crash the whole validate:content chain.
    try {
      const { data, content } = matter(raw);
      return { slug, content, data: data ?? {}, parseError: null };
    } catch (err) {
      return { slug, content: '', data: {}, parseError: err.message };
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asString(v) {
  return typeof v === 'string' ? v : '';
}

/**
 * Visible frontmatter prose fields, mirroring extractVisibleProse() in
 * check-content-metrics.ts so the stray-link scan covers exactly what the page
 * template renders to readers.
 */
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

  const methodology = data.methodology;
  if (methodology && Array.isArray(methodology.factors)) {
    for (const factor of methodology.factors) {
      if (factor && typeof factor === 'object' && typeof factor.definition === 'string') {
        parts.push(factor.definition);
      }
    }
  }

  return parts;
}

/** Split prose into sentences for the scaffolding opener heuristic. */
function splitSentences(text) {
  // Strip markdown link syntax (keep text), then split on sentence enders.
  const plain = text.replace(MD_LINK_RE, '$1');
  return plain
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** First-N-word opener of a sentence, normalized (lowercased, punctuation stripped). */
function sentenceOpener(sentence, words = SCAFFOLD_OPENER_WORDS) {
  const tokens = sentence
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length < words) return null;
  return tokens.slice(0, words).join(' ');
}

// ─── Checks ───────────────────────────────────────────────────────────────────

/** 1. FAQ silent-failure. */
function checkFaqSilentFailure(guide) {
  if (!FAQ_HEADING_RE.test(guide.content)) return null;
  const matches = guide.content.match(FAQ_PAIR_RE) ?? [];
  if (matches.length > 0) return null;
  return {
    check: 'faqSilentFailure',
    message: '"## Frequently Asked Questions" heading present but 0 "**Q:…?**" pairs parse — FAQPage schema is silently dropped (likely legacy "**How…?**" format)',
  };
}

/** 2. Alias-not-in-prose. */
function checkAliasNotInProse(guide) {
  const findings = [];
  const picks = Array.isArray(guide.data.picks) ? guide.data.picks : [];
  for (const pick of picks) {
    if (!pick || typeof pick !== 'object') continue;
    const aliases = Array.isArray(pick.aliases) ? pick.aliases.filter((a) => typeof a === 'string') : [];
    if (aliases.length === 0) continue;
    const haystack = (asString(pick.body) + '\n' + asString(pick.verdict)).toLowerCase();
    const missing = aliases.filter((alias) => !haystack.includes(alias.toLowerCase()));
    if (missing.length === aliases.length) {
      const name = asString(pick.name) || `rank ${pick.rank ?? '?'}`;
      findings.push({
        check: 'aliasNotInProse',
        message: `pick "${name}" declares aliases [${aliases.join(', ')}] but none appear in its body/verdict — inline affiliate auto-link never fires`,
      });
    }
  }
  return findings;
}

/** 3. Stray outbound link. */
function checkStrayLinks(guide) {
  // Scan body markdown + visible frontmatter prose. We flag external http(s)
  // links to non-Amazon hosts. Root-relative (/…) and anchor (#…) links are
  // internal. NOTE (deviation from spec wording): rather than a literal
  // "amazon OR /guides/" allowlist, we treat ANY root-relative link as internal
  // so internal non-/guides/ links (e.g. /about) are not false-flagged; the
  // policy this enforces is "no external non-affiliate outbound links."
  const findings = [];
  const haystacks = [guide.content, ...visibleProseStrings(guide.data)];
  const seen = new Set();

  for (const text of haystacks) {
    if (!text) continue;
    let m;
    MD_LINK_RE.lastIndex = 0;
    while ((m = MD_LINK_RE.exec(text)) !== null) {
      const href = m[2].trim();
      if (!/^https?:\/\//i.test(href)) continue; // internal / anchor / relative
      let host;
      try {
        host = new URL(href).hostname;
      } catch {
        continue;
      }
      if (AMAZON_HOST_RE.test(host)) continue; // affiliate link
      if (seen.has(href)) continue;
      seen.add(href);
      findings.push({
        check: 'strayLink',
        message: `stray outbound link to non-Amazon host: ${href} ("${m[1].trim()}")`,
      });
    }
  }
  return findings;
}

/** 4. Templated scaffolding. */
function checkScaffolding(guide) {
  const picks = Array.isArray(guide.data.picks) ? guide.data.picks : [];
  // opener -> Set of pick indices in which it begins a sentence
  const openerPicks = new Map();

  picks.forEach((pick, idx) => {
    if (!pick || typeof pick !== 'object' || typeof pick.body !== 'string') return;
    const openersThisPick = new Set();
    for (const sentence of splitSentences(pick.body)) {
      const opener = sentenceOpener(sentence);
      if (opener) openersThisPick.add(opener);
    }
    for (const opener of openersThisPick) {
      if (!openerPicks.has(opener)) openerPicks.set(opener, new Set());
      openerPicks.get(opener).add(idx);
    }
  });

  const findings = [];
  for (const [opener, idxSet] of openerPicks) {
    if (idxSet.size >= SCAFFOLD_MIN_PICKS) {
      findings.push({
        check: 'scaffolding',
        message: `templated opener "${opener}…" begins a sentence in ${idxSet.size} different picks' bodies — reads AI-generated`,
      });
    }
  }
  return findings;
}

/** 5. Duplicate ASIN within a guide. */
function checkDuplicateAsin(guide) {
  const picks = Array.isArray(guide.data.picks) ? guide.data.picks : [];
  const counts = new Map();
  for (const pick of picks) {
    if (!pick || typeof pick !== 'object') continue;
    const asin = asString(pick.asin).trim();
    if (!asin) continue;
    counts.set(asin, (counts.get(asin) ?? 0) + 1);
  }
  const findings = [];
  for (const [asin, count] of counts) {
    if (count > 1) {
      findings.push({
        check: 'duplicateAsin',
        message: `ASIN "${asin}" appears in ${count} picks — duplicate product match within one guide`,
      });
    }
  }
  return findings;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

function runGuide(guide) {
  const findings = [];

  if (guide.parseError) {
    findings.push({ check: 'parseError', message: `frontmatter failed to parse: ${guide.parseError}` });
    return findings; // can't run structural checks on an unparseable guide
  }

  const faq = checkFaqSilentFailure(guide);
  if (faq) findings.push(faq);
  findings.push(...checkAliasNotInProse(guide));
  findings.push(...checkStrayLinks(guide));
  findings.push(...checkScaffolding(guide));
  findings.push(...checkDuplicateAsin(guide));

  return findings;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const guides = loadGuides();
const label = STRICT_MODE ? 'ERROR' : 'WARN';

const summary = Object.fromEntries(CHECKS.map((c) => [c, 0]));
const guidesPerCheck = Object.fromEntries(CHECKS.map((c) => [c, new Set()]));
let guidesWithFindings = 0;
let totalFindings = 0;

console.log(`\nGuide integrity check — ${guides.length} guide${guides.length !== 1 ? 's' : ''} (mode: ${label})\n`);

for (const guide of guides) {
  const findings = runGuide(guide);
  if (findings.length === 0) continue;

  guidesWithFindings += 1;
  totalFindings += findings.length;
  console.log(`${guide.slug}:`);
  for (const f of findings) {
    summary[f.check] += 1;
    guidesPerCheck[f.check].add(guide.slug);
    console.log(`  [${label}] (${f.check}) ${f.message}`);
  }
  console.log('');
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const CHECK_LABELS = {
  faqSilentFailure: 'FAQ silent-failure (heading present, 0 Q/A pairs parse)',
  aliasNotInProse: 'Alias-not-in-prose (declared aliases never used in body/verdict)',
  strayLink: 'Stray outbound link (external non-Amazon href)',
  scaffolding: 'Templated scaffolding (shared sentence opener across ≥3 picks)',
  duplicateAsin: 'Duplicate ASIN within a guide',
  parseError: 'Frontmatter parse error',
};

console.log('SUMMARY — findings (and affected guides) per check across the corpus:');
for (const check of CHECKS) {
  const g = guidesPerCheck[check].size;
  console.log(`  ${summary[check]} finding${summary[check] !== 1 ? 's' : ''} / ${g} guide${g !== 1 ? 's' : ''}\t${CHECK_LABELS[check]}`);
}
console.log(
  `\n${totalFindings} finding${totalFindings !== 1 ? 's' : ''} across ${guidesWithFindings} of ${guides.length} guide${guides.length !== 1 ? 's' : ''}.`,
);

console.log('');
if (totalFindings === 0) {
  console.log('EXIT 0 — no integrity findings');
  process.exit(0);
}

if (STRICT_MODE) {
  console.log(`EXIT 1 (strict mode — ${totalFindings} finding${totalFindings !== 1 ? 's' : ''} treated as errors)`);
  process.exit(1);
}

console.log(`EXIT 0 — ${totalFindings} warning${totalFindings !== 1 ? 's' : ''} (use --strict to exit 1 on findings)`);
process.exit(0);
