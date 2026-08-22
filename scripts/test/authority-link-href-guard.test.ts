/**
 * href-span double-wrap guard regression test (2026-08-22).
 *
 * THE DEFECT (found in kitchengearhq-next PR #61, ported here). Both
 * injectAuthorityLinks and injectGuideLinks in src/lib/guides.ts iterate a
 * name/URL map and, for each entry, wrap the first standalone occurrence of
 * the name in `[name](url)` markdown, skipping occurrences already "inside"
 * a markdown link. The pre-fix guard only detected an unclosed link TEXT span
 * (`lastOpenBracket > lastCloseBracket && lastOpenBracket > lastCloseParen`)
 * — it never checked whether the match sat inside an already-inserted link's
 * HREF span (past an unclosed `](` with no closing `)` yet).
 *
 * When a name and an alias share a URL, and that URL's domain contains the
 * FIRST-processed entry's text as a literal substring, the second entry's
 * pattern matches INSIDE the href the first entry just inserted. The old
 * guard's bracket check goes stale the moment the first link's `]` closes
 * (lastOpenBracket is no longer > lastCloseBracket), so it fails to detect
 * the still-open href span and wraps again, corrupting the href.
 *
 * THE FIX. Track the last `](` (link-href-open) against the last `)`
 * (link-close): if `](` is more recent than `)`, we're inside a live href
 * and must skip.
 *
 * This test:
 *   1. Reimplements the OLD (pre-fix) guard verbatim and shows it produces a
 *      malformed href on the collision fixture (FAIL — bug reproduced).
 *   2. Imports the real, current injectAuthorityLinks/injectGuideLinks from
 *      src/lib/guides.ts (now `export`ed) and shows the same fixture comes
 *      out clean (PASS — fix verified against the actual shipped code).
 *
 * Run: `npx tsx scripts/test/authority-link-href-guard.test.ts`.
 */
import { injectAuthorityLinks, injectGuideLinks } from '../../src/lib/guides';

let failures = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failures++;
  }
}

/**
 * Byte-for-byte reimplementation of the PRE-FIX guard from
 * injectAuthorityLinks/injectGuideLinks (the code confirmed at
 * src/lib/guides.ts:895-919 / :926-950 before this fix, and matching the
 * pre-fix kitchengearhq-next code at PR #61's base commit). Kept ONLY in this
 * test file to prove the defect reproduces and stays fixed — not part of the
 * shipped module.
 */
