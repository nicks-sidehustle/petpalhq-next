#!/usr/bin/env node
/**
 * asin-image-parity.mjs — deterministic asin↔image PARITY PRE-SHIP LINT (no LLM).
 *
 * THE DEFECT THIS PREVENTS (petpal Wave-2, fixed in petpalhq-next PR #14, 2026-07-06):
 *   30 guide picks shipped with a non-empty `asin:` but an EMPTY `image:`. The card
 *   renderer silently drops the product photo when `image` is empty, so those guides
 *   shipped with no product images and nobody noticed until a same-day quality report.
 *   Build was green the whole time — the structural/Zod gates are blind to this class.
 *   This lint is the deterministic catch: wire it into `validate:content` so a wave
 *   CANNOT ship a pick whose asin/image parity is broken.
 *
 * THE RULE (per the portfolio-parity WAVE-PLAYBOOK petpal site row):
 *   A NON-EMPTY `asin:` REQUIRES a NON-EMPTY, real Amazon `image:` (an
 *   `https://m.media-amazon.com/…` hotlink from the Creators API). A no-ASIN "search"
 *   pick legitimately keeps `image: ""` — those are NOT violations.
 *
 * CHECKS (evaluated independently per pick over a normalized {slug, pickName, asin, image}):
 *   (a) asin-without-image  [ERROR] — asin non-empty && image empty.
 *                            The exact shipped defect. Renderer drops the photo. BLOCKS ship.
 *   (b) bad-image-host      [ERROR] — image non-empty && not an https://m.media-amazon.com/ URL.
 *                            A stray/placeholder/AI/CDN image where a real Amazon photo belongs.
 *                            BLOCKS ship. (Amazon product photos must be Creators-API hotlinks.)
 *   (c) orphan-image        [WARN]  — image non-empty && asin empty.
 *                            A no-ASIN pick carrying an image implies a buyable product that
 *                            isn't wired to an ASIN. Warned, not blocked (it renders fine and
 *                            is a content decision, not the shipped-defect class).
 *
 * ARCHITECTURE — a lane-agnostic core + a thin per-lane extractor:
 *   • CORE: `checkParity(picks)` takes a normalized list of {slug, pickName, asin, image}
 *     and returns violations. It knows NOTHING about file formats — every lane funnels into it.
 *   • EXTRACTOR: a per-lane function that reads a site's corpus and yields the normalized list.
 *     Implemented now: `petpal-guide-picks` (legacy guide-picks markdown — the `picks:` YAML
 *     block in src/content/guides/*.md). Extension points for the omega lanes are stubbed and
 *     documented below (see EXTRACTORS) — an omega port only writes a ~15-line extractor; the
 *     rules, severities, reporting, and --verify-api all come for free.
 *
 * OPTIONAL API PARITY (--verify-api, opt-in — NOT part of the default gate):
 *   Samples up to N (default 10) asin→image pairs and asks the Amazon Creators API whether
 *   that image URL is actually the primary image the API returns for that ASIN. Confirms the
 *   photo genuinely belongs to the product (catches a real-Amazon image copied onto the wrong
 *   pick). Kept opt-in because it needs live creds and network — flaky/slow for a pre-commit
 *   gate. Load creds first:
 *     cd /Users/Nick/smarthome-explorer-blog && eval "$(scripts/automation/load-creds.sh --print amazon)"
 *   Mismatches are reported as warnings (opt-in tool, never blocks the default gate).
 *
 * Usage:
 *   node asin-image-parity.mjs                       # default lane, exit 1 on any ERROR
 *   node asin-image-parity.mjs --lane=petpal-guide-picks
 *   node asin-image-parity.mjs --json                # machine-readable report
 *   node asin-image-parity.mjs --verify-api          # + sample Creators-API image check
 *   node asin-image-parity.mjs --verify-api --sample=10
 * Env:
 *   ASIN_PARITY_LANE          (default petpal-guide-picks)
 *   ASIN_PARITY_CONTENT_DIR   (default src/content/guides)
 *   ASIN_PARITY_IMAGE_HOST    (default m.media-amazon.com)
 *   AMAZON_CLIENT_ID / AMAZON_CLIENT_SECRET / AMAZON_AFFILIATE_TAG   (only for --verify-api)
 *
 * Exit: 0 = no ERROR violations (warnings allowed). 1 = ≥1 ERROR violation. 2 = usage/setup error.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const IMAGE_HOST = process.env.ASIN_PARITY_IMAGE_HOST || 'm.media-amazon.com';
// A real Amazon product image is an https hotlink on the media host. Rule (b) requires this exact shape.
const AMAZON_IMAGE_RE = new RegExp(`^https://${IMAGE_HOST.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);

// ── CORE CHECKER (lane-agnostic) ──────────────────────────────────────────────
export const RULES = {
  ASIN_WITHOUT_IMAGE: 'asin-without-image',
  BAD_IMAGE_HOST: 'bad-image-host',
  ORPHAN_IMAGE: 'orphan-image',
};

/**
 * checkParity — the only place the rules live. Input: normalized picks
 * [{ slug, pickName, asin, image }]. Output: [{ slug, pickName, rule, severity, message }].
 * asin/image are treated as strings; empty/whitespace/undefined all count as "empty".
 */
