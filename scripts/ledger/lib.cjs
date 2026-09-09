'use strict';
/**
 * Shared plumbing for petpal's product-ledger adoption lane.
 *
 * ADDITIVE ONLY (PRODUCT LEDGER RULING (a) / §8oo). Nothing in scripts/ledger/ is read by
 * the renderer, by a gate that runs today, or by any build step. The legacy stores under
 * data/ are read, never written.
 *
 * Package resolution: @affiliate/product-ledger ships from affiliate-site-template and is
 * INTENDED to be pinned by tag (`product-ledger-v0.1.0`) once that tag exists — see
 * scripts/ledger/README.md. Until then this lane resolves it by path so the adoption PR
 * carries no dependency edit and no lockfile churn.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const GUIDES_DIR = path.join(ROOT, 'src', 'content', 'guides');
const DATA_DIR = path.join(ROOT, 'data');
const LEDGER_DIR = path.join(DATA_DIR, 'product-ledger');
const SHADOW_DIR = path.join(ROOT, '.ledger-derived');

/** A real Amazon ASIN. Anything else in an `asin:` field is a search phrase, not an identity. */
const ASIN_RE = /^[A-Z0-9]{10}$/;

/** The schema's own date-time shape (src/validate.cjs ISO). */
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const LEGACY_STORES = {
  prices: path.join(DATA_DIR, 'amazon-prices.json'),
  dead: path.join(DATA_DIR, 'dead-asins.json'),
  overrides: path.join(DATA_DIR, 'live-read-overrides.json'),
  unbuyableProse: path.join(DATA_DIR, 'unbuyable-prose-baseline.json'),
  llms: path.join(ROOT, 'public', 'llms.txt'),
  llmsFull: path.join(ROOT, 'public', 'llms-full.txt'),
};

/**
 * The package is a REAL DEPENDENCY now, pinned by tag:
 *
 *   "@affiliate/product-ledger": "github:nicks-sidehustle/affiliate-site-template#product-ledger-v0.1.2"
 *
 * (PRODUCT LEDGER RULING (a): sisters pin by tag and bump by a one-line PR; the dependency
 * line is the receipt of which ruleset petpal ran on any date. See
 * node_modules/@affiliate/product-ledger/packages/product-ledger/INSTALL.md.)
 *
 * `PRODUCT_LEDGER_PATH` remains as a development override for testing an unreleased branch,
 * and it is the ONLY path fallback left — the sibling-checkout guesswork is gone now that a
 * real resolution exists.
 *
 * The CAPABILITY CHECK stays and is not a version string: a copy predating v0.1.2 resolves
 * fine and then derives different figures from an older ruleset — a stale dependency
 * producing a green run is the class this whole program exists to close.
 */
function requireLedgerPackage() {
  const override = process.env.PRODUCT_LEDGER_PATH;
  const entry = override ? path.join(override, 'src', 'index.cjs') : '@affiliate/product-ledger';
  let pkg;
  try {
    pkg = require(entry);
  } catch (e) {
    throw new Error(
      `@affiliate/product-ledger could not be resolved (${e.message}). It is a pinned dependency: ` +
        'run `npm i`. To test an unreleased package branch, set PRODUCT_LEDGER_PATH to a checkout ' +
        'of affiliate-site-template/packages/product-ledger.'
    );
  }
  for (const [fn, since] of [['isFigureRead', 'PR #29'], ['canonicalIdErrors', 'v0.1.2']]) {
    if (typeof pkg[fn] !== 'function') {
      throw new Error(
        `@affiliate/product-ledger is older than ${since} (no ${fn}). This lane's records and ` +
          'derivation assume that ruleset; an older copy would silently derive different figures. ' +
          'Bump the dependency line to #product-ledger-v0.1.2 or later.'
      );
    }
  }
  return { pkg, dir: override || path.dirname(require.resolve('@affiliate/product-ledger')) };
}

/** Minimal, dependency-free frontmatter split. `yaml` is already a petpal devDependency. */
function readFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!m) return null;
  const YAML = require('yaml');
  try {
    return YAML.parse(m[1]);
  } catch (e) {
    return { $parseError: e.message };
  }
}

/**
 * Every pick every guide surfaces, in a deterministic order (guide filename, then rank).
 * Slot membership is READ here and never stored on a record — it is derived, and the
 * record schema refuses `guides`/`slots`/`picks` by name.
 */
