/**
 * Two claim classes that every quantifier-based guard in this repo is blind to.
 * Both were found by a W4 verifier after the guards they defeat had already run.
 *
 * ── 1. ABSENCE CLAIMS ────────────────────────────────────────────────────────
 * A claim that a named product does NOT publish, state, or disclose something.
 *
 * The corpus is disciplined about UNILATERAL absence — "we will not invent a
 * spec the listing does not state" appears verbatim across several guides. The
 * failures are always COMPARATIVE or SUPERLATIVE absence: "the only pick that
 * publishes a weight rating", "more than the Helinox listing tells you",
 * "PetSafe doesn't publish warranty terms". Those carry no collective
 * quantifier, so a guard grepping /both|all|every|each/ cannot see them — which
 * is exactly how a 12-guide sweep for fabricated specs missed them, twice.
 *
 * They are also the highest-harm shape available: an absence claim invents a
 * gap in a competitor's disclosure, and the two found in this corpus both
 * denigrated a pick to favour a cheaper one. One of them sat on a guide's own
 * #1 anchor, telling a reader the premium pick hides a number it publishes
 * plainly (Helinox publishes 132 lb / 154 lb capacities; the guide said it
 * gives no stated weight ceiling).
 *
 * THE RULE (owner, 2026-08-12, conversion-path law): delete the claim unless
 * BOTH (a) the absence is load-bearing for the verdict and (b) you hold a
 * receipt from that product's own page confirming the absence. Deletion is the
 * default — absence claims are comparison filler that neither informs the
 * reader nor enables the click.
 *
 * ── 2. CITATION ORPHANS IN NON-PICK FIELDS ──────────────────────────────────
 * `reviewMethod`, `sources.*`, `methodology.factors[].definition` and the
 * markdown body all RENDER (MethodologyParagraph, SourcesPanel, MethodologyBox,
 * GuideBody). Suppressing a pick leaves citations behind in them that credit a
 * product the reader can no longer see. A repair round deleted the
 * `sources.expert[]` copy of such a citation in 8 guides while the identical
 * citation still rendered in `reviewMethod`, because `reviewMethod` had never
 * been enumerated.
 *
 * Run:
 *   npx tsx scripts/audit/absence-and-orphan-claims.ts            # both
 *   npx tsx scripts/audit/absence-and-orphan-claims.ts absence
 *   npx tsx scripts/audit/absence-and-orphan-claims.ts orphans
 *   npx tsx scripts/audit/absence-and-orphan-claims.ts absence --touched <file>
 *
 * Reports only. Every hit needs a human read — "no stated weight ceiling" is a
 * defect, "we do not publish a tested figure" is the honest disclosure this
 * corpus is supposed to make.
 *
 * ── WHAT THIS SCANNER DOES NOT MATCH ────────────────────────────────────────
 * Stated plainly because a guard that overstates its reach is worse than one
 * that admits its edges — a reader who believes this is exhaustive stops
 * looking. It is a net, not a proof.
 *
 *  - PARAPHRASED absence with no absence vocabulary at all: "the listing is
 *    quiet on capacity", "you are on your own for the gauge", "good luck
 *    finding a spec sheet". No pattern here fires on those.
 *  - Absence carried across two sentences: "We wanted a density figure. There
 *    isn't one." The scanner is sentence-scoped by design (so a hit reports the
 *    claim rather than the paragraph) and cannot join them.
 *  - MISSING-FEATURE claims, which are a different class and deliberately out of
 *    scope: "No heater for cold-weather drying" asserts the product lacks a
 *    capability, not that its maker failed to disclose one. Those need a spec
 *    check, not a receipt.
 *  - Absence stated as a reader instruction: "measure it yourself before you
 *    buy" implies the spec is unpublished without ever claiming it.
 *  - Non-English or unusual verb choices outside the lists above.
 *
 * If you extend the vocabulary, extend this list too, or delete the claim that
 * the scanner covers a class it does not.
 */
import fs from 'fs';
import { getAllGuides, type Guide, type GuidePick } from '../../src/lib/guides';

