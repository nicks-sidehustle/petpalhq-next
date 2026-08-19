/**
 * Build-time price cache loader.
 *
 * Reads data/amazon-prices.json once at module init. For static/ISR pages this
 * means at `next build` time — prices are frozen in the bundle until next build.
 *
 * The cron endpoint (/api/cron/refresh-prices) fetches fresh prices and returns
 * them as JSON. To update rendered prices: save the cron output to
 * data/amazon-prices.json, commit, and redeploy.
 *
 * Graceful degradation: if the file is missing or malformed, all lookups return
 * null and pages render using frontmatter prices as fallback.
 */

import fs from 'fs';
import path from 'path';

/**
 * One raw row of data/amazon-prices.json, price or no price.
 *
 * Split out from CachedPriceEntry to close a real hole. getCachedPrice()
 * returns null when a row has no price — correct for RENDERING (there is no
 * price to show) but wrong for GATING, because the rows most likely to lack a
 * price are exactly the dead ones. A sync that reports
 * `{price: null, availability: "OUT_OF_STOCK"}` was therefore invisible to the
 * availability gate, and the pick kept a live Buy CTA on the strength of its
 * frontmatter price. Latent when found (one such row, unrostered) and about to
 * go live: the 2026-08-19 re-read of B0F5HWQ2T1 returns exactly that shape.
 *
 * Gate on getSnapshotEntry(); price on getCachedPrice().
 */
export interface SnapshotEntry {
  price?: string | null;
  lastChecked: string;
  availability?: string | null;
  /**
   * Seller of record on the live Buy Box, captured by the same sync that
   * captured `availability` (Creators API `offersV2.listings[].merchantInfo`).
   *
   * Exists for one reason: the 2026-08-18 backorder ruling turns on WHO is
   * selling. An AVAILABLE_DATE offer sold BY AMAZON is a priced, orderable
   * backorder that a reader can buy today; the same state on a third-party
   * marketplace listing is not something we will send a reader to. Absent on
   * entries written before that sync — absence is UNKNOWN, never "Amazon".
   */
  merchantId?: string | null;
  merchantName?: string | null;
}

/**
 * A snapshot row that carries a usable price — what getCachedPrice() promises
 * its callers, so price-rendering code never has to null-check `price`.
 */
export interface CachedPriceEntry extends SnapshotEntry {
  price: string;
}

/**
 * Amazon.com's own merchant id in the US marketplace. Amazon-as-seller is the
 * only value that clears the backorder ruling — a brand-direct storefront
 * ("Closer Pets - U.S.") is still a third-party seller no matter how official
 * its name reads.
 */
export const AMAZON_MERCHANT_ID = 'ATVPDKIKX0DER';

type PriceCache = Record<string, SnapshotEntry>;

let _cache: PriceCache | null = null;

