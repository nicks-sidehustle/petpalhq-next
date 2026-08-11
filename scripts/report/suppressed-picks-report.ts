/**
 * Suppression contradiction report (owner ruling 2026-08-10).
 *
 * Suppressing an unbuyable pick fixes the "we sell something Amazon doesn't
 * stock" defect, but it silently breaks the PAGE: a guide that says "our five
 * picks" now shows four, and a guide whose #1 vanished still says "our top pick
 * is...". This report is the inventory of that damage, so the editorial lane can
 * replace the picks with buyable alternatives — highest-AOV first.
 *
 * Detects mechanically:
 *  - numeric count claims ("five picks", "all three", "six categories")
 *  - references to the suppressed product BY NAME anywhere in reader-visible
 *    prose (shortAnswer, body, FAQ, bottomLine, comparison, deck, meta, topPicks)
 *  - derived math that included the suppressed pick's price
 *  - DECAPITATED: the suppressed pick was rank 1 / the anchor of the guide
 *
 * Sorted by suppressed-pick price DESCENDING = the AOV replacement queue.
 *
 * Run: npx tsx scripts/report/suppressed-picks-report.ts
 * Writes: reports/suppressed-picks.md
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAllGuides, type Guide, type GuidePick } from '../../src/lib/guides';

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

/**
 * Two tiers, because a bare "<number> <noun>" match is far too loose.
 *
 * HIGH — "<n> picks" is unambiguously a claim about THIS guide's roster, and is
 * the only tier safe to auto-correct.
 * LOW  — generic nouns. Often a real roster claim ("the four systems"), often
 * not ("sub-$30 products", "second of 11 models"). Listed for human review, never
 * auto-corrected.
 */
const PRIMARY_NOUNS = '(?:picks?)';
const SECONDARY_NOUNS =
  '(?:products?|options?|choices?|models?|systems?|kits?|contenders?|finalists?|recommendations?|winners?|categories|components?)';

interface CountClaim {
  field: string;
  text: string;
  claimed: number;
  confidence: 'high' | 'low';
}

function priceToNumber(price?: string): number {
  const m = price?.match(/\$([\d,.]+)/);
  return m ? parseFloat(m[1].replace(/,/g, '')) : 0;
}

/** Collect every reader-visible prose field of a guide, labelled. */
function proseFields(guide: Guide, raw: Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const push = (label: string, v: unknown) => {
    if (typeof v === 'string' && v.trim()) out.push([label, v]);
  };
  push('title', guide.title);
  push('description', guide.description);
  push('excerpt', guide.excerpt);
  push('shortAnswer', guide.shortAnswer);
  push('whenNotToBuy', guide.whenNotToBuy);
  push('content', guide.content);
  push('deck', raw.deck);
  push('metaDescription', raw.metaDescription);
  guide.bottomLine?.forEach((b, i) => push(`bottomLine[${i}]`, b));
  guide.faqItems?.forEach((f, i) => {
    push(`faq[${i}].question`, f.question);
    push(`faq[${i}].answer`, f.answer);
  });
  guide.comparison?.rows?.forEach((r, i) => {
    push(`comparison.rows[${i}].label`, r.label);
    r.values.forEach((v, j) => push(`comparison.rows[${i}].values[${j}]`, v));
  });
  guide.topPicks?.forEach((tp, i) => {
    push(`topPicks[${i}].name`, tp.name);
    push(`topPicks[${i}].keyFeature`, tp.keyFeature);
  });
  guide.methodology?.factors?.forEach((f, i) =>
    push(`methodology.factors[${i}].definition`, f.definition),
  );
  push('forDogs', guide.forDogs);
  push('forCats', guide.forCats);
  push('ecosystem.narrative', guide.ecosystemSection?.narrative);
  return out;
}

/** Numeric claims about the roster whose number no longer matches the visible count. */
function findCountClaims(fields: Array<[string, string]>, visible: number): CountClaim[] {
  const out: CountClaim[] = [];
  const words = Object.keys(NUMBER_WORDS).join('|');
  for (const [field, text] of fields) {
    const patterns: Array<[RegExp, 'high' | 'low']> = [
      [new RegExp(`\\b(\\d{1,2})\\s+${PRIMARY_NOUNS}\\b`, 'gi'), 'high'],
      [new RegExp(`\\b(${words})\\s+${PRIMARY_NOUNS}\\b`, 'gi'), 'high'],
      [new RegExp(`\\b(\\d{1,2})\\s+${SECONDARY_NOUNS}\\b`, 'gi'), 'low'],
      [new RegExp(`\\b(${words})\\s+${SECONDARY_NOUNS}\\b`, 'gi'), 'low'],
    ];
    for (const [re, confidence] of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const claimed = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUMBER_WORDS[m[1].toLowerCase()];
        if (!claimed || claimed === visible) continue;
        const at = m.index;
        const prev = text.slice(Math.max(0, at - 6), at);
        // "sub-$30 products", "$5 options" — a price, not a roster count.
        if (/[$]\s*$/.test(prev)) continue;
        // "all-in-one kits", "one-day delivery" — part of a hyphenated compound.
        if (/-$/.test(prev)) continue;
        if (/^one\b/i.test(m[1]) && /\bin-$/i.test(prev)) continue;
        out.push({
          field,
          claimed,
          confidence,
          text: text
            .slice(Math.max(0, at - 60), at + m[0].length + 60)
            .replace(/\s+/g, ' ')
            .trim(),
        });
      }
    }
  }
  return out;
}