/** Every reader-visible prose surface, derived from the guide page's render path. */
function renderedProse(g: Guide, exclude?: GuidePick): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const p = (label: string, v: unknown) => {
    if (typeof v === 'string' && v.trim()) out.push([label, v]);
  };
  p('title', g.title);
  p('description', g.description);
  p('excerpt', g.excerpt);
  p('shortAnswer', g.shortAnswer);
  p('whenNotToBuy', g.whenNotToBuy);
  p('reviewMethod', g.reviewMethod);
  p('content', g.content);
  p('forDogs', g.forDogs);
  p('forCats', g.forCats);
  p('sources.authorBio', g.sources?.authorBio);
  // headings[] is the ELEVENTH rendered prose family, and it was found by
  // re-derivation rather than by the enumeration that was supposed to be
  // exhaustive. `extractHeadingsFromMarkdown` (guides.ts) parses every H2/H3
  // into Guide.headings, page.tsx:357 maps them into the on-page TOC, and the
  // same text renders inside htmlContent. A heading is the single most
  // load-bearing sentence on a page — it is a promise about the section under
  // it — and a rewrite of the paragraph beneath a heading leaves the heading
  // standing, which is exactly how "The Mesh and Latch Truth No Listing Tells
  // You" ended up contradicting its own repaired body copy.
  g.headings?.forEach((h, i) => p(`headings[${i}].text`, h.text));
  g.bottomLine?.forEach((b, i) => p(`bottomLine[${i}]`, b));
  g.faqItems?.forEach((f, i) => {
    p(`faq[${i}].question`, f.question);
    p(`faq[${i}].answer`, f.answer);
  });
  g.sources?.expert?.forEach((s, i) => p(`sources.expert[${i}]`, s));
  g.sources?.community?.forEach((s, i) => p(`sources.community[${i}]`, s));
  p('methodology.formula', g.methodology?.formula);
  g.methodology?.factors?.forEach((f, i) => p(`methodology.factors[${i}].definition`, f.definition));
  g.comparison?.rows?.forEach((r, i) => {
    p(`comparison.rows[${i}].label`, r.label);
    r.values.forEach((v, j) => p(`comparison.rows[${i}].values[${j}]`, v));
  });
  g.topPicks?.forEach((t, i) => {
    p(`topPicks[${i}].name`, t.name);
    p(`topPicks[${i}].keyFeature`, t.keyFeature);
    t.sources?.forEach((s, j) => p(`topPicks[${i}].sources[${j}]`, s));
  });
  p('ecosystemSection.narrative', g.ecosystemSection?.narrative);
  (g.picks ?? []).forEach((q, i) => {
    if (exclude && q.name === exclude.name) return;
    p(`picks[${i}].name`, q.name);
    p(`picks[${i}].label`, q.label);
    p(`picks[${i}].body`, q.body);
    p(`picks[${i}].verdict`, q.verdict);
    q.keyFeatures.forEach((v, j) => p(`picks[${i}].keyFeatures[${j}]`, v));
    q.pros.forEach((v, j) => p(`picks[${i}].pros[${j}]`, v));
    q.cons.forEach((v, j) => p(`picks[${i}].cons[${j}]`, v));
    q.authoritySources?.forEach((s, j) => p(`picks[${i}].authoritySources[${j}].stat`, s.stat));
  });
  return out;
}

/**
 * Absence shapes. Deliberately NOT anchored on a collective quantifier — that
 * is the blind spot being closed. Sentence-scoped so the report shows the claim.
 */
/**
 * Two TIERS, because one number would be dishonest in both directions.
 *
 * DEFECT — absence asserted about a NAMED product, which is the shape the rule
 * governs: it invents a disclosure gap in one product, and every instance found
 * so far was doing it to favour another.
 *
 * ADVISORY — the house rhetorical frame, "What the spec sheet does not tell
 * you: <our own insight>". It names no competitor and invents no gap; it
 * introduces information we are ADDING. 345 of these render corpus-wide as a
 * deliberate section device. Sweeping them as defects would drown the signal;
 * deleting the pattern to make the headline number smaller would be the same
 * dishonesty pointed the other way. So they are counted, separated, and
 * adjudicated as a class once — not per instance.
 */