export function checkParity(picks) {
  const violations = [];
  for (const pick of picks) {
    const asin = (pick.asin || '').trim();
    const image = (pick.image || '').trim();
    const hasAsin = asin.length > 0;
    const hasImage = image.length > 0;
    const where = { slug: pick.slug, pickName: pick.pickName || asin || '(unnamed pick)' };

    // (a) asin non-empty && image empty → the shipped defect. ERROR.
    if (hasAsin && !hasImage) {
      violations.push({
        ...where, rule: RULES.ASIN_WITHOUT_IMAGE, severity: 'error',
        message: `asin="${asin}" but image is EMPTY — non-empty asin REQUIRES a non-empty ${IMAGE_HOST} image (renderer silently drops the photo).`,
      });
    }
    // (b) image non-empty && not an https://<host>/ URL → wrong/placeholder image. ERROR.
    if (hasImage && !AMAZON_IMAGE_RE.test(image)) {
      violations.push({
        ...where, rule: RULES.BAD_IMAGE_HOST, severity: 'error',
        message: `image="${image}" is not an https://${IMAGE_HOST}/ URL — product images must be real Amazon (Creators-API) hotlinks.`,
      });
    }
    // (c) image non-empty && asin empty → orphan image. WARN only.
    if (hasImage && !hasAsin) {
      violations.push({
        ...where, rule: RULES.ORPHAN_IMAGE, severity: 'warn',
        message: `has image="${image}" but no asin — orphan image (a no-ASIN search pick should keep image: ""). Warn only.`,
      });
    }
  }
  return violations;
}

