#!/usr/bin/env node
/**
 * honesty-audit.mjs — canonical portable Tier-2 honesty audit (portfolio parity).
 *
 * Ported from SmartHomeExplorer's scripts/omega/honesty-audit.wf.js +
 * honesty-audit-v2.wf.js (the load-bearing content-integrity gate the deterministic
 * build gates are BLIND to). This is the standalone, dependency-free version: it runs
 * under plain `node` (>=18, global fetch) with only ANTHROPIC_API_KEY in the env, so it
 * drops into any portfolio repo — omega (guides-v2 + .pipeline-state) or legacy-md —
 * without an SDK install.
 *
 * What it CATCHES that a Zod/structural build gate cannot:
 *   1. fabricated-stat        — a number+unit (Pa, mAh, cu ft, dB, lumens, in, %, $…)
 *                               that contradicts, or appears NOWHERE in, any ground truth.
 *   2. internal-inconsistency — superlatives ("highest/only/Nx"), ratios/multipliers,
 *                               prices, model names, and feature claims that contradict the
 *                               guide's OWN ranked products / ground truth.
 *   3. misattributed-source   — prose "X notes/tested/found" naming an outlet that does not
 *                               cover THAT product (roundup convention) per the coverage map.
 *   4. invented-quote         — an expert quote unsupported by the coverage/authority data.
 *   5. deal-dishonesty        — fabricated discount %, fake MSRP, unbased "all-time low".
 *
 * Ground truth (auto-discovered per guide, priority order):
 *   omega mode  — .pipeline-state/{slug}/03-products.json (prices/names/specs, authoritative)
 *                 .pipeline-state/{slug}/_coverage.json    (per-product → covering outlets)
 *                 .pipeline-state/{slug}/04-authority.json (proprietary score plan/factors)
 *                 .pipeline-state/{slug}/*.md|*.json        (brief + other state, size-capped)
 *   legacy mode — the guide's own frontmatter (picks carry asin/specs/quotes) IS the primary
 *                 structured ground truth, plus any configured data file (products/guides.ts),
 *                 line-extracted to the ids the guide references.
 *   both        — .claude/research-packets/{slug}.md (if present) as prose ground truth.
 *
 * Severity: proven-false = contradicts ground truth OR internally contradicts the guide's own
 * data OR the outlet demonstrably does not cover the product (BLOCKS ship, exit 1).
 * unverifiable = cannot confirm either way (empty coverage/quotes, no ground-truth file) (WARNS).
 * K adversarial passes per guide are unioned to tame LLM non-determinism.
 *
 * Usage:
 *   node honesty-audit.mjs <slug> [<slug> …]        # audit by slug (auto-resolves path)
 *   node honesty-audit.mjs --guide path/to/file.mdx # audit an explicit file
 *   npm run audit:honesty -- <slug>                 # wired form
 * Flags:  --k=N  --model=<id>  --json  --quiet
 * Env:    ANTHROPIC_API_KEY (required)
 *         HONESTY_AUDIT_MODEL     (default claude-sonnet-4-6)
 *         HONESTY_AUDIT_CONTENT_DIRS  (comma list; default src/content/guides-v2,src/content/guides)
 *         HONESTY_AUDIT_STATE_DIR (default .pipeline-state)
 *         HONESTY_AUDIT_PACKET_DIR(default .claude/research-packets)
 *         HONESTY_AUDIT_DATA_FILES(comma list of extra ground-truth data files, line-extracted)
 *         HONESTY_AUDIT_BRAND     (niche label used in the prompt; default "this affiliate site")
 *         HONESTY_AUDIT_K         (default 2)
 *
 * Exit: 0 = all audited guides PASS (no proven-false). 1 = at least one proven-false. 2 = usage/setup error.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const REPO = process.env.HONESTY_AUDIT_REPO || process.cwd();
const MODEL = process.env.HONESTY_AUDIT_MODEL || 'claude-sonnet-4-6';
const CONTENT_DIRS = (process.env.HONESTY_AUDIT_CONTENT_DIRS || 'src/content/guides-v2,src/content/guides')
  .split(',').map((s) => s.trim()).filter(Boolean);
const STATE_DIR = process.env.HONESTY_AUDIT_STATE_DIR || '.pipeline-state';
const PACKET_DIR = process.env.HONESTY_AUDIT_PACKET_DIR || '.claude/research-packets';
const DATA_FILES = (process.env.HONESTY_AUDIT_DATA_FILES || '').split(',').map((s) => s.trim()).filter(Boolean);
const BRAND = process.env.HONESTY_AUDIT_BRAND || 'this affiliate site';

const FILE_CAP = 42_000; // per-file char cap fed to the model
const EXTRACT_CTX = 2; // lines of context around a data-file match

// ── arg parsing ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
let K = Number(process.env.HONESTY_AUDIT_K || 2);
let modelOverride = null;
let asJson = false;
let quiet = false;
const guides = []; // {slug, path}
const slugs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') asJson = true;
  else if (a === '--quiet') quiet = true;
  else if (a.startsWith('--k=')) K = Number(a.slice(4)) || K;
  else if (a === '--k') K = Number(argv[++i]) || K;
  else if (a.startsWith('--model=')) modelOverride = a.slice(8);
  else if (a === '--model') modelOverride = argv[++i];
  else if (a === '--guide') { const p = argv[++i]; if (p) guides.push({ slug: basename(p).replace(/\.(mdx|md)$/, ''), path: resolve(REPO, p) }); }
  else if (a.startsWith('--')) { /* ignore unknown flags */ }
  else slugs.push(a);
}
const ACTIVE_MODEL = modelOverride || MODEL;