type Tier = 'defect' | 'advisory';
const ABSENCE_PATTERNS: Array<[string, RegExp, Tier]> = [
  // ── added after a verifier found three productive shapes escaping ──────────
  // Every original pattern required a disclosure verb in ACTIVE voice after
  // do/does/did, or a bare `no`/`publishes no`. The corpus speaks a wider
  // dialect than that, and a guard narrower than its subject is the
  // guard-vocabulary-mismatch law all over again.
  ['copular-past-participle', /\b(?:is|are|was|were|remains?|stays?)\s+(?:not\s+)?(?:un)?(?:published|disclosed|stated|listed|documented|specified|reported)\b/i, 'defect'],
  ['un-prefixed-participle', /\b(?:unpublished|undisclosed|unstated|unlisted|undocumented|unspecified)\b/i, 'defect'],
  ['superlative-with-preposition', /\bonly\s+\w+(?:\s+\w+){0,4}\s+with\s+(?:a\s+|an\s+|any\s+)?(?:published|documented|stated|disclosed|verified|independent|third-party|clinical|trial|lab)\b/i, 'defect'],
  ['credential-absence', /\b(?:carries|holds|bears|has|offers|comes\s+with)\s+no\s+\w*\s*(?:certification|certificate|rating|accreditation|approval|listing|warranty|guarantee|standard|test)\w*\b/i, 'defect'],
  // The HEADLINE-PROMISE shape, which is where absence claims are most
  // load-bearing and least checked: a heading promises the section reveals what
  // nobody discloses, then the body underneath gets repaired and the promise is
  // left standing. "No Listing Tells You" survived a rewrite of the very
  // paragraph beneath it that went on to cite two listings documenting exactly
  // the thing.
  ['headline-promise', /\b(?:no|none of the|nobody|no one)\s+(?:listing|listings|maker|makers|brand|brands|manufacturer|manufacturers|seller|sellers|spec sheet)s?\s+(?:tells?|says?|will tell|mentions?|discloses?|admits?)\b/i, 'defect'],
  ['wont-tell-you', /\b(?:won't|will not|doesn't|does not)\s+tell\s+you\b/i, 'advisory'],
  ['is-not-rated', /\b(?:is|are|was|were)\s+not\s+(?:crash-)?(?:rated|certified|tested|verified|approved|accredited)\b/i, 'defect'],
  ['no-x-is-rated', /\bno\s+\w+(?:\s+\w+){0,3}\s+is\s+(?:crash-)?(?:rated|certified|tested|verified|approved)\b/i, 'defect'],
  // ── original set ───────────────────────────────────────────────────────────
  ['does-not-publish', /\b(?:does|do|did)\s+not\s+(?:publish|state|list|disclose|specify|give|provide|report)\b/i, 'defect'],
  ['doesnt-publish', /\b(?:doesn't|don't|didn't)\s+(?:publish|state|list|disclose|specify|give|provide|report)\b/i, 'defect'],
  ['no-stated', /\bno\s+(?:stated|published|listed|disclosed|specified|documented)\b/i, 'defect'],
  ['publishes-no', /\b(?:publishes|states|lists|discloses|specifies)\s+(?:no|neither|none)\b/i, 'defect'],
  ['only-that-publishes', /\bonly\s+\w+(?:\s+\w+){0,4}\s+(?:that|to|which|either|who)\s+(?:publish|state|list|disclose|specify|give)\w*\b/i, 'defect'],
  ['more-than-tells-you', /\bmore\s+than\s+the\s+\w+(?:\s+\w+){0,3}\s+(?:tells|says|gives|lists|states)\b/i, 'defect'],
  ['neither-either-publishes', /\b(?:neither|either)\s+\w+(?:\s+\w+){0,3}\s+(?:publish|state|list|disclose|specif)\w*\b/i, 'defect'],
  ['never-publishes', /\b(?:never|nowhere)\s+(?:publish|state|list|disclose|specif)\w*/i, 'defect'],
  ['without-a-published', /\bwithout\s+a\s+(?:published|stated|listed|disclosed)\b/i, 'defect'],
  ['leaves-unstated', /\bleaves?\s+\w+(?:\s+\w+){0,3}\s+unstated\b/i, 'defect'],
  ['rather-than-a-stated', /\brather\s+than\s+a\s+(?:stated|published|listed)\b/i, 'defect'],
];

/** Split into sentences so a hit reports the claim, not the paragraph. */
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z(“"'])/)
    .filter((x) => x.trim().length > 0);
}

function auditAbsence(only: Set<string> | null): number {
  let hits = 0;
  let advisory = 0;
  const advisoryGuides = new Set<string>();
  const perGuide = new Map<string, string[]>();
  for (const g of getAllGuides()) {
    if (only && !only.has(g.slug)) continue;
    for (const [field, text] of renderedProse(g)) {
      for (const s of sentences(text)) {
        const matched = ABSENCE_PATTERNS.find(([, re]) => re.test(s));
        if (!matched) continue;
        if (matched[2] === 'advisory') {
          advisory++;
          advisoryGuides.add(g.slug);
          continue;
        }
        hits++;
        if (!perGuide.has(g.slug)) perGuide.set(g.slug, []);
        perGuide.get(g.slug)!.push(`  [${matched[0]}] ${field}\n      ${s.trim().slice(0, 300)}`);
      }
    }
  }
  for (const [slug, rows] of [...perGuide].sort()) {
    console.log(`\n### ${slug}`);
    console.log([...new Set(rows)].join('\n'));
  }
  console.log(`\nABSENCE CLAIMS (defect tier): ${hits} across ${perGuide.size} guides`);
  console.log(
    `ADVISORY tier ("What the spec sheet does not tell you: ..." frame, names no ` +
      `competitor): ${advisory} across ${advisoryGuides.size} guides — adjudicated as a class, not swept`,
  );
  return hits;
}

/**
 * A citation orphan: a rendered NON-PICK field naming a suppressed pick's brand
 * or product where no surviving pick answers to that name.
 */
function auditOrphans(only: Set<string> | null): number {
  const NON_PICK = /^(reviewMethod|sources\.|methodology\.|content|topPicks|headings)/;
  let hits = 0;
  const perGuide = new Map<string, string[]>();
  for (const g of getAllGuides()) {
    if (only && !only.has(g.slug)) continue;
    const sup = g.suppressedPicks ?? [];
    if (!sup.length) continue;
    const survivingLower = (g.picks ?? []).map((p) => p.name.toLowerCase());
    for (const sp of sup) {
      // Brand names get a LOWER floor than product names and aliases.
      //
      // A 5-character floor on everything let four-letter brands through —
      // KONG, WRTZ, KVP each survived in a rendered reviewMethod while this
      // audit reported the guide clean. Short brand names are not less
      // distinctive, they are just shorter, and they are exactly the ones a
      // human sweep also skims past. Word-boundary matching keeps the lower
      // floor from firing on substrings ("KVP" inside a longer token).
      const needles = new Set<string>();
      for (const n of [sp.name, ...(sp.aliases ?? [])]) {
        if (n && n.length >= 5) needles.add(n);
      }
      if (sp.brand && sp.brand.length >= 3) needles.add(sp.brand);
      for (const needle of needles) {
        const l = needle.toLowerCase();
        if (survivingLower.some((n) => n.includes(l))) continue;
        // Short needles must match as a whole word, not a substring.
        const wordBounded =
          needle.length < 5
            ? new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
            : null;
        for (const [field, text] of renderedProse(g, sp)) {
          if (!NON_PICK.test(field)) continue;
          const i = wordBounded ? text.search(wordBounded) : text.toLowerCase().indexOf(l);
          if (i === -1) continue;
          hits++;
          if (!perGuide.has(g.slug)) perGuide.set(g.slug, []);
          perGuide
            .get(g.slug)!
            .push(
              `  ${field} — names suppressed "${sp.name.slice(0, 38)}"\n      …${text
                .slice(Math.max(0, i - 80), i + l.length + 80)
                .replace(/\s+/g, ' ')}…`,
            );
        }
      }
    }
  }
  for (const [slug, rows] of [...perGuide].sort()) {
    console.log(`\n### ${slug}`);
    console.log([...new Set(rows)].join('\n'));
  }
  console.log(`\nCITATION ORPHANS in rendered non-pick fields: ${hits} across ${perGuide.size} guides`);
  return hits;
}

const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith('--')) ?? 'both';
const touchedIdx = args.indexOf('--touched');
const only =
  touchedIdx !== -1 && args[touchedIdx + 1]
    ? new Set(
        fs
          .readFileSync(args[touchedIdx + 1], 'utf8')
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
      )
    : null;

if (only) console.log(`(scoped to ${only.size} guides)`);
if (mode === 'absence' || mode === 'both') auditAbsence(only);
if (mode === 'orphans' || mode === 'both') auditOrphans(only);
