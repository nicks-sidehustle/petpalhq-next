#!/usr/bin/env node
'use strict';
/**
 * MIGRATION — legacy petpal stores -> per-product records (data/product-ledger/<id>.json).
 *
 * PRODUCT LEDGER RULING (a) (decision-log/2026-09.md, 2026-09-08): one JSON file per
 * product, keyed by the site's product id, ASIN as a dated field. Additive (§8oo): this
 * script READS data/*.json and src/content/guides/*.md and WRITES only under
 * data/product-ledger/. No legacy store is edited, no renderer input changes.
 *
 * OWNER RULINGS 2026-09-09 ~01:05Z applied here:
 *   1. PRODUCT ID = ASIN. Records are keyed by the ASIN (`data/product-ledger/<ASIN>.json`);
 *      the minted slugs of the first run are discarded. See lib.cjs `productIdForAsin` for
 *      the one deviation (case) and why it is the package's to fix.
 *   2. NOT ON AMAZON = NOT ON THE ROSTER. A pick with no Amazon listing gets a record created
 *      GONE with reason `not-sold-on-amazon`, so the history exists; replacing the slot is
 *      the site session's repair work, not this lane's. The `<slug>#<rank>` key form in
 *      dead-asins.json never becomes a record key — slot membership derives from frontmatter.
 *
 * READ KINDS (brief, and §8rr.1):
 *   data/amazon-prices.json row        -> kind `api`        (a hint; sets NO state, ever)
 *   data/live-read-overrides.json row  -> kind `live-page`  (the ONLY kind that sets state)
 *   frontmatter picks[].listPrice      -> kind `maker-page` (populates listPrice only)
 *
 * STATE: LIVE/DARK/GONE only where a live-page read exists AND supports it (§8rr.1), and
 * only while that read is inside the package's one seven-day window (RULING 2/4). Everything
 * else is UNKNOWN — a new product is never born DARK. A data/dead-asins.json entry with no
 * live-page read behind it therefore produces UNKNOWN plus a `held` decision reading
 * "legacy dead-asin entry, unconfirmed": the legacy store's verdict is preserved as
 * provenance, not promoted to a verdict this ledger makes.
 *
 * IDEMPOTENCE: the clock is DERIVED FROM THE INPUTS (`now` = the newest timestamp any store
 * carries), never from Date.now(). Re-running against a newer main produces byte-identical
 * files for unchanged inputs, and the 7-day window is measured against the corpus's own
 * newest fact rather than against whenever a session happened to run.
 *
 *   node scripts/ledger/migrate-from-stores.cjs [--dry-run]
 */

const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

const { pkg, dir: PKG_DIR } = L.requireLedgerPackage();
const { writer, OPINION_TTL_DAYS } = pkg;

const BY = 'scripts/ledger/migrate-from-stores.cjs (governance lane gov-0908)';
const SITE = 'petpal';

/** Creators-API availability -> the record's vocabulary. An api read sets no state. */
const API_AVAILABILITY = {
  IN_STOCK: 'in-stock',
  IN_STOCK_SCARCE: 'in-stock',
  OUT_OF_STOCK: 'out-of-stock',
  UNAVAILABLE: 'out-of-stock',
  // Order-placeable but not a plain in-stock claim; the raw value round-trips via the receipt.
  LEADTIME: 'unknown',
  AVAILABLE_DATE: 'unknown',
};

/**
 * Live-read-override availability -> the record's vocabulary. These are the values the
 * dark-card live-read lane writes (src/lib/dark-card.ts LiveReadOverride).
 * UNAVAILABLE / USED_ONLY mean "the listing is there, no new-condition featured offer" —
 * that is no-buy-box (DARK), never GONE: a card whose listing exists keeps its buy path.
 */
const LIVE_AVAILABILITY = {
  IN_STOCK: 'in-stock',
  OUT_OF_STOCK: 'out-of-stock',
  UNAVAILABLE: 'no-buy-box',
  USED_ONLY: 'no-buy-box',
  NOT_FOUND: 'not-found',
};

