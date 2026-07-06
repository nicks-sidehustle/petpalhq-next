#!/usr/bin/env node
/**
 * asin-image-parity.mjs — deterministic pre-ship lint (no LLM).
 *
 * Asserts ASIN⇄image XOR-parity on every product pick in a guide-picks markdown corpus:
 *   - a NON-empty `asin:` MUST have a NON-empty `m.media-amazon.com` `image:` (a real
 *     Amazon product image), and
 *   - an EMPTY `asin:` MUST have an EMPTY `image:`.
 *
 * Why: an Amazon pick with an ASIN but no Amazon image (or a placeholder) renders a broken
 * card; a pick with no ASIN but a stray Amazon image implies a buyable product that isn't
 * wired. This is the pre-ship lint from the 2026-07 portfolio-parity audit finding — wire it
 * into the `validate:content` chain so it fails the build before such a pick ships.
 *
 * Scans the `picks:` block of each `.md` guide (line-based; no YAML dep). Exit 1 on any
 * violation, 0 if clean.
 *
 * Usage:  node asin-image-parity.mjs
 * Env:    ASIN_PARITY_CONTENT_DIR (default src/content/guides)
 *         ASIN_PARITY_IMAGE_HOST  (default m.media-amazon.com)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const CONTENT_DIR = process.env.ASIN_PARITY_CONTENT_DIR || 'src/content/guides';
const IMAGE_HOST = process.env.ASIN_PARITY_IMAGE_HOST || 'm.media-amazon.com';
const dir = join(REPO, CONTENT_DIR);

if (!existsSync(dir)) {
  console.error(`asin-image-parity: content dir not found: ${CONTENT_DIR}`);
  process.exit(2);
}

const unquote = (v) => v.trim().replace(/^['"]|['"]$/g, '').trim();

// Extract [{asin, image, rank/name label}] from the `picks:` block of a guide file.
function extractPicks(text) {
  const lines = text.split('\n');
  const picks = [];
  let inPicks = false;
  let picksIndent = 0;
  let cur = null;
  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    const trimmed = line.trim();
    if (!inPicks) {
      if (/^picks:\s*(\[\s*\])?\s*$/.test(trimmed) && /^picks:/.test(line.replace(/^\s+/, ''))) {
        // only treat a top-level (or frontmatter-level) `picks:` as the block start
        inPicks = true;
        picksIndent = line.length - line.trimStart().length;
        if (/\[\s*\]/.test(trimmed)) { inPicks = false; } // picks: [] → empty
      }
      continue;
    }
    const indent = line.length - line.trimStart().length;
    // a non-blank line at or below the picks indent that isn't a list item ends the block
    if (trimmed && indent <= picksIndent && !/^-\s/.test(trimmed)) {
      if (cur) picks.push(cur);
      cur = null;
      inPicks = false;
      continue;
    }
    const item = trimmed.match(/^-\s+(.*)$/);
    if (item && indent === picksIndent + 2) {
      if (cur) picks.push(cur);
      cur = { asin: '', image: '', name: '', rank: '' };
      const rest = item[1];
      const kv = rest.match(/^(\w+):\s*(.*)$/);
      if (kv) applyField(cur, kv[1], kv[2]);
    } else if (cur) {
      const kv = trimmed.match(/^(\w+):\s*(.*)$/);
      if (kv) applyField(cur, kv[1], kv[2]);
    }
  }
  if (cur) picks.push(cur);
  return picks;
}

function applyField(pick, key, val) {
  const v = unquote(val);
  if (key === 'asin') pick.asin = v;
  else if (key === 'image' || key === 'imageUrl' || key === 'img') pick.image = v;
  else if (key === 'name' || key === 'productName') pick.name = v; // name wins the label
  else if (key === 'rank' && !pick.rank) pick.rank = v;
}

const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
const violations = [];
let picksChecked = 0;

for (const f of files) {
  const text = readFileSync(join(dir, f), 'utf8');
  if (!/^\s*picks:/m.test(text)) continue;
  for (const p of extractPicks(text)) {
    picksChecked++;
    const hasAsin = !!p.asin;
    const hasImg = !!p.image;
    const imgIsAmazon = hasImg && p.image.includes(IMAGE_HOST);
    const who = `${f} · pick "${p.name || (p.rank ? `rank ${p.rank}` : '') || p.asin || '(unnamed)'}"`;
    if (hasAsin && !imgIsAmazon) {
      violations.push(`${who}: asin="${p.asin}" but image ${hasImg ? `is not an ${IMAGE_HOST} URL ("${p.image}")` : 'is EMPTY'} (non-empty asin ⇒ non-empty ${IMAGE_HOST} image)`);
    } else if (!hasAsin && hasImg && imgIsAmazon) {
      violations.push(`${who}: empty asin but has an ${IMAGE_HOST} image ("${p.image}") (empty asin ⇒ empty image)`);
    }
  }
}

if (violations.length) {
  console.error(`\n❌ asin-image-parity: ${violations.length} violation(s) across ${files.length} guide(s) (${picksChecked} picks checked):`);
  for (const v of violations) console.error(`   • ${v}`);
  process.exit(1);
}
console.log(`✅ asin-image-parity: ${picksChecked} picks across ${files.length} guides — all asin⇄image parity holds.`);
process.exit(0);
