#!/usr/bin/env npx tsx
/**
 * check-content-metrics.ts
 *
 * Algorithmic quality gates for PetPalHQ guide content. Three checks:
 *   1. Flesch-Kincaid reading level (target grade 8–12) on user-visible prose
 *   2. Link density (≥50 words/link in eligible body regions)
 *   3. Dissent ratio (total cons / pick count ≥ 2.5)
 *
 * FK measures *user-visible prose only* — the page template renders frontmatter
 * components (picks[].body, verdicts, bottomLine, etc.) plus the FAQ section
 * extracted from body markdown. Intro narrative and bridge paragraphs in body
 * markdown do not render and are excluded from FK.
 *
 * Usage:
 *   npx tsx scripts/check-content-metrics.ts                   # all guides
 *   npx tsx scripts/check-content-metrics.ts --slug <slug>     # single guide
 *   npx tsx scripts/check-content-metrics.ts --json            # JSON output
 *   npx tsx scripts/check-content-metrics.ts --strict          # exit 1 on warning
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// ─── Types ────────────────────────────────────────────────────────────────────

type Rating = 'pass' | 'warn' | 'error' | 'na';

interface FKResult {
  slug: string;
  grade: number | null;
  rating: Rating;
  wordCount: number;
  reason?: string;
}

interface LinkDensityResult {
  slug: string;
  wordsPerLink: number | null;
  rating: Rating;
  eligibleWords: number;
  linkCount: number;
  reason?: string;
}

interface DissentResult {
  slug: string;
  pickCount: number;
  totalCons: number;
  ratio: number | null;
  rating: Rating;
  reason?: string;
}

interface NoCons {
  slug: string;
  pickName: string;
  rank: number;
}

// ─── CLI Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const STRICT_MODE = args.includes('--strict');
const slugIdx = args.indexOf('--slug');
const SINGLE_SLUG = slugIdx !== -1 ? args[slugIdx + 1] : null;

// ─── Constants ────────────────────────────────────────────────────────────────

const GUIDES_DIR = path.join(process.cwd(), 'src/content/guides');
const FK_MIN_WORDS = 100; // below this, FK is unreliable — mark N/A

// FK thresholds
const FK_PASS_LOW = 8;
const FK_PASS_HIGH = 12;
const FK_WARN_LOW = 7;
const FK_WARN_HIGH = 13;

// Link density thresholds (words per link)
const DENSITY_PASS = 50;
const DENSITY_WARN = 30;

// Dissent ratio thresholds
const DISSENT_PASS = 2.5;
const DISSENT_WARN = 2.0;

// ─── Syllable counting (inline, ~20 lines) ────────────────────────────────────

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length === 0) return 0;
  // Count vowel groups
  const matches = cleaned.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  // Subtract silent trailing 'e'
  if (cleaned.length > 2 && cleaned.endsWith('e')) {
    count -= 1;
  }
  // Minimum 1 syllable per word
  return Math.max(1, count);
}

function countSyllablesInText(text: string): number {
  const words = text.match(/\b[a-zA-Z']+\b/g) ?? [];
  return words.reduce((sum, w) => sum + countSyllables(w), 0);
}

// ─── Text Cleaning ────────────────────────────────────────────────────────────

/**
 * Strips markdown/HTML formatting to leave plain prose for readability scoring.
 * Receives already-extracted visible prose; structural decisions (FAQ inclusion,
 * scaffolding exclusion) live in extractVisibleProse, not here.
 */
