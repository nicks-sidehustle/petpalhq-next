#!/usr/bin/env node
/**
 * backfill-authority-sources.cjs  (one-off transform)
 *
 * For each batch-20 guide, reads the archived research packet at
 * .batch-archive/batch-20/research/{slug}.json, converts each pick's
 * evidence[] strings ("Outlet: stat/finding") into structured
 * authoritySources, and injects them into the matching pick in
 * src/content/guides/{slug}.md frontmatter.
 *
 * Join key: ASIN (research pick asin === markdown pick asin). Surgical text
 * insertion (the authoritySources: YAML block is inserted directly after each
 * pick's `asin:` line) to keep the diff minimal and preserve the multi-line
 * `body: |` blocks and all existing formatting.
 *
 * Rules (per the Phase-1.5 spec):
 *   - outlet = text before the first ": " in the evidence string.
 *   - stat   = text after the first ": ".
 *   - url    = Amazon affiliate URL for "Amazon listing" evidence; else "".
 *             (Never fabricate outlet URLs.)
 *   - supports = inferred by context keywords; default "general".
 *   - accessed = packet researchDate (YYYY-MM-DD).
 *
 * Idempotent: skips any pick that already has an `authoritySources:` key.
 *
 * Usage:  node scripts/backfill-authority-sources.cjs [--dry-run]
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const RESEARCH_DIR = path.join(ROOT, '.batch-archive/batch-20/research');
const GUIDES_DIR = path.join(ROOT, 'src/content/guides');
const AFFILIATE_TAG = 'petpalhq08-20';
const DRY_RUN = process.argv.includes('--dry-run');

/** Canonical Amazon affiliate URL for a given ASIN (mirrors buildAmazonUrl). */
function amazonUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

/** Infer the `supports` category from evidence text. Default "general". */
function inferSupports(outlet, stat) {
  const t = `${outlet} ${stat}`.toLowerCase();
  if (/amazon listing/.test(outlet.toLowerCase())) return 'spec';
  if (/\bbest (overall|value|pick)\b|recommend|gold standard|top (pick|two|choice)|names? the\b|editor/.test(t)) {
    return 'recommendation';
  }
  if (/\btest(ed|s|ing)?\b|head-to-head|same-dog|trial|lab\b|measured/.test(t)) return 'test-result';
  if (/\bvs\b|versus|compared|comparison|edges? out|differ|disagree|agree(d|ing)?/.test(t)) return 'comparison';
  if (/warrant|years?\b|durable|durability|long-term|holds up|rust|weatherproof|build quality/.test(t)) {
    return 'durability';
  }
  if (/safe(ty)?|toxic|hazard|injur|harm|vet(erinary)?|health|diagnos|risk marker/.test(t)) return 'safety';
  if (/price|\$\d|cheaper|value|cost|affordable|budget/.test(t)) return 'value';
  if (/\bmm\b|inch|hz|watt|lumen|breeds?|markers?|conditions?|capacity|ports?|gallon|liter|spec/.test(t)) {
    return 'spec';
  }
  return 'general';
}

/**
 * Convert one evidence string into a structured authoritySource.
 * Splits on the FIRST ": " so the outlet keeps parenthetical qualifiers and
 * the stat keeps any later colons.
 */
function evidenceToSource(evidence, asin, researchDate) {
  const idx = evidence.indexOf(': ');
  let outlet;
  let stat;
  if (idx === -1) {
    // No colon delimiter — treat the whole string as the stat under a generic outlet.
    outlet = 'Source';
    stat = evidence.trim();
  } else {
    outlet = evidence.slice(0, idx).trim();
    stat = evidence.slice(idx + 2).trim();
  }

  // url: Amazon affiliate URL only for "Amazon listing" evidence; never fabricate others.
  const isAmazonListing = /^amazon listing\b/i.test(outlet);
  const url = isAmazonListing ? amazonUrl(asin) : '';

  return {
    outlet,
    url,
    stat,
    supports: inferSupports(outlet, stat),
    accessed: researchDate,
  };
}