/** Mentions of the suppressed product by name (or a distinctive model fragment). */
function findNameMentions(fields: Array<[string, string]>, pick: GuidePick): Array<[string, string]> {
  const needles = new Set<string>();
  if (pick.name) needles.add(pick.name);
  pick.aliases?.forEach((a) => a && needles.add(a));
  // Distinctive model fragment: the token carrying digits plus the word before
  // it, e.g. "Reef Octopus Regal 150SSS ..." -> "Regal 150SSS".
  const tokens = (pick.name || '').split(/\s+/);
  const modelIdx = tokens.findIndex((t) => /\d/.test(t) && t.length >= 3);
  if (modelIdx > 0) needles.add(tokens.slice(modelIdx - 1, modelIdx + 1).join(' '));

  const hits: Array<[string, string]> = [];
  for (const [field, text] of fields) {
    // The pick's own body/verdict live on the pick object, not in these fields,
    // so any hit here is prose that OUTLIVES the pick's removal.
    for (const needle of needles) {
      if (needle.length < 4) continue;
      const idx = text.toLowerCase().indexOf(needle.toLowerCase());
      if (idx === -1) continue;
      hits.push([
        field,
        text.slice(Math.max(0, idx - 60), idx + needle.length + 60).replace(/\s+/g, ' ').trim(),
      ]);
      break;
    }
  }
  return hits;
}