function cleanForFK(markdown: string): string {
  return markdown
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`[^`]+`/g, ' ')
    // Convert markdown links to just their text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Remove heading markers (lines starting with #)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bullet/numbered list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Count sentences in plain text. Splits on sentence-ending punctuation
 * followed by whitespace or end-of-string.
 */
function countSentences(text: string): number {
  const matches = text.match(/[.!?]+(?:\s|$)/g);
  return Math.max(1, matches ? matches.length : 1);
}

function countWords(text: string): number {
  const matches = text.match(/\b\w+\b/g);
  return matches ? matches.length : 0;
}

// ─── Visible Prose Extraction ─────────────────────────────────────────────────
//
// The page template at src/app/guides/[slug]/page.tsx renders only frontmatter
// components plus the FAQ section extracted from body. Body intro narrative,
// bridge paragraphs, and H2-section prose between FAQ and the start are NOT
// rendered. FK should score what readers actually see.

function extractVisibleProse(data: Record<string, unknown>, content: string): string {
  const parts: string[] = [];

  // FAQ section from body markdown (extracted as faqItems and rendered).
  const faqIdx = content.search(/^##\s+Frequently Asked Questions\s*$/im);
  if (faqIdx !== -1) {
    const faqSection = content.slice(faqIdx);
    const nextH2 = faqSection.slice(2).search(/^##\s/m);
    parts.push(nextH2 !== -1 ? faqSection.slice(0, nextH2 + 2) : faqSection);
  }

  if (typeof data.shortAnswer === 'string') parts.push(data.shortAnswer);
  if (typeof data.reviewMethod === 'string') parts.push(data.reviewMethod);
  if (typeof data.whenNotToBuy === 'string') parts.push(data.whenNotToBuy);
  if (typeof data.forDogs === 'string') parts.push(data.forDogs);
  if (typeof data.forCats === 'string') parts.push(data.forCats);

  const picks = Array.isArray(data.picks) ? data.picks : [];
  for (const pick of picks) {
    if (pick && typeof pick === 'object') {
      const p = pick as Record<string, unknown>;
      if (typeof p.body === 'string') parts.push(p.body);
      if (typeof p.verdict === 'string') parts.push(p.verdict);
    }
  }

  if (Array.isArray(data.bottomLine)) {
    for (const item of data.bottomLine) {
      if (typeof item === 'string') parts.push(item);
    }
  }

  const methodology = data.methodology as Record<string, unknown> | undefined;
  if (methodology && Array.isArray(methodology.factors)) {
    for (const factor of methodology.factors) {
      if (factor && typeof factor === 'object') {
        const f = factor as Record<string, unknown>;
        if (typeof f.definition === 'string') parts.push(f.definition);
      }
    }
  }

  return parts.join('\n\n');
}

// ─── Flesch-Kincaid ───────────────────────────────────────────────────────────

function computeFK(content: string): { grade: number | null; wordCount: number; reason?: string } {
  const plain = cleanForFK(content);
  const words = countWords(plain);

  if (words < FK_MIN_WORDS) {
    return { grade: null, wordCount: words, reason: `only ${words} body words — too few for reliable FK` };
  }

  const sentences = countSentences(plain);
  const syllables = countSyllablesInText(plain);

  const grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  return { grade: Math.round(grade * 10) / 10, wordCount: words };
}

function rateFKGrade(grade: number | null): Rating {
  if (grade === null) return 'na';
  if (grade >= FK_PASS_LOW && grade <= FK_PASS_HIGH) return 'pass';
  if (grade >= FK_WARN_LOW && grade <= FK_WARN_HIGH) return 'warn';
  return 'error';
}

// ─── splitBodyForInjection (inline replica from src/lib/guides.ts) ────────────
// Excludes: FAQ section, intro capsule (first paragraph), H2-section capsules (header + first paragraph)
// Eligible segments = body prose between capsules.

interface BodySegment {
  text: string;
  eligible: boolean;
}

function splitBodyForInjection(markdown: string): BodySegment[] {
  if (!markdown) return [{ text: '', eligible: false }];

  const segments: BodySegment[] = [];

  // 1. Split off FAQ section
  const faqMatch = markdown.match(/^(##\s+Frequently Asked Questions\s*(?:\r?\n|$)[\s\S]*)$/im);
  let preFaq: string;
  let faqTail: string;
  if (faqMatch && faqMatch.index !== undefined) {
    preFaq = markdown.slice(0, faqMatch.index);
    faqTail = markdown.slice(faqMatch.index);
  } else {
    preFaq = markdown;
    faqTail = '';
  }

  // 2. Split preFaq by H2 boundaries
  const h2Parts = preFaq.split(/^(?=##\s)/m);
  const intro = h2Parts[0];
  const h2Sections = h2Parts.slice(1);

  // 3. Process intro: first paragraph is ineligible capsule; rest is eligible
  if (intro) {
    const blankLineIdx = intro.search(/\n\s*\n/);
    if (blankLineIdx !== -1) {
      const capsuleEnd = intro.indexOf('\n', blankLineIdx) + 1;
      const introCapsule = intro.slice(0, capsuleEnd);
      const introRest = intro.slice(capsuleEnd);
      segments.push({ text: introCapsule, eligible: false });
      if (introRest) segments.push({ text: introRest, eligible: true });
    } else {
      segments.push({ text: intro, eligible: false });
    }
  }

  // 4. Process each H2 section: header + first paragraph = ineligible capsule; rest eligible
  for (const section of h2Sections) {
    const headerEnd = section.indexOf('\n') + 1;
    const headerLine = section.slice(0, headerEnd);
    const afterHeader = section.slice(headerEnd);
    const blankLineIdx = afterHeader.search(/\n\s*\n/);
    if (blankLineIdx !== -1) {
      const capsuleEnd = afterHeader.indexOf('\n', blankLineIdx) + 1;
      const capsuleBody = afterHeader.slice(0, capsuleEnd);
      const sectionRest = afterHeader.slice(capsuleEnd);
      segments.push({ text: headerLine + capsuleBody, eligible: false });
      if (sectionRest) segments.push({ text: sectionRest, eligible: true });
    } else {
      segments.push({ text: headerLine + afterHeader, eligible: false });
    }
  }

  // 5. FAQ tail is ineligible
  if (faqTail) segments.push({ text: faqTail, eligible: false });

  return segments;
}

// ─── Link Density ─────────────────────────────────────────────────────────────

function computeLinkDensity(content: string): { wordsPerLink: number | null; eligibleWords: number; linkCount: number; reason?: string } {
  const segments = splitBodyForInjection(content);
  const eligible = segments.filter((s) => s.eligible).map((s) => s.text).join(' ');

  const linkMatches = eligible.match(/\[([^\]]+)\]\([^)]+\)/g) ?? [];
  const linkCount = linkMatches.length;

  // Count words in eligible text (strip markdown link syntax first, keep link text)
  const plain = eligible.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const eligibleWords = countWords(plain);

  if (linkCount === 0) {
    return { wordsPerLink: null, eligibleWords, linkCount, reason: 'no links in eligible body regions' };
  }

  const wordsPerLink = Math.round(eligibleWords / linkCount);
  return { wordsPerLink, eligibleWords, linkCount };
}

function rateLinkDensity(wordsPerLink: number | null): Rating {
  if (wordsPerLink === null) return 'pass'; // no links = no density problem
  if (wordsPerLink >= DENSITY_PASS) return 'pass';
  if (wordsPerLink >= DENSITY_WARN) return 'warn';
  return 'error';
}

// ─── Dissent Ratio ────────────────────────────────────────────────────────────

interface RawPick {
  name?: string;
  rank?: number;
  pros?: unknown[];
  cons?: unknown[];
}

function computeDissent(data: Record<string, unknown>): {
  pickCount: number;
  totalCons: number;
  ratio: number | null;
  noConsPicks: { name: string; rank: number }[];
  reason?: string;
} {
  const picks = Array.isArray(data.picks) ? (data.picks as RawPick[]) : [];
  if (picks.length === 0) {
    return { pickCount: 0, totalCons: 0, ratio: null, noConsPicks: [], reason: 'no picks' };
  }

  let totalCons = 0;
  const noConsPicks: { name: string; rank: number }[] = [];

  for (const pick of picks) {
    const consArr = Array.isArray(pick.cons) ? pick.cons : [];
    const consCount = consArr.length;
    totalCons += consCount;
    if (consCount === 0) {
      noConsPicks.push({ name: pick.name ?? 'unnamed', rank: pick.rank ?? 0 });
    }
  }

  const ratio = Math.round((totalCons / picks.length) * 100) / 100;
  return { pickCount: picks.length, totalCons, ratio, noConsPicks };
}

function rateDissentRatio(ratio: number | null): Rating {
  if (ratio === null) return 'na'; // no picks
  if (ratio >= DISSENT_PASS) return 'pass';
  if (ratio >= DISSENT_WARN) return 'warn';
  return 'error';
}

// ─── Hero Image Existence ─────────────────────────────────────────────────────
//
// Hard gate. Every guide must have a hero image file on disk. Missing or
// broken hero images embarrass on render and undermine the editorial moat.
// Local paths (starting with /) resolve under public/. Use scripts/image-gen/
// gen-hero.mjs to generate missing heroes.

const PUBLIC_DIR = path.join(process.cwd(), 'public');

interface ImageResult {
  slug: string;
  heroImage: string | null;
  exists: boolean;
  rating: Rating;
  reason?: string;
}

function checkHeroImage(slug: string, data: Record<string, unknown>): ImageResult {
  const heroImage = typeof data.heroImage === 'string' ? data.heroImage : null;

  if (!heroImage) {
    return { slug, heroImage: null, exists: false, rating: 'error', reason: 'no heroImage field in frontmatter' };
  }

  // External URL (http/https) — out of scope for filesystem check, treat as pass.
  if (/^https?:\/\//i.test(heroImage)) {
    return { slug, heroImage, exists: true, rating: 'pass' };
  }

  // Local path — resolve under public/
  const relPath = heroImage.startsWith('/') ? heroImage.slice(1) : heroImage;
  const absPath = path.join(PUBLIC_DIR, relPath);

  if (!fs.existsSync(absPath)) {
    return { slug, heroImage, exists: false, rating: 'error', reason: `file not found: public${heroImage}` };
  }

  // Refuse zero-byte files (treated as broken)
  const stat = fs.statSync(absPath);
  if (stat.size === 0) {
    return { slug, heroImage, exists: false, rating: 'error', reason: `file is zero bytes: public${heroImage}` };
  }

  return { slug, heroImage, exists: true, rating: 'pass' };
}

// ─── Guide Loading ────────────────────────────────────────────────────────────

interface GuideFile {
  slug: string;
  content: string;
  data: Record<string, unknown>;
}

function loadGuides(): GuideFile[] {
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
    const { data, content } = matter(raw);
    return { slug, content, data: data as Record<string, unknown> };
  });
}

// ─── Metric Runner ────────────────────────────────────────────────────────────

interface AllResults {
  fk: FKResult[];
  linkDensity: LinkDensityResult[];
  dissent: DissentResult[];
  noConsPicks: NoCons[];
  heroImage: ImageResult[];
}

function runAll(guides: GuideFile[]): AllResults {
  const fk: FKResult[] = [];
  const linkDensity: LinkDensityResult[] = [];
  const dissent: DissentResult[] = [];
  const noConsPicks: NoCons[] = [];
  const heroImage: ImageResult[] = [];

  for (const guide of guides) {
    heroImage.push(checkHeroImage(guide.slug, guide.data));
    // FK on user-visible prose (frontmatter prose + extracted FAQ section).
    const fkData = computeFK(extractVisibleProse(guide.data, guide.content));
    fk.push({
      slug: guide.slug,
      grade: fkData.grade,
      rating: rateFKGrade(fkData.grade),
      wordCount: fkData.wordCount,
      reason: fkData.reason,
    });

    // Link density
    const ldData = computeLinkDensity(guide.content);
    linkDensity.push({
      slug: guide.slug,
      wordsPerLink: ldData.wordsPerLink,
      rating: rateLinkDensity(ldData.wordsPerLink),
      eligibleWords: ldData.eligibleWords,
      linkCount: ldData.linkCount,
      reason: ldData.reason,
    });

    // Dissent
    const dData = computeDissent(guide.data);
    dissent.push({
      slug: guide.slug,
      pickCount: dData.pickCount,
      totalCons: dData.totalCons,
      ratio: dData.ratio,
      rating: rateDissentRatio(dData.ratio),
      reason: dData.reason,
    });

    // No-cons picks
    for (const pick of dData.noConsPicks) {
      noConsPicks.push({ slug: guide.slug, pickName: pick.name, rank: pick.rank });
    }
  }

  return { fk, linkDensity, dissent, noConsPicks, heroImage };
}

// ─── Console Output ───────────────────────────────────────────────────────────

function ratingIcon(r: Rating): string {
  switch (r) {
    case 'pass': return '✅';
    case 'warn': return '⚠️ ';
    case 'error': return '❌';
    case 'na': return '➖';
  }
}

function formatGuideList(
  entries: Array<{ slug: string; value: string }>,
  max = 10,
): string {
  const shown = entries.slice(0, max);
  const rest = entries.length - shown.length;
  const lines = shown.map((e) => `    ${e.slug} (${e.value})`).join('\n');
  return rest > 0 ? `${lines}\n    … and ${rest} more` : lines;
}

function printConsole(results: AllResults, totalGuides: number): void {
  console.log(`\nContent metrics check — ${totalGuides} guide${totalGuides !== 1 ? 's' : ''}\n`);

  // ── Flesch-Kincaid ──
  console.log('Flesch-Kincaid reading level:');
  const fkPass = results.fk.filter((r) => r.rating === 'pass');
  const fkWarn = results.fk.filter((r) => r.rating === 'warn');
  const fkError = results.fk.filter((r) => r.rating === 'error');
  const fkNA = results.fk.filter((r) => r.rating === 'na');

  console.log(`  ${ratingIcon('pass')} ${fkPass.length} guides in target range (grade ${FK_PASS_LOW}–${FK_PASS_HIGH})`);

  if (fkWarn.length > 0) {
    const list = fkWarn.map((r) => ({ slug: r.slug, value: `grade ${r.grade}` }));
    console.log(`  ${ratingIcon('warn')} ${fkWarn.length} guides at grade ${FK_WARN_LOW} or ${FK_WARN_HIGH}:`);
    console.log(formatGuideList(list));
  }
  if (fkError.length > 0) {
    const list = fkError.map((r) => ({ slug: r.slug, value: `grade ${r.grade}` }));
    console.log(`  ${ratingIcon('error')} ${fkError.length} guides outside grade ${FK_WARN_LOW - 1}–${FK_WARN_HIGH + 1} (hard error):`);
    console.log(formatGuideList(list));
  }
  if (fkNA.length > 0) {
    console.log(`  ${ratingIcon('na')} ${fkNA.length} guides skipped (N/A — ${results.fk.find((r) => r.rating === 'na')?.reason ?? 'insufficient body content'})`);
  }

  // ── Link Density ──
  console.log('\nLink density (eligible body only — capsules + FAQ excluded):');
  const ldPass = results.linkDensity.filter((r) => r.rating === 'pass');
  const ldWarn = results.linkDensity.filter((r) => r.rating === 'warn');
  const ldError = results.linkDensity.filter((r) => r.rating === 'error');

  console.log(`  ${ratingIcon('pass')} ${ldPass.length} guides at ≥${DENSITY_PASS} words/link`);

  if (ldWarn.length > 0) {
    const list = ldWarn.map((r) => ({ slug: r.slug, value: `${r.wordsPerLink} words/link` }));
    console.log(`  ${ratingIcon('warn')} ${ldWarn.length} guides at ${DENSITY_WARN}–${DENSITY_PASS - 1} words/link:`);
    console.log(formatGuideList(list));
  }
  if (ldError.length > 0) {
    const list = ldError.map((r) => ({ slug: r.slug, value: `${r.wordsPerLink} words/link` }));
    console.log(`  ${ratingIcon('error')} ${ldError.length} guides at <${DENSITY_WARN} words/link:`);
    console.log(formatGuideList(list));
  }

  // ── Dissent Ratio ──
  console.log('\nDissent ratio (cons / picks — floor: 2.5):');
  const dsPass = results.dissent.filter((r) => r.rating === 'pass');
  const dsWarn = results.dissent.filter((r) => r.rating === 'warn');
  const dsError = results.dissent.filter((r) => r.rating === 'error');
  const dsNA = results.dissent.filter((r) => r.rating === 'na');

  console.log(`  ${ratingIcon('pass')} ${dsPass.length} guides at cons/picks ≥ ${DISSENT_PASS}`);

  if (dsWarn.length > 0) {
    const list = dsWarn.map((r) => ({ slug: r.slug, value: `ratio ${r.ratio}` }));
    console.log(`  ${ratingIcon('warn')} ${dsWarn.length} guides at ${DISSENT_WARN}–${DISSENT_PASS - 0.01} (below floor):`);
    console.log(formatGuideList(list));
  }
  if (dsError.length > 0) {
    const list = dsError.map((r) => ({ slug: r.slug, value: `ratio ${r.ratio}` }));
    console.log(`  ${ratingIcon('error')} ${dsError.length} guides at <${DISSENT_WARN} (critical):`);
    console.log(formatGuideList(list));
  }
  if (dsNA.length > 0) {
    console.log(`  ${ratingIcon('na')} ${dsNA.length} guides skipped (no picks)`);
  }

  // ── No-cons picks ──
  if (results.noConsPicks.length > 0) {
    console.log(`\nPicks with 0 cons (anti-pattern — every product has trade-offs):`);
    console.log(`  ${ratingIcon('warn')} ${results.noConsPicks.length} picks across ${new Set(results.noConsPicks.map((p) => p.slug)).size} guides:`);
    for (const p of results.noConsPicks) {
      console.log(`    "${p.pickName}" (rank ${p.rank}) in ${p.slug}`);
    }
  }

  // ── Hero image existence (hard gate) ──
  console.log('\nHero image existence (hard gate — every guide must have a working hero):');
  const imgPass = results.heroImage.filter((r) => r.rating === 'pass');
  const imgError = results.heroImage.filter((r) => r.rating === 'error');
  console.log(`  ${ratingIcon('pass')} ${imgPass.length} guides with hero image present`);
  if (imgError.length > 0) {
    const list = imgError.map((r) => ({ slug: r.slug, value: r.reason ?? 'missing' }));
    console.log(`  ${ratingIcon('error')} ${imgError.length} guides with missing or broken hero image:`);
    console.log(formatGuideList(list, 20));
    console.log('    Fix: run `node scripts/image-gen/gen-hero.mjs --slug <slug>` to generate.');
  }

  // ── Summary line ──
  const totalErrors = fkError.length + ldError.length + dsError.length + imgError.length;
  const totalWarnings = fkWarn.length + ldWarn.length + dsWarn.length + results.noConsPicks.length;

  console.log('');
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('EXIT 0 — all metrics pass');
  } else if (totalErrors === 0) {
    if (STRICT_MODE) {
      console.log(`EXIT 1 (strict mode — ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''})`);
    } else {
      console.log(`EXIT 0 — ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''} (use --strict to exit 1 on warnings)`);
    }
  } else {
    console.log(`EXIT 1 (${totalErrors} error${totalErrors !== 1 ? 's' : ''}, ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''})`);
  }
  console.log('');
}

// ─── JSON Output ──────────────────────────────────────────────────────────────

function printJSON(results: AllResults, totalGuides: number): void {
  const fkErrors = results.fk.filter((r) => r.rating === 'error').length;
  const fkWarnings = results.fk.filter((r) => r.rating === 'warn').length;
  const ldErrors = results.linkDensity.filter((r) => r.rating === 'error').length;
  const ldWarnings = results.linkDensity.filter((r) => r.rating === 'warn').length;
  const dsErrors = results.dissent.filter((r) => r.rating === 'error').length;
  const dsWarnings = results.dissent.filter((r) => r.rating === 'warn').length;
  const imgErrors = results.heroImage.filter((r) => r.rating === 'error').length;
  const totalErrors = fkErrors + ldErrors + dsErrors + imgErrors;
  const totalWarnings = fkWarnings + ldWarnings + dsWarnings + results.noConsPicks.length;
  const passing = results.fk.filter((r) => r.rating === 'pass').length; // approximation by guide count

  const output = {
    summary: {
      totalGuides,
      passing,
      warnings: totalWarnings,
      errors: totalErrors,
    },
    fk: {
      thresholds: { pass: [FK_PASS_LOW, FK_PASS_HIGH], warn: [FK_WARN_LOW, FK_WARN_HIGH] },
      byGuide: results.fk,
    },
    linkDensity: {
      thresholds: { pass: DENSITY_PASS, warn: DENSITY_WARN },
      byGuide: results.linkDensity,
    },
    dissent: {
      thresholds: { pass: DISSENT_PASS, warn: DISSENT_WARN },
      byGuide: results.dissent,
      noConsPicks: results.noConsPicks,
    },
    heroImage: {
      byGuide: results.heroImage,
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

// ─── Exit Code ────────────────────────────────────────────────────────────────

function computeExitCode(results: AllResults): number {
  const totalErrors =
    results.fk.filter((r) => r.rating === 'error').length +
    results.linkDensity.filter((r) => r.rating === 'error').length +
    results.dissent.filter((r) => r.rating === 'error').length +
    results.heroImage.filter((r) => r.rating === 'error').length;

  if (totalErrors > 0) return 1;

  if (STRICT_MODE) {
    const totalWarnings =
      results.fk.filter((r) => r.rating === 'warn').length +
      results.linkDensity.filter((r) => r.rating === 'warn').length +
      results.dissent.filter((r) => r.rating === 'warn').length +
      results.noConsPicks.length;
    if (totalWarnings > 0) return 1;
  }

  return 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const guides = loadGuides();
const results = runAll(guides);

if (JSON_MODE) {
  printJSON(results, guides.length);
} else {
  printConsole(results, guides.length);
}

process.exit(computeExitCode(results));