// ── PER-LANE EXTRACTORS (thin; funnel a corpus → normalized picks) ─────────────
const unquote = (v) => String(v ?? '').trim().replace(/^['"]|['"]$/g, '').trim();

/**
 * parsePicks — extract the `picks:` YAML block of ONE guide-picks markdown file into
 * [{ asin, image, pickName }]. Line-based (no YAML dep). Only the pick items' DIRECT
 * child fields are read (asin/image/name/rank/label); deeper-nested fields
 * (keyFeatures/pros/authoritySources/…) are ignored so a nested `name:` cannot clobber a
 * pick's real name. Exported for the fixture test.
 */
export function parsePicks(text) {
  const lines = text.split('\n');
  const picks = [];
  let inBlock = false;
  let blockIndent = 0; // indent of the `picks:` key
  let itemIndent = 0;  // indent of each `- ` marker (blockIndent + 2)
  let fieldIndent = 0; // indent of a pick's direct child field (blockIndent + 4)
  let cur = null;
  const flush = () => { if (cur) { picks.push(cur); cur = null; } };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;

    if (!inBlock) {
      // Start on a top-level (frontmatter) `picks:` block start. `picks: []` → empty, skip.
      const m = trimmed.match(/^picks:\s*(\[\s*\])?\s*$/);
      if (m && /^picks:/.test(line.slice(indent))) {
        if (m[1]) continue; // picks: []  → no items
        inBlock = true;
        blockIndent = indent;
        itemIndent = blockIndent + 2;
        fieldIndent = blockIndent + 4;
      }
      continue;
    }

    if (trimmed === '') continue; // blank line inside block
    // A non-blank line at/left of the block key ends the block (next top-level key or `---`).
    if (indent <= blockIndent) { flush(); inBlock = false; continue; }

    const itemMatch = trimmed.match(/^-\s+(.*)$/);
    if (itemMatch && indent === itemIndent) {
      flush();
      cur = { asin: '', image: '', pickName: '', rank: '', label: '' };
      applyField(cur, itemMatch[1]); // inline first field, e.g. `- rank: 1`
    } else if (cur && indent === fieldIndent) {
      applyField(cur, trimmed); // direct child field only — ignore deeper nesting
    }
  }
  flush();
  return picks.map((p) => ({ asin: p.asin, image: p.image, pickName: p.pickName || p.label || (p.rank ? `rank ${p.rank}` : '') }));
}

function applyField(pick, kvText) {
  const kv = kvText.match(/^(\w+):\s*(.*)$/);
  if (!kv) return;
  const key = kv[1];
  const val = unquote(kv[2]);
  if (key === 'asin') pick.asin = val;
  else if (key === 'image' || key === 'imageUrl' || key === 'img') pick.image = val;
  else if (key === 'name' || key === 'productName') pick.pickName = val;
  else if (key === 'rank' && !pick.rank) pick.rank = val;
  else if (key === 'label' && !pick.label) pick.label = val;
}

/** petpal-guide-picks lane: legacy guide-picks markdown (`picks:` block per src/content/guides/*.md). */
function extractPetpalGuidePicks(contentDir) {
  const dir = contentDir || process.env.ASIN_PARITY_CONTENT_DIR || 'src/content/guides';
  const abs = join(process.cwd(), dir);
  if (!existsSync(abs)) {
    console.error(`asin-image-parity: content dir not found: ${dir}`);
    process.exit(2);
  }
  const out = [];
  for (const f of readdirSync(abs).filter((x) => x.endsWith('.md'))) {
    const text = readFileSync(join(abs, f), 'utf8');
    if (!/^\s*picks:/m.test(text)) continue;
    const slug = f.replace(/\.md$/, '');
    for (const p of parsePicks(text)) out.push({ slug, pickName: p.pickName, asin: p.asin, image: p.image });
  }
  return out;
}

/**
 * EXTRACTORS registry — add a lane by adding a function that returns the normalized
 * [{ slug, pickName, asin, image }] list. The core checker + reporting + --verify-api are lane-agnostic.
 *
 * TODO / extension points for the omega lanes (each is a ~15-line extractor):
 *   • 'omega-pipeline-state': omega repos keep product facts in
 *       .pipeline-state/{slug}/03-products.json (array of { asin, image|imageUrl, name, … }).
 *       Extractor = for each dir under .pipeline-state, read 03-products.json, map to
 *       { slug: dirName, pickName: p.name, asin: p.asin, image: p.image ?? p.imageUrl }.
 *   • 'omega-mdx-frontmatter': omega repos that inline picks in guides-v2/*.mdx frontmatter
 *       (a `products:`/`picks:` YAML list) — reuse parsePicks() on the frontmatter block; the
 *       field-name mapping already covers image/imageUrl/img and name/productName.
 *   Wire a lane via --lane=<name> or ASIN_PARITY_LANE. No changes to checkParity() are needed.
 */
export const EXTRACTORS = {
  'petpal-guide-picks': extractPetpalGuidePicks,
};

// ── OPTIONAL: Amazon Creators API image-parity sample (--verify-api) ───────────
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const API_BASE = 'https://creatorsapi.amazon';
const MARKETPLACE = 'www.amazon.com';

async function creatorsToken() {
  const id = process.env.AMAZON_CLIENT_ID;
  const secret = process.env.AMAZON_CLIENT_SECRET;
  if (!id || !secret) throw new Error('AMAZON_CLIENT_ID / AMAZON_CLIENT_SECRET not set (load creds: `eval "$(scripts/automation/load-creds.sh --print amazon)"`).');
  const res = await fetch(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: id, client_secret: secret, scope: 'creatorsapi::default' }),
  });
  if (!res.ok) throw new Error(`token request failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

async function creatorsPrimaryImage(token, asin) {
  const res = await fetch(`${API_BASE}/catalog/v1/getItems`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-marketplace': MARKETPLACE },
    body: JSON.stringify({
      itemIds: [asin], itemIdType: 'ASIN', marketplace: MARKETPLACE,
      partnerTag: process.env.AMAZON_AFFILIATE_TAG || 'nsh069-20',
      resources: ['images.primary.large', 'images.primary.medium'],
    }),
  });
  if (!res.ok) throw new Error(`getItems ${res.status} for ${asin}: ${(await res.text()).slice(0, 160)}`);
  const item = ((await res.json()).itemsResult?.items || [])[0];
  return item?.images?.primary?.large?.url || item?.images?.primary?.medium?.url || null;
}

// Amazon serves the same photo under many size suffixes (…_SL500_, …_AC_UL320_, …).
// Compare on the stable image id (the `I/<id>` path segment), not the full URL.
function amazonImageId(url) {
  const m = String(url).match(/\/I\/([A-Za-z0-9+\-]+)\./);
  return m ? m[1] : null;
}

async function verifyApiSample(picks, sample) {
  const withAsin = picks.filter((p) => (p.asin || '').trim() && AMAZON_IMAGE_RE.test((p.image || '').trim()));
  const chosen = withAsin.slice(0, sample);
  if (chosen.length === 0) return { checked: 0, mismatches: [], errors: [] };
  console.error(`\nverify-api: sampling ${chosen.length} asin→image pair(s) against the Creators API…`);
  const token = await creatorsToken();
  const mismatches = [];
  const errors = [];
  for (const p of chosen) {
    try {
      const apiUrl = await creatorsPrimaryImage(token, p.asin.trim());
      if (!apiUrl) { errors.push(`${p.slug} · ${p.asin}: API returned no image (ASIN may be dead)`); continue; }
      const a = amazonImageId(p.image);
      const b = amazonImageId(apiUrl);
      if (a && b && a !== b) {
        mismatches.push({ slug: p.slug, pickName: p.pickName, asin: p.asin.trim(), pickImage: p.image.trim(), apiImage: apiUrl, message: `image id "${a}" ≠ Creators-API primary image id "${b}" — photo may not belong to this ASIN.` });
      }
    } catch (e) {
      errors.push(`${p.slug} · ${p.asin}: ${e.message}`);
    }
  }
  return { checked: chosen.length, mismatches, errors };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  let asJson = false;
  let verifyApi = false;
  let sample = 10;
  let lane = process.env.ASIN_PARITY_LANE || 'petpal-guide-picks';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') asJson = true;
    else if (a === '--verify-api') verifyApi = true;
    else if (a.startsWith('--sample=')) sample = Math.max(1, Number(a.slice(9)) || 10);
    else if (a.startsWith('--lane=')) lane = a.slice(7);
    else if (a === '--lane') lane = argv[++i];
  }

  const extractor = EXTRACTORS[lane];
  if (!extractor) {
    console.error(`asin-image-parity: unknown lane "${lane}". Known lanes: ${Object.keys(EXTRACTORS).join(', ')}`);
    process.exit(2);
  }

  const picks = extractor();
  const violations = checkParity(picks);
  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warn');

  let api = null;
  if (verifyApi) {
    try { api = await verifyApiSample(picks, sample); }
    catch (e) { api = { checked: 0, mismatches: [], errors: [`verify-api aborted: ${e.message}`] }; }
  }

  if (asJson) {
    console.log(JSON.stringify({ lane, picksChecked: picks.length, errors, warnings, api }, null, 2));
  } else {
    const slugs = new Set(picks.map((p) => p.slug)).size;
    if (errors.length) {
      console.error(`\n❌ asin-image-parity [${lane}]: ${errors.length} ERROR(s) across ${slugs} guide(s) (${picks.length} picks checked):`);
      for (const v of errors) console.error(`   • [${v.rule}] ${v.slug} · "${v.pickName}": ${v.message}`);
    }
    if (warnings.length) {
      console.error(`\n⚠️  ${warnings.length} warning(s) (do not block ship):`);
      for (const v of warnings) console.error(`   • [${v.rule}] ${v.slug} · "${v.pickName}": ${v.message}`);
    }
    if (api) {
      if (api.mismatches.length) {
        console.error(`\n⚠️  verify-api: ${api.mismatches.length}/${api.checked} sampled pair(s) mismatched the Creators-API primary image:`);
        for (const m of api.mismatches) console.error(`   • ${m.slug} · "${m.pickName}" (${m.asin}): ${m.message}`);
      } else if (api.checked) {
        console.error(`\n✅ verify-api: ${api.checked} sampled asin→image pair(s) match the Creators-API primary image.`);
      }
      for (const e of api.errors) console.error(`   • verify-api note: ${e}`);
    }
    if (!errors.length) {
      console.log(`✅ asin-image-parity [${lane}]: ${picks.length} picks across ${slugs} guides — asin⇄image parity holds${warnings.length ? ` (${warnings.length} warning(s))` : ''}.`);
    }
  }

  process.exit(errors.length ? 1 : 0);
}

// Run only when invoked directly (not when imported by the fixture test).
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main();
}