const CONDITION = { New: 'new', new: 'new', Used: 'used', 'used-only': 'used' };

/**
 * WAS THIS LEGACY api ROW THE FEATURED (BUY-BOX) OFFER?  (`featured`, §8rr.2)
 *
 * data/amazon-prices.json carries no such column, so the mapping is derived from the row's
 * own buy-box semantics — the same ones the SITE uses to decide whether the card converts
 * today (src/lib/price-cache.ts). A row is featured iff all four hold:
 *
 *   1. it carries a price — no price, no figure;
 *   2. its availability is one the render path treats as a LIVE buy box:
 *        IN_STOCK / IN_STOCK_SCARCE / LEADTIME / absent  -> yes (price-cache.ts: scarce and
 *          leadtime are "placeable today"; absence of evidence is not evidence of absence)
 *        OUT_OF_STOCK / UNAVAILABLE                      -> no
 *        AVAILABLE_DATE                                  -> only when Amazon itself is the
 *          seller of record AND the row is priced (owner backorder ruling 2026-08-18,
 *          isDisclosableBackorder: the order button works, it just ships later);
 *   3. `pendingUnbuyableSince` is absent. That marker means the sync read the row back as
 *      unbuyable and HELD the flip: the row still carries its last CONFIRMED values, and the
 *      sync's own words are "THIS ROW NEEDS A LIVE READ" (scripts/sync-amazon-prices.ts,
 *      hold-only ruling 2026-09-08). Printing its figure as the buy box would print a number
 *      the writer itself has flagged. 19 rows.
 *   4. the row is not condition-suppressed — the sync never writes a non-New offer's price
 *      into the row at all (§8l), so there is nothing further to test here.
 *
 * `stale: true` does NOT clear `featured` (88 rows): a stale row retains the last CONFIRMED
 * featured observation and deliberately does NOT advance `lastChecked`, so its age is already
 * the honest one and the 7-day window (RULING 2/4) is the instrument that judges it.
 */
const AMAZON_MERCHANT_ID = 'ATVPDKIKX0DER';
const BUY_BOX_DEAD = new Set(['OUT_OF_STOCK', 'UNAVAILABLE']);

function apiRowIsFeatured(row) {
  if (!row.price) return false;
  if (row.pendingUnbuyableSince) return false;
  const availability = String(row.availability || '').trim().toUpperCase();
  if (BUY_BOX_DEAD.has(availability)) return false;
  if (availability === 'AVAILABLE_DATE') {
    return String(row.merchantId || '').trim().toUpperCase() === AMAZON_MERCHANT_ID;
  }
  return true;
}

/** A live-page override is the featured offer when it read a New offer that was in stock. */
function overrideIsFeatured(row) {
  if (row.price === null || row.price === undefined) return false;
  const availability = String(row.availability || '').trim().toUpperCase();
  const condition = String(row.condition || '').trim().toLowerCase();
  return availability === 'IN_STOCK' && condition === 'new';
}


/**
 * RULING 2 — NOT ON AMAZON = NOT ON THE ROSTER (owner, 2026-09-09 ~01:05Z).
 *
 * A pick with no Amazon listing gets a record created GONE with reason `not-sold-on-amazon`,
 * so the history exists; the site session replaces the slot under §8qq rule 3.
 *
 * GONE is a VERDICT, and §8rr.1 lets only a live-page read set one — so this returns evidence
 * or nothing. Nothing is fabricated: outbound network is closed to this lane, so the read is
 * migrated from a DATED in-repo claim that a human made after looking, in one of two shapes:
 *
 *   (a) a data/dead-asins.json row keyed `<slug>#<rank>` with status `no_listing` and a
 *       `lastVerified` date — the two Eshopps picks, whose reason carries "Re-read
 *       2026-09-08: still no Eshopps RS-100 / Refugium Cube listing on Amazon";
 *   (b) the guide's own `lastProductCheck` beside a pick whose price field states a
 *       maker-direct purchase — the two Litter-Robot picks, `asin: ""`,
 *       `price: "$799.00 direct from Whisker"`, checked 2026-09-07, with the guide's own
 *       sentence about Amazon quoted into the receipt.
 *
 * The `<slug>#<rank>` key NEVER becomes a record key (ruling 2): it is read here as evidence
 * and retired at cutover, because slot membership derives from frontmatter.
 *
 * A pick with neither shape gets NO verdict and stays UNKNOWN. That is a finding for the
 * repair lane, not a gap this script papers over.
 */