function loadPicks() {
  const rows = [];
  const parseErrors = [];
  for (const file of fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md')).sort()) {
    const fm = readFrontmatter(path.join(GUIDES_DIR, file));
    if (!fm) continue;
    if (fm.$parseError) {
      parseErrors.push({ file, error: fm.$parseError });
      continue;
    }
    const picks = Array.isArray(fm.picks) ? fm.picks : [];
    picks.forEach((pick, index) => {
      rows.push({
        guide: file,
        slug: file.replace(/\.md$/, ''),
        index,
        rank: typeof pick.rank === 'number' ? pick.rank : index + 1,
        // An `asin:` that is not a 10-char ASIN is NOT an identity — petpal carries a few
        // search-phrase placeholders ("Eshopps RS-100 reef sump") that the /go/ route turns
        // into a keyword fallback. The raw value is kept so the receipt can name it.
        asin: ASIN_RE.test(String(pick.asin || '').trim()) ? pick.asin.trim() : null,
        asinRaw: typeof pick.asin === 'string' ? pick.asin.trim() : null,
        name: typeof pick.name === 'string' ? pick.name.trim() : null,
        brand: typeof pick.brand === 'string' ? pick.brand.trim() : null,
        price: typeof pick.price === 'string' ? pick.price.trim() : null,
        listPrice: pick.listPrice && typeof pick.listPrice === 'object' ? pick.listPrice : null,
        lastProductCheck: typeof fm.lastProductCheck === 'string' ? fm.lastProductCheck : null,
      });
    });
  }
  return { rows, parseErrors };
}

/** `Halo Collar 5 …, Graphite` -> `halo-collar-5-graphite`, capped at whole words. */
function slugify(text, max) {
  const limit = max || 60;
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length <= limit) return base;
  const cut = base.slice(0, limit);
  const at = cut.lastIndexOf('-');
  return (at > 20 ? cut.slice(0, at) : cut).replace(/-+$/, '');
}

/**
 * PRODUCT ID = THE ASIN (owner RULING 1, decision-log 2026-09-09 ~01:05Z).
 *
 * petpal's `/go/{id}` resolves the ASIN directly, so the site's product id IS the ASIN and
 * records are keyed by it. The first run's minted slugs are discarded: nothing on the site
 * referenced them, and they would eventually have forced a `/go/` resolver change across 252
 * guides. Identity continuity across a swap lives in the old record's `replaced-by` decision.
 *
 * CANONICAL FORM IS UPPERCASE. Package v0.1.2 widened the schema pattern to accept it and
 * ENFORCES it: under an adapter declaring `idIsAsin`, `canonicalIdErrors()` refuses a key or
 * an `asin.current` that is not uppercase ASIN-shaped, at load and at write. This lane's
 * previous run lowercased both because the older pattern rejected uppercase — a workaround
 * the package was changed to retire, and it matched nothing in petpal's own hrefs.
 */
function productIdForAsin(asin) {
  return String(asin).toUpperCase();
}

/**
 * A pick with NO ASIN still needs a key, and there is no ASIN to use. These four records
 * (RULING 2: not on Amazon = not on the roster) exist only to hold the GONE history until
 * the site session replaces the slot, so they carry a name slug. The exception is named here
 * rather than hidden in a fallback branch.
 */
function productIdForNoAsinPick(row) {
  return slugify(row.name || `${row.slug}-${row.rank}`);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** A migrated claim's receipt IS the legacy row it came from — verbatim, so it round-trips. */
function legacyReceipt(store, key, row) {
  return `legacy ${store}#${key} @ migrate-from-stores.cjs: ${JSON.stringify(row)}`;
}

function parseLegacyReceipt(receipt) {
  const at = String(receipt || '').indexOf(': ');
  if (at < 0) return null;
  try {
    return JSON.parse(receipt.slice(at + 2));
  } catch {
    return null;
  }
}

function money(amount) {
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseMoney(text) {
  const m = /-?\d[\d,]*(?:\.\d+)?/.exec(String(text || ''));
  return m ? Number(m[0].replace(/,/g, '')) : null;
}

/** `2026-09-07` -> `2026-09-07T00:00:00.000Z`; an already-ISO datetime passes through. */
function toIsoDateTime(value) {
  const s = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00.000Z`;
  // An already-ISO stamp passes through UNCHANGED. Round-tripping it through Date() would
  // truncate microseconds ("…641586Z" -> "…641Z"), and a migration that quietly rewrites the
  // timestamp on a read is a migration that cannot prove parity with the store it came from.
  if (ISO_DATETIME.test(s)) return s;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

module.exports = {
  ASIN_RE,
  ROOT,
  GUIDES_DIR,
  DATA_DIR,
  LEDGER_DIR,
  SHADOW_DIR,
  LEGACY_STORES,
  requireLedgerPackage,
  readFrontmatter,
  loadPicks,
  slugify,
  productIdForAsin,
  productIdForNoAsinPick,
  readJson,
  legacyReceipt,
  parseLegacyReceipt,
  money,
  parseMoney,
  toIsoDateTime,
};