function injectLinksOldGuard(text: string, map: Map<string, string>): string {
  if (!text || map.size === 0) return text;
  const entries = [...map.entries()].sort((a, b) => b[0].length - a[0].length);
  let result = text;

  for (const [name, url] of entries) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<!\\[)\\b(${escaped})\\b(?!\\])`, 'i');
    const m = result.match(pattern);
    if (m && m.index !== undefined) {
      // Pre-fix guard: only checks for an unclosed link TEXT span.
      const before = result.slice(0, m.index);
      const lastOpenBracket = before.lastIndexOf('[');
      const lastCloseBracket = before.lastIndexOf(']');
      const lastCloseParen = before.lastIndexOf(')');
      if (lastOpenBracket > lastCloseBracket && lastOpenBracket > lastCloseParen) continue;
      result =
        result.slice(0, m.index) + `[${m[0]}](${url})` + result.slice(m.index + m[0].length);
    }
  }
  return result;
}

console.log('href-span double-wrap guard test:');

// --- Fixture 1: injectAuthorityLinks (outlet name + alias sharing a URL
// whose domain contains the alias as a substring — the exact kitchen bug
// shape: "Home Barista" / "Home-Barista" -> home-barista.com). ---
const authorityText = 'For expert opinions, see Home Barista and Home-Barista reviews.';
const authorityMap = new Map<string, string>([
  ['Home Barista', 'https://www.home-barista.com/reviews'],
  ['Home-Barista', 'https://www.home-barista.com/reviews'],
]);

const oldAuthorityResult = injectLinksOldGuard(authorityText, authorityMap);
const newAuthorityResult = injectAuthorityLinks(authorityText, authorityMap);

console.log('\n[injectAuthorityLinks / OLD guard — expect FAIL, malformed href]');
console.log(`  input:  ${authorityText}`);
console.log(`  output: ${oldAuthorityResult}`);
// A malformed result nests a second "](" inside the first link's href
// (i.e. the href substring itself contains an unclosed "[...](" before its
// closing ")"). Detect via: does the first link's href contain a literal "["?
const firstLinkMatch = oldAuthorityResult.match(/\[([^\]]*)\]\(([^)]*)\)/);
const oldHrefIsCorrupted = !!firstLinkMatch && /\[/.test(firstLinkMatch[2]);
check(
  'OLD guard corrupts the href on the collision fixture',
  oldHrefIsCorrupted,
  oldHrefIsCorrupted ? 'href contains a stray "[" — malformed, as expected' : 'unexpectedly clean',
);

console.log('\n[injectAuthorityLinks / NEW (shipped) guard — expect PASS, clean output]');
console.log(`  input:  ${authorityText}`);
console.log(`  output: ${newAuthorityResult}`);
const newFirstLinkMatch = newAuthorityResult.match(/\[([^\]]*)\]\(([^)]*)\)/);
const newHrefIsClean = !!newFirstLinkMatch && !/[[\]]/.test(newFirstLinkMatch[2]);
const newHasExactlyOneLink = (newAuthorityResult.match(/\]\(/g) || []).length === 1;
check('NEW guard produces exactly one link (no double-wrap)', newHasExactlyOneLink);
check('NEW guard href is clean (no stray brackets)', newHrefIsClean);
check(
  'NEW guard href is the exact expected URL',
  newFirstLinkMatch?.[2] === 'https://www.home-barista.com/reviews',
);

// --- Fixture 2: injectGuideLinks (same collision shape, guide-title map). ---
const guideText = 'See our Best Litter Boxes guide and Best-Litter-Boxes picks.';
const guideMap = new Map<string, string>([
  ['Best Litter Boxes', 'https://www.petpalhq.com/guides/best-litter-boxes'],
  ['Best-Litter-Boxes', 'https://www.petpalhq.com/guides/best-litter-boxes'],
]);

const oldGuideResult = injectLinksOldGuard(guideText, guideMap);
const newGuideResult = injectGuideLinks(guideText, guideMap);

console.log('\n[injectGuideLinks / OLD guard — expect FAIL, malformed href]');
console.log(`  input:  ${guideText}`);
console.log(`  output: ${oldGuideResult}`);
const oldGuideFirstLink = oldGuideResult.match(/\[([^\]]*)\]\(([^)]*)\)/);
const oldGuideHrefCorrupted = !!oldGuideFirstLink && /\[/.test(oldGuideFirstLink[2]);
check(
  'OLD guard corrupts the href on the collision fixture',
  oldGuideHrefCorrupted,
  oldGuideHrefCorrupted ? 'href contains a stray "[" — malformed, as expected' : 'unexpectedly clean',
);

console.log('\n[injectGuideLinks / NEW (shipped) guard — expect PASS, clean output]');
console.log(`  input:  ${guideText}`);
console.log(`  output: ${newGuideResult}`);
const newGuideFirstLink = newGuideResult.match(/\[([^\]]*)\]\(([^)]*)\)/);
const newGuideHrefClean = !!newGuideFirstLink && !/[[\]]/.test(newGuideFirstLink[2]);
const newGuideExactlyOneLink = (newGuideResult.match(/\]\(/g) || []).length === 1;
check('NEW guard produces exactly one link (no double-wrap)', newGuideExactlyOneLink);
check('NEW guard href is clean (no stray brackets)', newGuideHrefClean);
check(
  'NEW guard href is the exact expected URL',
  newGuideFirstLink?.[2] === 'https://www.petpalhq.com/guides/best-litter-boxes',
);

console.log('');
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log('All checks passed.');
}