/** Prose totals that plausibly summed the suppressed pick's price. */
function findDerivedMath(fields: Array<[string, string]>, pick: GuidePick): Array<[string, string]> {
  const price = priceToNumber(pick.price);
  if (!price) return [];
  const hits: Array<[string, string]> = [];
  for (const [field, text] of fields) {
    for (const m of text.matchAll(/\$([\d,]{3,})(?:\.\d\d)?/g)) {
      const total = parseFloat(m[1].replace(/,/g, ''));
      if (total <= price) continue;
      const at = m.index ?? 0;
      const around = text.slice(Math.max(0, at - 90), at + 90);
      if (!/\b(total|altogether|all in|combined|full build|whole build|sum|budget|entire)\b/i.test(around)) {
        continue;
      }
      hits.push([field, around.replace(/\s+/g, ' ').trim()]);
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------

const guidesDir = path.join(process.cwd(), 'src/content/guides');
interface Row {
  slug: string;
  pick: GuidePick;
  price: number;
  before: number;
  after: number;
  decapitated: boolean;
  countClaims: CountClaim[];
  nameMentions: Array<[string, string]>;
  derivedMath: Array<[string, string]>;
}

const rows: Row[] = [];
for (const guide of getAllGuides()) {
  if (!guide.suppressedPicks?.length) continue;
  const rawFile = path.join(guidesDir, `${guide.slug}.md`);
  const raw = fs.existsSync(rawFile)
    ? (matter(fs.readFileSync(rawFile, 'utf8')).data as Record<string, unknown>)
    : {};
  const fields = proseFields(guide, raw);
  const after = guide.picks?.length ?? 0;
  const before = after + guide.suppressedPicks.length;
  const visibleRanks = (guide.picks ?? []).map((p) => p.rank || 99);
  const minVisibleRank = visibleRanks.length ? Math.min(...visibleRanks) : 99;

  for (const pick of guide.suppressedPicks) {
    rows.push({
      slug: guide.slug,
      pick,
      price: priceToNumber(pick.price),
      before,
      after,
      // Anchor = was rank 1, or now outranks every surviving pick.
      decapitated: pick.rank === 1 || pick.rank < minVisibleRank,
      countClaims: findCountClaims(fields, after),
      nameMentions: findNameMentions(fields, pick),
      derivedMath: findDerivedMath(fields, pick),
    });
  }
}

rows.sort((a, b) => b.price - a.price);

const affectedGuides = new Set(rows.map((r) => r.slug));
const decapitated = rows.filter((r) => r.decapitated);
const withContradictions = rows.filter(
  (r) => r.countClaims.length || r.nameMentions.length || r.derivedMath.length,
);
const emptied = rows.filter((r) => r.after === 0);

const md: string[] = [];
md.push('# Suppressed picks — contradiction report');
md.push('');
md.push('Generated from the live price snapshot. Owner ruling 2026-08-10: picks with no buyable');
md.push('offer are suppressed at render, not shown with an "unavailable" label.');
md.push('');
md.push(`- Suppressed pick rows: **${rows.length}**`);
md.push(`- Guides affected: **${affectedGuides.size}**`);
md.push(`- DECAPITATED (lost their #1 / anchor pick): **${decapitated.length}**`);
md.push(`- Guides left with ZERO picks: **${emptied.length}**`);
md.push(`- Rows with a detected prose contradiction: **${withContradictions.length}**`);
md.push('');
md.push('## AOV replacement queue (highest suppressed price first)');
md.push('');
md.push('| # | Price | Guide | Suppressed pick | ASIN | Rank | Picks before→after | Decapitated |');
md.push('|---|---|---|---|---|---|---|---|');
rows.forEach((r, i) => {
  md.push(
    `| ${i + 1} | $${r.price.toFixed(2)} | \`${r.slug}\` | ${r.pick.name} | \`${r.pick.asin}\` | ` +
      `${r.pick.rank} | ${r.before} → ${r.after} | ${r.decapitated ? '**YES**' : 'no'} |`,
  );
});
md.push('');
md.push('## Detected contradictions');
md.push('');
for (const r of rows) {
  if (!r.countClaims.length && !r.nameMentions.length && !r.derivedMath.length) continue;
  md.push(
    `### \`${r.slug}\` — ${r.pick.name} ($${r.price.toFixed(2)}${r.decapitated ? ', DECAPITATED' : ''})`,
  );
  md.push(`Picks ${r.before} → ${r.after}.`);
  md.push('');
  const high = r.countClaims.filter((c) => c.confidence === 'high');
  const low = r.countClaims.filter((c) => c.confidence === 'low');
  if (high.length) {
    md.push(`**Count claims — HIGH confidence, roster wording (now ${r.after} visible):**`);
    for (const c of high) md.push(`- \`${c.field}\` claims **${c.claimed}**: "…${c.text}…"`);
    md.push('');
  }
  if (low.length) {
    md.push(`**Count claims — LOW confidence, review manually (now ${r.after} visible):**`);
    for (const c of low) md.push(`- \`${c.field}\` claims **${c.claimed}**: "…${c.text}…"`);
    md.push('');
  }
  if (r.nameMentions.length) {
    md.push('**Prose still names the suppressed product:**');
    for (const [f, t] of r.nameMentions) md.push(`- \`${f}\`: "…${t}…"`);
    md.push('');
  }
  if (r.derivedMath.length) {
    md.push('**Derived total that may have included its price:**');
    for (const [f, t] of r.derivedMath) md.push(`- \`${f}\`: "…${t}…"`);
    md.push('');
  }
}

const outDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'suppressed-picks.md'), md.join('\n'));

console.log(`Suppressed rows: ${rows.length} across ${affectedGuides.size} guides`);
console.log(`DECAPITATED: ${decapitated.length}`);
console.log(`Guides left with zero picks: ${emptied.length}`);
console.log(`Rows with detected contradictions: ${withContradictions.length}`);
const highRows = rows.filter((r) => r.countClaims.some((c) => c.confidence === 'high'));
const highGuides = new Set(highRows.map((r) => r.slug));
console.log(`Rows with HIGH-confidence count claims: ${highRows.length} (${highGuides.size} guides)`);
console.log('\nHIGH-confidence count claims by guide:');
for (const slug of highGuides) {
  const r = highRows.find((x) => x.slug === slug)!;
  const cs = [...new Set(r.countClaims.filter((c) => c.confidence === 'high').map((c) => c.claimed))];
  console.log(`  ${slug}: claims ${cs.join('/')} but ${r.after} visible`);
}
console.log('\nTop 10 by AOV:');
rows.slice(0, 10).forEach((r, i) => {
  console.log(
    `  ${String(i + 1).padStart(2)}. $${r.price.toFixed(2).padStart(8)}  ${r.slug}  ${r.pick.name}` +
      `  [rank ${r.pick.rank}, ${r.before}→${r.after}${r.decapitated ? ', DECAPITATED' : ''}]`,
  );
});
console.log('\nDECAPITATED guides:');
decapitated.forEach((r) => {
  console.log(
    `  ${r.slug}  (#${r.pick.rank} ${r.pick.name}, $${r.price.toFixed(2)}, ${r.before}→${r.after})`,
  );
});
console.log('\nWritten: reports/suppressed-picks.md');