/** Escape a string for a double-quoted YAML scalar. */
function yamlScalar(s) {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/**
 * Render an authoritySources array as a YAML block. Indentation:
 *   key      at  4 spaces  ("    authoritySources:")
 *   - item   at  6 spaces  ("      - outlet: ...")
 *   sub-key  at  8 spaces  ("        url: ...")
 * Returns the block WITH a trailing newline, no leading newline.
 */
function renderYamlBlock(sources) {
  const lines = ['    authoritySources:'];
  for (const s of sources) {
    lines.push(`      - outlet: ${yamlScalar(s.outlet)}`);
    lines.push(`        url: ${yamlScalar(s.url)}`);
    lines.push(`        stat: ${yamlScalar(s.stat)}`);
    lines.push(`        supports: ${yamlScalar(s.supports)}`);
    lines.push(`        accessed: ${yamlScalar(s.accessed)}`);
  }
  return lines.join('\n') + '\n';
}

/**
 * Insert the YAML block immediately after a specific pick's `asin:` line.
 * We locate the asin line by its exact value within the frontmatter region.
 */
function insertAfterAsin(fileText, asin, yamlBlock) {
  // Match the indented asin line carrying this exact ASIN (quoted or bare).
  const re = new RegExp(`^([ \\t]*asin:[ \\t]*["']?${asin}["']?[ \\t]*)$`, 'm');
  const m = fileText.match(re);
  if (!m) return { text: fileText, inserted: false };
  const lineEnd = m.index + m[0].length;
  // Insert after the asin line's newline.
  const nlIdx = fileText.indexOf('\n', lineEnd);
  const insertAt = nlIdx === -1 ? fileText.length : nlIdx + 1;
  const next = fileText.slice(0, insertAt) + yamlBlock + fileText.slice(insertAt);
  return { text: next, inserted: true };
}

// ─── Main ──────────────────────────────────────────────────────────────────

const researchFiles = fs.existsSync(RESEARCH_DIR)
  ? fs.readdirSync(RESEARCH_DIR).filter((f) => f.endsWith('.json')).sort()
  : [];

let guidesUpdated = 0;
const skipped = [];
const perGuide = [];

for (const rf of researchFiles) {
  const slug = rf.replace(/\.json$/, '');
  const guidePath = path.join(GUIDES_DIR, `${slug}.md`);

  if (!fs.existsSync(guidePath)) {
    skipped.push(`${slug} (no matching guide markdown)`);
    continue;
  }

  let packet;
  try {
    packet = JSON.parse(fs.readFileSync(path.join(RESEARCH_DIR, rf), 'utf8'));
  } catch (e) {
    skipped.push(`${slug} (research packet JSON parse error: ${e.message})`);
    continue;
  }

  const researchDate = packet.researchDate || '';
  const picks = Array.isArray(packet.picks) ? packet.picks : [];
  if (picks.length === 0) {
    skipped.push(`${slug} (no picks in research packet)`);
    continue;
  }

  let fileText = fs.readFileSync(guidePath, 'utf8');

  // Idempotency: if the guide already carries any authoritySources, skip it.
  if (/^\s*authoritySources:/m.test(fileText)) {
    skipped.push(`${slug} (already has authoritySources — left untouched)`);
    continue;
  }

  let picksInjected = 0;
  let sourceCount = 0;

  for (const pick of picks) {
    const asin = pick.asin;
    const evidence = Array.isArray(pick.evidence) ? pick.evidence : [];
    if (!asin || evidence.length === 0) continue;

    const sources = evidence
      .map((e) => evidenceToSource(e, asin, researchDate))
      .filter((s) => s.outlet && s.stat);
    if (sources.length === 0) continue;

    const block = renderYamlBlock(sources);
    const res = insertAfterAsin(fileText, asin, block);
    if (res.inserted) {
      fileText = res.text;
      picksInjected += 1;
      sourceCount += sources.length;
    }
  }

  if (picksInjected === 0) {
    skipped.push(`${slug} (no picks matched by ASIN — nothing injected)`);
    continue;
  }

  if (!DRY_RUN) {
    fs.writeFileSync(guidePath, fileText, 'utf8');
  }
  guidesUpdated += 1;
  perGuide.push(`${slug}: ${picksInjected} picks / ${sourceCount} sources`);
}

console.log(`\nbackfill-authority-sources ${DRY_RUN ? '(DRY RUN) ' : ''}— ${researchFiles.length} research packets scanned.`);
console.log(`guidesUpdated: ${guidesUpdated}`);
for (const g of perGuide) console.log(`  ✓ ${g}`);
if (skipped.length) {
  console.log(`\nskipped (${skipped.length}):`);
  for (const s of skipped) console.log(`  - ${s}`);
}