const log = (...a) => { if (!quiet) console.error(...a); };

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('honesty-audit: ANTHROPIC_API_KEY is not set. Load creds first (e.g. `eval "$(scripts/automation/load-creds.sh --print anthropic)"`).');
  process.exit(2);
}

// ── path + ground-truth resolution ───────────────────────────────────────────
function resolveGuide(slug) {
  for (const dir of CONTENT_DIRS) {
    for (const ext of ['.mdx', '.md']) {
      const p = join(REPO, dir, slug + ext);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

function readCapped(p) {
  try {
    let t = readFileSync(p, 'utf8');
    if (t.length > FILE_CAP) t = t.slice(0, FILE_CAP) + `\n…[truncated at ${FILE_CAP} chars]`;
    return t;
  } catch { return null; }
}

// Extract only the lines of a large data file that reference an id/asin token the guide uses.
function extractRelevant(dataPath, tokens) {
  try {
    const lines = readFileSync(dataPath, 'utf8').split('\n');
    if (lines.length < 4000 && readFileSync(dataPath, 'utf8').length <= FILE_CAP) {
      return readCapped(dataPath); // small file → include whole
    }
    const keep = new Set();
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (tokens.some((t) => t.length >= 4 && l.includes(t))) {
        for (let j = Math.max(0, i - EXTRACT_CTX); j <= Math.min(lines.length - 1, i + EXTRACT_CTX); j++) keep.add(j);
      }
    }
    if (keep.size === 0) return null;
    const idx = [...keep].sort((a, b) => a - b);
    let out = '';
    let prev = -2;
    for (const i of idx) {
      if (i !== prev + 1) out += `\n… (line ${i + 1})\n`;
      out += lines[i] + '\n';
      prev = i;
      if (out.length > FILE_CAP) { out += '\n…[truncated]'; break; }
    }
    return out;
  } catch { return null; }
}

// Pull candidate id/asin tokens out of a guide body to drive data-file extraction.
function guideTokens(text) {
  const toks = new Set();
  // [[product:ID]] / [[page:ID]] refs, quoted ids, ASIN-like (B0XXXXXXXX), and slug-ish tokens.
  for (const m of text.matchAll(/\[\[(?:product|page):([a-z0-9-]+)\]\]/gi)) toks.add(m[1]);
  for (const m of text.matchAll(/\bB0[A-Z0-9]{8}\b/g)) toks.add(m[0]);
  for (const m of text.matchAll(/(?:id|asin|productId|slug)["'`:\s=]+["'`]([a-z0-9-]{4,})["'`]/gi)) toks.add(m[1]);
  return [...toks];
}

function gatherGroundTruth(slug, guideText) {
  const parts = [];
  let mode = 'legacy';
  const stateDir = join(REPO, STATE_DIR, slug);
  if (existsSync(stateDir) && statSync(stateDir).isDirectory()) {
    mode = 'omega';
    // priority files first
    for (const name of ['03-products.json', '_coverage.json', '04-authority.json']) {
      const p = join(stateDir, name);
      if (existsSync(p)) parts.push({ label: `${STATE_DIR}/${slug}/${name}`, body: readCapped(p) });
    }
    // any remaining brief/state files (json + md), capped, skipping ones already added and big drafts
    for (const f of readdirSync(stateDir)) {
      if (['03-products.json', '_coverage.json', '04-authority.json'].includes(f)) continue;
      if (!/\.(json|md)$/.test(f)) continue;
      if (/^_skeleton|drafts?\b|visualized/i.test(f)) continue;
      const p = join(stateDir, f);
      try { if (statSync(p).isFile()) parts.push({ label: `${STATE_DIR}/${slug}/${f}`, body: readCapped(p) }); } catch { /* skip */ }
    }
  }
  // research packet (both modes)
  const packet = join(REPO, PACKET_DIR, slug + '.md');
  if (existsSync(packet)) parts.push({ label: `${PACKET_DIR}/${slug}.md`, body: readCapped(packet) });
  // configured extra data files, line-extracted to the ids the guide references
  if (DATA_FILES.length) {
    const tokens = guideTokens(guideText);
    for (const df of DATA_FILES) {
      const p = resolve(REPO, df);
      if (!existsSync(p)) continue;
      const body = extractRelevant(p, tokens);
      if (body) parts.push({ label: `${df} (relevant lines)`, body });
    }
  }
  return { mode, parts: parts.filter((p) => p.body) };
}

// ── prompt + schema ──────────────────────────────────────────────────────────
const DEFECT_TOOL = {
  name: 'report_defects',
  description: 'Report every honesty defect found in the guide, each classified by class and severity.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['slug', 'defects'],
    properties: {
      slug: { type: 'string' },
      defects: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['class', 'severity', 'detail'],
          properties: {
            class: { type: 'string', enum: ['fabricated-stat', 'internal-inconsistency', 'misattributed-source', 'invented-quote', 'deal-dishonesty'] },
            severity: { type: 'string', enum: ['proven-false', 'unverifiable'] },
            detail: { type: 'string', description: 'Quote the EXACT offending text + cite the ground-truth value it contradicts (or state that it appears nowhere).' },
          },
        },
      },
      notes: { type: 'string' },
    },
  },
};

function buildPrompt(slug, guidePath, guideText, gt) {
  const gtBlocks = gt.parts.length
    ? gt.parts.map((p) => `----- GROUND TRUTH: ${p.label} -----\n${p.body}`).join('\n\n')
    : '(no structured ground-truth files found — the guide FRONTMATTER is your primary ground truth; treat unbacked outlet claims / empty quote data as UNVERIFIABLE, not proven-false)';
  return (
    `ADVERSARIAL honesty audit of ONE ${BRAND} affiliate guide. Your job: CATCH fabrication the deterministic build gate cannot. Read-only. Do NOT rewrite the guide.\n\n` +
    `GUIDE FILE: ${guidePath.replace(REPO + '/', '')}\n` +
    `MODE: ${gt.mode} (${gt.mode === 'omega' ? 'pipeline-state ground truth present' : 'legacy — frontmatter is primary ground truth'})\n\n` +
    `Check EACH claim against ALL ground truth below (do not treat any single file as the only source):\n` +
    `1. fabricated-stat: every number+unit (Pa, mAh, cu ft, dB, kWh, lumens, in, %, $, hr, ft…) must trace to a ground-truth value or a cited source. Invented or rounded-up numbers that appear NOWHERE are proven-false.\n` +
    `2. internal-inconsistency (PRIORITY — the build gate misses these; almost always proven-false because checkable from the guide alone):\n` +
    `   a. SUPERLATIVES: every "highest/lowest/only/best/most/fastest/largest/Nx the X" must be TRUE against the guide's OWN ranked products + ground truth.\n` +
    `   b. RATIOS/MULTIPLIERS: every "Nx", "N%", "roughly N times" must match the guide's own comparison-table cells / ground-truth numbers.\n` +
    `   c. PRICES: every $price (hero, table, product review, bottom line, FAQ, chart) must equal that product's ground-truth price. Check EVERY product + EVERY occurrence.\n` +
    `   d. PRODUCT NAMES: the model name in prose must match the ground-truth product name/id (calling one model by another's number is proven-false).\n` +
    `   e. FEATURES: every product feature claim must appear in that product's ground-truth specs (attributing a feature the product lacks is proven-false).\n` +
    `3. misattributed-source: PROSE "X notes/tested/found/rated" must name an outlet that genuinely covers THAT product per the coverage/authority map, under the ROUNDUP CONVENTION (a roundup covers products it ranks; a single review covers one). A proprietary SHE/site score attributed to an outlet's "methodology" IS a misattribution.\n` +
    `4. invented-quote: any expert quote must be supported by the coverage/authority data or research packet.\n` +
    `5. deal-dishonesty: flag fabricated/guaranteed discount %, fake MSRP, unbased "all-time low"/"Prime Day low"/causal price-history claims.\n\n` +
    `PROPRIETARY-SCORE ADJUDICATION: a site's own composite score is the SITE's metric — verify it by RECOMPUTING from the guide's published formula applied to that product's per-factor sub-scores (in 04-authority.json or the guide's own factor cells), allowing ±0.1 rounding. A stored "score" field in authority JSON is a possibly-stale cache — do NOT flag a displayed score merely because it differs from that stored field. Flag a score ONLY when it differs from the formula-recomputed value by >0.1, disagrees across slots, or the published formula weights themselves differ across slots.\n\n` +
    `SEVERITY: proven-false = contradicts ground truth, OR internally contradicts the guide's own data, OR the outlet demonstrably does not cover the product. unverifiable = cannot confirm either way (empty/absent quote data, no ground-truth file). When genuinely unsure prefer unverifiable — BUT a stat/name/price/feature that contradicts or appears nowhere IS proven-false.\n\n` +
    `Call report_defects exactly once. Quote the EXACT offending text in each detail. If fully honest, return defects: [].\n\n` +
    `SLUG: ${slug}\n\n` +
    `----- GUIDE -----\n${guideText}\n\n${gtBlocks}\n`
  );
}

// ── one adversarial pass (single Messages API call, forced tool_choice) ────────
async function auditPass(slug, guidePath, guideText, gt) {
  const body = {
    model: ACTIVE_MODEL,
    max_tokens: 4096,
    tools: [DEFECT_TOOL],
    tool_choice: { type: 'tool', name: 'report_defects' },
    messages: [{ role: 'user', content: buildPrompt(slug, guidePath, guideText, gt) }],
  };
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = Number(res.headers.get('retry-after')) * 1000 || (2 ** attempt) * 1500;
        await new Promise((r) => setTimeout(r, wait));
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Anthropic API ${res.status}: ${txt.slice(0, 300)}`);
      }
      const json = await res.json();
      const tool = (json.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_defects');
      if (!tool) return { defects: [] };
      const defects = Array.isArray(tool.input?.defects) ? tool.input.defects : [];
      return { defects: defects.filter((d) => d && d.class && d.severity && d.detail) };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, (2 ** attempt) * 1000));
    }
  }
  throw lastErr || new Error('audit pass failed');
}

async function auditGuide(slug, guidePath) {
  const guideText = readFileSync(guidePath, 'utf8');
  const gt = gatherGroundTruth(slug, guideText);
  const acc = [];
  for (let k = 0; k < K; k++) {
    log(`  pass ${k + 1}/${K} — ${slug} (mode=${gt.mode}, ${gt.parts.length} ground-truth file(s))`);
    const r = await auditPass(slug, guidePath, guideText, gt);
    acc.push(...r.defects);
  }
  // dedupe on class + first 120 chars of detail
  const seen = new Set();
  const defects = [];
  for (const d of acc) {
    const key = `${d.class}|${(d.detail || '').slice(0, 120)}`;
    if (!seen.has(key)) { seen.add(key); defects.push(d); }
  }
  const provenFalse = defects.filter((d) => d.severity === 'proven-false');
  const unverifiable = defects.filter((d) => d.severity === 'unverifiable');
  return { slug, mode: gt.mode, verdict: provenFalse.length === 0 ? 'PASS' : 'FAIL', provenFalse, unverifiable };
}

// ── main ──────────────────────────────────────────────────────────────────────
for (const slug of slugs) {
  const p = resolveGuide(slug);
  if (!p) { console.error(`honesty-audit: no guide file found for slug "${slug}" under ${CONTENT_DIRS.join(', ')}`); process.exit(2); }
  guides.push({ slug, path: p });
}
if (guides.length === 0) {
  console.error('honesty-audit: no slugs passed.\n  usage: node honesty-audit.mjs <slug> [<slug> …]   |   --guide path/to/file.mdx');
  process.exit(2);
}

const results = [];
for (const g of guides) {
  log(`\nauditing ${g.slug} …`);
  results.push(await auditGuide(g.slug, g.path));
}

if (asJson) {
  console.log(JSON.stringify({ model: ACTIVE_MODEL, k: K, results }, null, 2));
} else {
  console.log('\n──────── honesty audit ────────');
  for (const r of results) {
    console.log(`\n${r.verdict === 'PASS' ? '✅ PASS' : '❌ FAIL'}  ${r.slug}  (mode=${r.mode})`);
    if (r.provenFalse.length) {
      console.log(`  ${r.provenFalse.length} PROVEN-FALSE (blocks ship):`);
      for (const d of r.provenFalse) console.log(`   • [${d.class}] ${d.detail}`);
    }
    if (r.unverifiable.length) {
      console.log(`  ${r.unverifiable.length} unverifiable (warn):`);
      for (const d of r.unverifiable) console.log(`   • [${d.class}] ${d.detail}`);
    }
    if (!r.provenFalse.length && !r.unverifiable.length) console.log('  no defects found.');
  }
  const failed = results.filter((r) => r.verdict === 'FAIL');
  console.log(`\n${results.length - failed.length}/${results.length} PASS${failed.length ? ` | FAIL: ${failed.map((r) => r.slug).join(', ')}` : ''}`);
}

process.exit(results.some((r) => r.verdict === 'FAIL') ? 1 : 0);