function notOnAmazonEvidence(row, dead) {
  const slotKey = `${row.slug}#${row.rank}`;
  const slotRow = dead[slotKey];
  if (slotRow && slotRow.status === 'no_listing' && slotRow.lastVerified) {
    return {
      readAt: L.toIsoDateTime(slotRow.lastVerified),
      source: `data/dead-asins.json#${slotKey}`,
      receipt: L.legacyReceipt('data/dead-asins.json', slotKey, slotRow),
      makerUrl: null,
    };
  }
  const direct = /direct from ([A-Z][A-Za-z0-9&' .-]+)/.exec(row.price || '');
  if (direct && row.lastProductCheck) {
    return {
      readAt: L.toIsoDateTime(row.lastProductCheck),
      source: `src/content/guides/${row.guide} (lastProductCheck ${row.lastProductCheck})`,
      receipt:
        `guide src/content/guides/${row.guide} lastProductCheck ${row.lastProductCheck}; ` +
        `pick rank ${row.rank} carries asin "" and price ${JSON.stringify(row.price)}` +
        (guideAmazonSentence(row.guide) ? `; guide states: ${JSON.stringify(guideAmazonSentence(row.guide))}` : ''),
      makerUrl: null,
      maker: direct[1].trim(),
    };
  }
  return null;
}

/** The guide's own dated sentence about what is and is not buyable on Amazon, for the receipt. */
const SENTENCE_CACHE = new Map();
function guideAmazonSentence(guide) {
  if (SENTENCE_CACHE.has(guide)) return SENTENCE_CACHE.get(guide);
  let found = null;
  try {
    const text = fs.readFileSync(path.join(L.GUIDES_DIR, guide), 'utf8');
    for (const sentence of text.split(/(?<=\.)\s+/)) {
      if (/\bon Amazon\b/.test(sentence) && /\bcheck\b|\bdirect\b/i.test(sentence)) {
        found = sentence.replace(/\s+/g, ' ').trim().slice(0, 300);
        break;
      }
    }
  } catch {
    /* a guide we cannot read carries no quotable sentence; the receipt still names the file */
  }
  SENTENCE_CACHE.set(guide, found);
  return found;
}

function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const prices = L.readJson(L.LEGACY_STORES.prices, {});
  const dead = L.readJson(L.LEGACY_STORES.dead, {});
  const overrides = L.readJson(L.LEGACY_STORES.overrides, {});
  const { rows: pickRows, parseErrors } = L.loadPicks();

  // ---- the derived clock -------------------------------------------------------------
  const stamps = [];
  for (const row of Object.values(prices)) if (row.lastChecked) stamps.push(L.toIsoDateTime(row.lastChecked));
  for (const row of Object.values(overrides)) if (row.readAt) stamps.push(L.toIsoDateTime(row.readAt));
  for (const row of Object.values(dead)) if (row.lastVerified) stamps.push(L.toIsoDateTime(row.lastVerified));
  for (const row of pickRows) if (row.listPrice && row.listPrice.verifiedAt) stamps.push(L.toIsoDateTime(row.listPrice.verifiedAt));
  const now = stamps.filter(Boolean).sort().pop();
  if (!now) throw new Error('no timestamp in any legacy store — refusing to invent a clock');

  // ---- identity ----------------------------------------------------------------------
  const picksByAsin = new Map();
  const noAsinPicks = [];
  for (const row of pickRows) {
    if (!row.asin) {
      noAsinPicks.push(row);
      continue;
    }
    if (!picksByAsin.has(row.asin)) picksByAsin.set(row.asin, []);
    picksByAsin.get(row.asin).push(row);
  }

  // RULING 1: the id IS the ASIN. Nothing to mint, nothing to carry forward, and no
  // existing-record lookup — the key is a property of the product, not of a previous run.

  // ---- build every record --------------------------------------------------------------
  const receipt = {
    generatedAt: now,
    clock: 'derived from the newest timestamp in the legacy stores (idempotence, not Date.now())',
    opinionTtlDays: OPINION_TTL_DAYS,
    counts: { records: 0, byState: {}, byReadKind: { api: 0, 'live-page': 0, 'maker-page': 0 }, listPrices: 0, featuredApiReads: 0, featuredLiveReads: 0, notSoldOnAmazon: 0 },
    unmapped: { pricesRowNoPick: [], deadRowNoPick: [], overrideRowNoPick: [], picksWithoutAsin: [], guideParseErrors: parseErrors },
    unmappedFields: {},
    notes: [],
  };

  const records = [];
  const seenIds = new Set();

  for (const [asin, rows] of [...picksByAsin.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const productId = L.productIdForAsin(asin);
    if (seenIds.has(productId)) {
      receipt.notes.push(`DUPLICATE ID ${productId} for ASIN ${asin} — impossible on ASIN keys; investigate`);
      continue;
    }
    seenIds.add(productId);
    records.push(buildRecord({ productId, asin, rows, prices, dead, overrides, now, receipt }));
  }

  for (const row of noAsinPicks) {
    const productId = L.productIdForNoAsinPick(row);
    if (!productId || seenIds.has(productId)) continue;
    seenIds.add(productId);
    receipt.unmapped.picksWithoutAsin.push({
      guide: row.guide,
      rank: row.rank,
      name: row.name,
      productId,
      // A non-empty `asin:` that is not an ASIN is a search-phrase placeholder, not an
      // identity — the /go/ route turns it into a keyword fallback. Worth naming: the
      // record carries asin.current = null and the card's destination is fallback-allowed.
      asinRaw: row.asinRaw || null,
    });
    records.push(
      buildRecord({ productId, asin: null, rows: [row], prices, dead, overrides, now, receipt, notOnAmazon: notOnAmazonEvidence(row, dead) })
    );
  }

  // Rows in a legacy store that no guide surfaces. Not migrated: a record needs a product,
  // and an ASIN nothing renders is an orphan row, not a product. Reported, never dropped
  // silently — the parity run lists each one as an OPEN row rather than dropping it.
  const pickAsins = new Set(picksByAsin.keys());
  receipt.unmapped.pricesRowNoPick = Object.keys(prices).filter((a) => !pickAsins.has(a)).sort();
  receipt.unmapped.deadRowNoPick = Object.keys(dead).filter((a) => !pickAsins.has(a)).sort();
  receipt.unmapped.overrideRowNoPick = Object.keys(overrides).filter((a) => !pickAsins.has(a)).sort();

  records.sort((a, b) => a.productId.localeCompare(b.productId));
  receipt.counts.records = records.length;
  for (const rec of records) {
    receipt.counts.byState[rec.state] = (receipt.counts.byState[rec.state] || 0) + 1;
    for (const read of rec.reads) receipt.counts.byReadKind[read.kind] = (receipt.counts.byReadKind[read.kind] || 0) + 1;
    if (rec.listPrice) receipt.counts.listPrices++;
  }

  if (dryRun) {
    process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
    return 0;
  }

  fs.mkdirSync(L.LEDGER_DIR, { recursive: true });
  const manifest = [];
  /**
   * BLOCKER, named rather than worked around: RULING 2 says a pick with no Amazon listing
   * still gets a record, and package v0.1.2's `canonicalIdErrors()` refuses ANY non-ASIN key
   * on a site declaring `idIsAsin` — at write AND at load, so one such file makes the whole
   * ledger unloadable for every gate. A product genuinely not sold on Amazon has no ASIN to
   * key by, and this lane will not mint an ASIN-shaped placeholder.
   *
   * So the four not-sold-on-amazon records are BUILT (their evidence is gathered and shown in
   * this receipt) and NOT WRITTEN. The consequence is visible, not hidden: their cards render
   * with no record, and the gates report them. The package needs a key form for a record whose
   * `asin.current` is null, or the ruling needs another shape.
   */
  const blocked = [];
  for (const rec of records) {
    try {
      manifest.push(writer.writeRecord(L.LEDGER_DIR, rec, { idIsAsin: true }));
    } catch (e) {
      if (rec.asin.current === null && /is not an uppercase ASIN/.test(e.message)) {
        blocked.push(rec.productId);
        continue;
      }
      throw e;
    }
  }
  if (blocked.length) {
    receipt.blocked = {
      records: blocked,
      why:
        'RULING 2 requires a record for a pick with no Amazon listing; package v0.1.2 canonicalIdErrors() ' +
        'refuses a non-ASIN key under idIsAsin, at write and at load. No ASIN exists for these picks and ' +
        'none is invented. NOT WRITTEN — their cards surface as no-record gate findings until the package ' +
        'admits a key form for a record whose asin.current is null.',
    };
    receipt.counts.records -= blocked.length;
    receipt.counts.byState.GONE -= blocked.length;
    if (!receipt.counts.byState.GONE) delete receipt.counts.byState.GONE;
  }

  // Records that vanished from the corpus are NOT deleted here: removal is an editorial act
  // (§8rr.2). They are reported so a repair lane can decide.
  const orphanRecordFiles = fs
    .readdirSync(L.LEDGER_DIR)
    .filter((f) => f.endsWith('.json'))
    .filter((f) => !seenIds.has(f.replace(/\.json$/, '')))
    .sort();
  if (orphanRecordFiles.length) receipt.notes.push(`records with no current pick (left in place, §8rr.2): ${orphanRecordFiles.join(', ')}`);

  fs.mkdirSync(L.SHADOW_DIR, { recursive: true });
  writer.writeManifest(path.join(L.SHADOW_DIR, 'migration-manifest.json'), manifest, { at: now, by: BY });
  fs.writeFileSync(path.join(L.SHADOW_DIR, 'migration-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  fs.writeFileSync(path.join(L.SHADOW_DIR, 'migration-receipt.md'), renderReceipt(receipt, PKG_DIR));
  process.stdout.write(renderReceipt(receipt, PKG_DIR));
  return 0;
}

function buildRecord({ productId, asin, rows, prices, dead, overrides, now, receipt, notOnAmazon }) {
  const first = rows[0];
  const createdAt = now;
  let rec = writer.newUnknownRecord({
    productId,
    site: SITE,
    name: first.name || productId,
    asin: asin || undefined,
    at: createdAt,
    by: BY,
    receipt: `frontmatter pick src/content/guides/${first.guide} rank ${first.rank}`,
  });

  const names = [...new Set(rows.map((r) => r.name).filter(Boolean))];
  if (names.length > 1) {
    receipt.notes.push(`${productId} (${asin}): ${names.length} name variants across guides; took ${JSON.stringify(names[0])}`);
  }

  // ---- api read: the Creators-API snapshot row ---------------------------------------
  const priceRow = asin ? prices[asin] : null;
  if (priceRow && priceRow.lastChecked) {
    const readAt = L.toIsoDateTime(priceRow.lastChecked);
    const amount = L.parseMoney(priceRow.price);
    const featured = apiRowIsFeatured(priceRow);
    rec = writer.appendRead(rec, {
      id: `api-${readAt}`,
      kind: 'api',
      price: amount === null ? null : { amount, currency: 'USD', formatted: String(priceRow.price) },
      availability: API_AVAILABILITY[priceRow.availability] || 'unknown',
      merchant: priceRow.merchantName || null,
      merchantId: priceRow.merchantId || null,
      // §8rr.2: only a FEATURED read's price may become the card's figure. See the mapping
      // above — derived from the row's buy-box semantics, because the store has no column.
      featured,
      // The strike-through the SOURCE showed at read time. Distinct from record.listPrice,
      // which is the MAKER's evergreen figure: conflating them turns an Amazon promo into an
      // evergreen claim.
      observedListPrice: priceRow.listPrice
        ? {
            amount: L.parseMoney(priceRow.listPrice),
            currency: 'USD',
            formatted: String(priceRow.listPrice),
            basis: priceRow.listPriceBasis || null,
            savingsPercent: priceRow.savingsPercent === undefined ? null : priceRow.savingsPercent,
          }
        : null,
      condition: 'unknown',
      readAt,
      source: 'Amazon Creators API via scripts/sync-amazon-prices.ts',
      receipt: L.legacyReceipt('data/amazon-prices.json', asin, priceRow),
      ok: true,
    });
    if (featured) receipt.counts.featuredApiReads++;
    noteUnmappedFields(receipt, 'data/amazon-prices.json', priceRow, [
      'price', 'lastChecked', 'availability', 'merchantName', 'merchantId',
      'listPrice', 'listPriceBasis', 'savingsPercent',
    ]);
  }

  // ---- maker-page read + listPrice ----------------------------------------------------
  const lp = rows.map((r) => r.listPrice).find(Boolean);
  if (lp && typeof lp.amount === 'number' && lp.sourceUrl) {
    const readAt = L.toIsoDateTime(lp.verifiedAt) || createdAt;
    const formatted = L.money(lp.amount);
    rec = writer.appendRead(rec, {
      id: `maker-${readAt}`,
      kind: 'maker-page',
      price: { amount: lp.amount, currency: lp.currency || 'USD', formatted },
      availability: 'unknown',
      merchant: lp.sourceLabel || null,
      condition: 'new',
      readAt,
      source: lp.sourceUrl,
      receipt: L.legacyReceipt(`src/content/guides/${rows.find((r) => r.listPrice).guide}`, `picks[${rows.find((r) => r.listPrice).rank}].listPrice`, lp),
      ok: true,
    });
    rec = writer.setListPrice(rec, {
      listPrice: {
        amount: lp.amount,
        currency: lp.currency || 'USD',
        formatted,
        sourceUrl: lp.sourceUrl,
        sourceLabel: lp.sourceLabel || undefined,
        readAt,
      },
      at: createdAt,
      by: BY,
      reason: 'maker list price migrated from the frontmatter listPrice block (§8qq.4)',
      receipt: L.legacyReceipt('frontmatter picks[].listPrice', productId, lp),
    });
    noteUnmappedFields(receipt, 'frontmatter picks[].listPrice', lp, ['amount', 'currency', 'sourceUrl', 'verifiedAt', 'sourceLabel']);
  }

  // ---- live-page read: the ONLY kind that may set a state ------------------------------
  const ovr = asin ? overrides[asin] : null;
  let liveReadId = null;
  if (ovr && ovr.readAt) {
    const readAt = L.toIsoDateTime(ovr.readAt);
    liveReadId = `live-${readAt}`;
    const amount = typeof ovr.price === 'number' ? ovr.price : L.parseMoney(ovr.price);
    rec = writer.appendRead(rec, {
      id: liveReadId,
      kind: 'live-page',
      price: amount === null || amount === undefined ? null : { amount, currency: ovr.currency || 'USD', formatted: L.money(amount) },
      availability: LIVE_AVAILABILITY[ovr.availability] || 'unknown',
      merchant: ovr.merchant || null,
      featured: overrideIsFeatured(ovr),
      lane: ovr.lane || null,
      condition: CONDITION[ovr.condition] || 'unknown',
      readAt,
      source: ovr.source || `https://www.amazon.com/dp/${asin}`,
      receipt: L.legacyReceipt('data/live-read-overrides.json', asin, ovr),
      ok: true,
    });
    if (overrideIsFeatured(ovr)) receipt.counts.featuredLiveReads++;
    noteUnmappedFields(receipt, 'data/live-read-overrides.json', ovr, [
      'price', 'currency', 'availability', 'merchant', 'condition', 'readAt', 'source', 'lane',
    ]);
  }

  const deadRow = asin ? dead[asin] : null;

  if (liveReadId) {
    const read = rec.reads.find((r) => r.id === liveReadId);
    const state = writer.stateFromAvailability(read.availability);
    if (state) {
      try {
        rec = writer.setState(rec, {
          state,
          readId: liveReadId,
          at: now,
          by: BY,
          reason: `state ${state} from the live-page read migrated out of data/live-read-overrides.json (§8rr.1)`,
          receipt: read.receipt,
        });
      } catch (e) {
        // An expired live read is no opinion about anything (RULING 2/4). The read stays on
        // the record as provenance; the record stays UNKNOWN.
        rec = writer.appendDecision(rec, {
          at: now,
          by: BY,
          action: 'held',
          reason: `live-page read present but did not set a state: ${e.message}`,
          receipt: read.receipt,
        });
      }
    } else {
      rec = writer.appendDecision(rec, {
        at: now,
        by: BY,
        action: 'held',
        reason: `live-page read availability "${read.availability}" supports no state verdict; record stays UNKNOWN`,
        receipt: read.receipt,
      });
    }
  }

  // A legacy dead-ASIN entry with no live-page read behind it is provenance, never a verdict.
  if (deadRow && !liveReadId) {
    rec = writer.appendDecision(rec, {
      at: now,
      by: BY,
      action: 'held',
      reason: 'legacy dead-asin entry, unconfirmed — no live-page read exists, so this ledger makes no LIVE/DARK/GONE claim (§8rr.1)',
      receipt: L.legacyReceipt('data/dead-asins.json', asin, deadRow),
    });
  } else if (deadRow) {
    rec = writer.appendDecision(rec, {
      at: now,
      by: BY,
      action: 'held',
      reason: 'legacy dead-asin entry retained as provenance beside the live-page read that now governs state',
      receipt: L.legacyReceipt('data/dead-asins.json', asin, deadRow),
    });
  }

  // RULING 2 — a pick with no Amazon listing: record created GONE, slot replacement is the
  // site session's repair work.
  if (!asin && notOnAmazon) {
    const readId = `live-${notOnAmazon.readAt}`;
    rec = writer.appendRead(rec, {
      id: readId,
      kind: 'live-page',
      price: null,
      availability: 'not-found',
      merchant: null,
      featured: false,
      condition: 'unknown',
      readAt: notOnAmazon.readAt,
      source: notOnAmazon.source,
      receipt: notOnAmazon.receipt,
      ok: true,
    });
    rec = writer.setState(rec, {
      state: 'GONE',
      readId,
      at: now,
      by: BY,
      reason: `not-sold-on-amazon — no Amazon listing for this pick${notOnAmazon.maker ? ` (sold direct by ${notOnAmazon.maker})` : ''}; RULING 2 (2026-09-09 ~01:05Z): not on Amazon = not on the roster`,
      receipt: notOnAmazon.receipt,
    });
    // v0.1.2 gives GONE a typed reason. `makerUrl` is deliberately OMITTED: no maker URL for
    // these four picks exists anywhere in the repo, and a receipt field is worth nothing if a
    // migration can invent it. The site session's repair PR supplies it with the replacement.
    rec.goneReason = 'not-sold-on-amazon';
    receipt.counts.notSoldOnAmazon++;
    receipt.notes.push(
      `${productId}: GONE not-sold-on-amazon from ${notOnAmazon.source}` +
        ' — MAKER URL OWED: no maker URL exists in the repo for this pick, so the receipt is the dated in-repo claim'
    );
  } else if (!asin) {
    receipt.notes.push(
      `${productId}: no ASIN and no dated in-repo evidence of an Amazon absence — stays UNKNOWN; ` +
        'a verdict needs a live-page read (§8rr.1) and this lane takes none'
    );
  }

  return rec;
}

/** Legacy columns the record schema has no home for. Counted once per field, not per row. */
function noteUnmappedFields(receipt, store, row, mapped) {
  for (const [key, value] of Object.entries(row)) {
    if (mapped.includes(key)) continue;
    if (value === null || value === undefined) continue;
    const k = `${store}.${key}`;
    receipt.unmappedFields[k] = (receipt.unmappedFields[k] || 0) + 1;
  }
}

function renderReceipt(r, pkgDir) {
  const lines = [];
  lines.push('# petpal product-ledger MIGRATION RECEIPT');
  lines.push('');
  lines.push(`- package: ${pkgDir} (TODO pin \`product-ledger-v0.1.0\`)`);
  lines.push(`- derived clock (\`now\`): ${r.generatedAt} — ${r.clock}`);
  lines.push(`- opinion TTL: ${r.opinionTtlDays} days (RULING 2/4, one window)`);
  lines.push('');
  lines.push('## Records');
  lines.push(`- total: ${r.counts.records}`);
  for (const [state, n] of Object.entries(r.counts.byState).sort()) lines.push(`  - ${state}: ${n}`);
  lines.push(`- listPrice blocks migrated: ${r.counts.listPrices}`);
  lines.push(`- GONE / not-sold-on-amazon (RULING 2): ${r.counts.notSoldOnAmazon}`);
  lines.push('');
  lines.push('## Reads by kind');
  for (const [kind, n] of Object.entries(r.counts.byReadKind).sort()) lines.push(`- ${kind}: ${n}`);
  lines.push('');
  lines.push('## Featured (buy-box) reads — §8rr.2, only a featured read may become the figure');
  lines.push(`- api reads marked featured: ${r.counts.featuredApiReads}`);
  lines.push(`- live-page reads marked featured: ${r.counts.featuredLiveReads}`);
  lines.push('');
  lines.push('## Unmapped rows (legacy row no guide surfaces — NOT migrated, replayed by the derivation)');
  lines.push(`- data/amazon-prices.json: ${r.unmapped.pricesRowNoPick.length} (${r.unmapped.pricesRowNoPick.join(', ') || 'none'})`);
  lines.push(`- data/dead-asins.json: ${r.unmapped.deadRowNoPick.length} (${r.unmapped.deadRowNoPick.join(', ') || 'none'})`);
  lines.push(`- data/live-read-overrides.json: ${r.unmapped.overrideRowNoPick.length} (${r.unmapped.overrideRowNoPick.join(', ') || 'none'})`);
  lines.push(`- picks with no ASIN (RULING 2 — record created GONE where dated in-repo evidence exists): ${r.unmapped.picksWithoutAsin.length}`);
  for (const p of r.unmapped.picksWithoutAsin) lines.push(`  - ${p.productId} — ${p.guide} rank ${p.rank}${p.asinRaw ? ` (frontmatter asin: ${JSON.stringify(p.asinRaw)} — not an ASIN)` : ""}`);
  lines.push(`- guide frontmatter parse errors: ${r.unmapped.guideParseErrors.length}`);
  lines.push('');
  lines.push('## Unmapped FIELDS (legacy column the record schema has no home for — round-trips via the read receipt)');
  const uf = Object.entries(r.unmappedFields).sort();
  if (!uf.length) lines.push('- none');
  for (const [k, n] of uf) lines.push(`- ${k}: ${n} row(s)`);
  lines.push('');
  if (r.blocked) {
    lines.push('## BLOCKED — built but NOT WRITTEN');
    lines.push(`- ${r.blocked.records.join(', ')}`);
    lines.push(`- ${r.blocked.why}`);
    lines.push('');
  }
  lines.push('## Notes');
  if (!r.notes.length) lines.push('- none');
  for (const n of r.notes.slice(0, 40)) lines.push(`- ${n}`);
  if (r.notes.length > 40) lines.push(`- … ${r.notes.length - 40} more (see migration-receipt.json)`);
  lines.push('');
  return lines.join('\n');
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { main, API_AVAILABILITY, LIVE_AVAILABILITY };