function loadCache(): PriceCache {
  if (_cache !== null) return _cache;

  const filePath = path.join(process.cwd(), 'data', 'amazon-prices.json');

  try {
    if (!fs.existsSync(filePath)) {
      _cache = {};
      return _cache;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    _cache = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      ? (parsed as PriceCache)
      : {};
  } catch {
    // Malformed JSON or read error — degrade gracefully
    _cache = {};
  }

  return _cache;
}

/**
 * Returns the cached price for an ASIN, or null if not found.
 * Safe to call with undefined (e.g. picks without an ASIN).
 */
export function getCachedPrice(asin: string | undefined): CachedPriceEntry | null {
  if (!asin) return null;
  const cache = loadCache();
  const entry = cache[asin];
  if (!entry || !entry.price) return null;
  return entry as CachedPriceEntry;
}

/**
 * The raw snapshot row for an ASIN, price or no price — what the AVAILABILITY
 * GATE must read.
 *
 * getCachedPrice() above deliberately hides price-less rows, and that is the
 * right call for rendering. It is the wrong call for gating: a sync that
 * reports `{price: null, availability: "OUT_OF_STOCK"}` describes the deadest
 * possible listing, and routing the gate through the price accessor made that
 * row match nothing — the pick kept a live CTA priced from frontmatter. Use
 * this for any liveness decision.
 */
export function getSnapshotEntry(asin: string | undefined): SnapshotEntry | null {
  if (!asin) return null;
  return loadCache()[asin] ?? null;
}

/**
 * §8m snapshot availability gate (2026-08-10 price-desync triage).
 *
 * The dead-ASIN guard (src/lib/dead-asin-guard.ts) only knows the statuses
 * hand-recorded in data/dead-asins.json. The PRICE SNAPSHOT carries a second,
 * fresher liveness signal — the Creators API `availability` string captured on
 * every sync — and nothing consulted it. Result (measured 2026-08-10): 61 guide
 * pick rows across 53 distinct ASINs whose snapshot said "no buyable offer
 * today" were still sold as current picks with a live Buy CTA — plus a
 * cross-guide auto-link leak on top of that (see getSiteWideProductMap in
 * guide-links.ts). This predicate is the one place that decides, from the
 * snapshot
 * alone, whether an ASIN has a buyable offer right now.
 *
 * GATED (no buyable offer today):
 *  - AVAILABLE_DATE — Amazon has a future availability date, not an offer now.
 *                     NOTE: since the 2026-08-18 backorder ruling this is no
 *                     longer the last word. isSnapshotUnbuyable() carves the
 *                     Amazon-sold, priced case back out as a buyable pick with
 *                     a disclosure; third-party and unknown-seller backorders
 *                     stay gated exactly as before. Roster code must call
 *                     isSnapshotUnbuyable(), not this predicate.
 *  - OUT_OF_STOCK   — explicit.
 *  - UNAVAILABLE    — explicit (not currently present in the snapshot, gated
 *                     defensively so a future sync can't reopen the hole).
 *
 * NOT GATED (genuinely purchasable, just imperfect):
 *  - IN_STOCK         — obvious.
 *  - IN_STOCK_SCARCE  — low stock, but the Buy Box is live and converts today.
 *  - LEADTIME         — ships slowly, but the order is placeable today.
 *  - null / undefined / missing — the sync didn't report availability; absence
 *                     of evidence is not evidence of unavailability.
 * Gating scarce/leadtime would fabricate an OutOfStock claim and strip the CTA
 * off a real, working conversion path — the exact reasoning dead-asin-guard.ts
 * already documents for `used_buybox`. Do not "tighten" this list without a
 * live check proving the offer is actually gone.
 *
 * Case-insensitive and null-safe by design: the field is free-form API text.
 */
const UNBUYABLE_AVAILABILITY = new Set(['AVAILABLE_DATE', 'OUT_OF_STOCK', 'UNAVAILABLE']);

export function isUnbuyableAvailability(availability?: string | null): boolean {
  if (!availability) return false;
  return UNBUYABLE_AVAILABILITY.has(availability.trim().toUpperCase());
}

/** True when Amazon itself is the seller of record on the captured Buy Box. */
export function isAmazonSold(entry: SnapshotEntry): boolean {
  return (entry.merchantId || '').trim().toUpperCase() === AMAZON_MERCHANT_ID;
}

/**
 * OWNER RULING 2026-08-18 — BACKORDER POLICY.
 *
 * AVAILABLE_DATE is not one state, it is two, and the 08-10 gate collapsed
 * them into the worse one:
 *
 *  - Sold BY AMAZON: the listing is priced and the order button works. Amazon
 *    takes the order today and ships it on its future availability date. That
 *    is a buyable pick with a delay, and suppressing it threw away a real
 *    conversion over a disclosure problem.
 *  - Sold by a THIRD PARTY: an arm's-length marketplace seller promising a
 *    future ship date on stock we cannot see. Stays suppressed, unchanged.
 *  - UNKNOWN seller (entry written before merchantInfo was captured, or the
 *    sync returned no merchant): treated as third-party. Absence of a seller
 *    signal is not evidence Amazon is the seller — conservative by design, and
 *    it self-heals on the next sync.
 *
 * The price requirement is not decoration: "priced + orderable" is the ruling's
 * own test, and a backorder with no price has nothing to render in the card.
 *
 * Callers that let a pick through on this predicate MUST render
 * backorderDisclosureLabel() next to its CTA. A backorder sold as an ordinary
 * in-stock pick is the dishonest outcome this ruling did not authorise.
 */
export function isDisclosableBackorder(entry: SnapshotEntry): boolean {
  const availability = (entry.availability || '').trim().toUpperCase();
  if (availability !== 'AVAILABLE_DATE') return false;
  return isAmazonSold(entry) && !!entry.price;
}

/**
 * The single snapshot-gate decision for one cache entry: does this ASIN have
 * NOTHING we can honestly send a reader to today?
 *
 * isUnbuyableAvailability() answers the narrower vocabulary question ("is this
 * availability string an in-stock offer?") and keeps its old answer for
 * AVAILABLE_DATE — a backorder genuinely is not in stock. This predicate is
 * the one the roster splits on, and it carves the disclosable-backorder case
 * back out.
 */
export function isSnapshotUnbuyable(entry: SnapshotEntry): boolean {
  if (!isUnbuyableAvailability(entry.availability)) return false;
  return !isDisclosableBackorder(entry);
}

/**
 * Reader-visible disclosure for an Amazon-sold backorder that renders as a
 * normal pick.
 *
 * NO SHIP DATE IS QUOTED, deliberately. The Creators API returns
 * `availability.message` empty on every AVAILABLE_DATE listing in this corpus
 * (20/20, measured 2026-08-18), so there is no date in our data to render. A
 * date written into prose instead would be a hardcoded claim that rots the
 * moment Amazon moves it — the false-freshness failure. What the snapshot DOES
 * support is exactly what this says: Amazon is the seller, the order is
 * placeable, shipping is dated later than in-stock, and here is when we looked.
 *
 * If a future API revision starts returning a real ship date, add it to
 * CachedPriceEntry and render it here — from the field, never from prose.
 */
export function backorderDisclosureLabel(entry: SnapshotEntry): string {
  const date = (entry.lastChecked || '').slice(0, 10);
  const base = 'On backorder at Amazon — you can order it now, but it ships later than in-stock items';
  return date ? `${base}. Checked ${date}.` : `${base}.`;
}

/**
 * True when a pick's `asin` frontmatter field is actually an ASIN, and so
 * identifies a specific Amazon listing we can verify.
 *
 * 15 picks currently carry a SEARCH PHRASE in this field instead
 * (`asin: "Dyson V15 Detect cordless vacuum"`), and 24 more have no `asin` at
 * all. Two consequences:
 *
 *  1. BOTH §8m gates are blind to them. getCachedPrice() and
 *     getDeadAsinEntry() are keyed by ASIN, so a search phrase matches nothing
 *     and neither gate can ever evaluate the pick. The weekly price sync can't
 *     refresh them either, so their frontmatter prices rot permanently.
 *  2. Structured data was fabricating an offer for them: a hard `price` and an
 *     `availability: InStock` claim for a product with no identified listing
 *     and no verified offer.
 *
 * (2) is what this predicate contains — callers omit the Offer node entirely
 * rather than assert a price and stock state nothing backs. Same
 * omit-rather-than-guess rule the availability gate follows.
 *
 * NOT a stock signal. An unverifiable ASIN is OUR data defect, not evidence
 * the product is unbuyable, so these picks keep rendering — unlike the
 * AVAILABLE_DATE class, we have no reason to believe a reader can't buy them.
 *
 * Shape mirrors buildAmazonDest() in go-destination.ts, the function that
 * decides /dp/ vs /s?k= at redirect time — same test, one definition of
 * "this id names a product".
 */
export function isResolvableAsin(asin?: string | null): boolean {
  return !!asin && /^[A-Z0-9]{10}$/.test(asin);
}

/**
 * Honest-state CTA-replacement label for a snapshot-gated pick.
 *
 * Deliberately worded from the snapshot facts only: "not buyable today, as of
 * the last sync". AVAILABLE_DATE/OUT_OF_STOCK say nothing about delisting, so
 * this must NEVER claim the product is gone for good — that's the dead-ASIN
 * guard's `dead` status, which has a live check behind it. Mirrors the wording
 * of guardUnavailableLabel()'s no_offer branch so the two gates read as one
 * consistent honest state.
 */
export function snapshotUnavailableLabel(entry: SnapshotEntry): string {
  const date = (entry.lastChecked || '').slice(0, 10);
  return date
    ? `Currently unavailable on Amazon — checked ${date}`
    : 'Currently unavailable on Amazon';
}
