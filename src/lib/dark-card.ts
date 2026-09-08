/**
 * DARK-CARD FIGURE PRECEDENCE — owner emergency ruling 2026-09-07 (~21:00 PT,
 * reinforced ~22:45 PT). One function, one decision, every consumer.
 *
 * A "dark card" is a pick that today's two automatic gates (the
 * data/dead-asins.json hard gate and the price-snapshot availability gate in
 * price-cache.ts) would remove from every surface. The ruling says that is now
 * the LAST resort, not the first:
 *
 *   1. Live Amazon price on the card: keep it. (mode "buyable" — untouched.)
 *   2. Dark card: print the maker's list price, with "Amazon's price may vary;
 *      check the current price," and the link stays exactly as it is. No blank
 *      figures, no "unavailable" treatment, no stripped links.
 *   3. Product truly gone: replace it. Until the replacement lands, rule 2
 *      applies to the old card.
 *   4. Every figure has a source. A list price comes from the maker's page,
 *      fetch-verified with URL and date; Amazon's price comes from a live page
 *      read. The API is a hint, never a source.
 *   5. Scope is the dark cards. Cards that work today are untouched.
 *
 * Later rulings folded in here:
 *   (i)  instruments never remove page elements; instrument opinions expire at
 *        7 days — so a stale live-read override cannot keep a figure alive
 *        forever (7-day ceiling, rule 1 below) and an override can only ever
 *        ADD a figure, never take one away.
 *   (ii) a dark card with NO maker price prints the LAST DATED AMAZON PRICE
 *        with "Last Amazon read <date>". A dark card is never suppressed if any
 *        dated figure exists.
 *
 * PRECEDENCE (first match wins):
 *   0. The pick is not dark at all (no hard gate, snapshot row buyable or
 *      absent)                                        -> "buyable"
 *   1. A live-read override for the ASIN, condition New, read within 7 days
 *      -> "override"    (Amazon's own live price; merchant is IGNORED here —
 *                        seller logic belongs to the snapshot gate, and this
 *                        override exists precisely because the snapshot is
 *                        wrong or blind. isAmazonSold() is never consulted.)
 *   2. A valid `listPrice` block on the pick             -> "listPrice"
 *   3. A dated Amazon price we already hold: the snapshot row's price with its
 *      lastChecked date, else the pick's frontmatter price with the guide's
 *      price-verified date                              -> "lastRead"
 *   4. No figure anywhere                               -> "suppressed"
 *
 * Everything except mode "suppressed" keeps the card, the figure and the
 * /go/{ASIN} link. The cookie sets on the click regardless of which figure the
 * card showed — that is the whole revenue mechanism this ruling protects.
 */

import fs from 'fs';
import path from 'path';
import { isSnapshotUnbuyable, type SnapshotEntry } from './price-cache';

/**
 * Placeholder-price guard (card-blanks fix, 2026-08). Lives here rather than in
 * guides.ts because the precedence function has to answer "is there a real
 * figure?" without importing the parser that calls it. guides.ts re-exports it,
 * so its public API is unchanged.
 */
const PLACEHOLDER_PRICES = new Set(['check price', 'check amazon', 'verify at retailer']);

export function isPlaceholderPrice(price: string | undefined | null): boolean {
  if (!price) return false;
  return PLACEHOLDER_PRICES.has(price.trim().toLowerCase());
}

/**
 * Maker's list price, authored in pick frontmatter (owner ruling, rule 2/4).
 *
 * ALL FIVE KEYS ARE REQUIRED and `sourceUrl` may never be an amazon.com URL:
 * the whole point of the field is that it carries a figure Amazon is not
 * currently showing, fetch-verified at the maker's own page. A partial block is
 * a validator ERROR, never a silently-ignored field — see isValidListPrice().
 */
export interface PickListPrice {
  amount: number;
  currency: string;
  sourceUrl: string;
  sourceLabel: string;
  verifiedAt: string;
}

/**
 * One row of data/live-read-overrides.json — a LIVE page read of an Amazon
 * listing, written by the dark-card live-read lane. Shape is fixed by that
 * lane's writer (see PR #164).
 *
 * `merchant` is deliberately unused by this module. Seller-of-record logic
 * belongs to the snapshot backorder ruling; an override is a statement about
 * what a human-equivalent live read saw on the page, and rule 4 says that read
 * IS the source.
 */
export interface LiveReadOverride {
  price?: number | null;
  currency?: string | null;
  /**
   * Live availability. "IN_STOCK" for a live-New read; the 2026-09-08 ruling
   * adds the dark states OUT_OF_STOCK / USED_ONLY / NOT_FOUND, which
   * scripts/sync-amazon-prices.ts reads as a confirmation that a held row is
   * genuinely unbuyable. ADDITIVE — every row written before that ruling
   * carries IN_STOCK and behaves exactly as it did.
   */
  availability?: string | null;
  merchant?: string | null;
  /**
   * "New" for a live New offer — the ONLY value this module renders a figure
   * from (rule 1 below). The dark states "unavailable" / "used-only" /
   * "not-found" are also written here by scripts/record-live-read.ts; this
   * module deliberately does NOT render from them and does not suppress on
   * them either. They fall through to rule 2/3, so a dark verdict still leaves
   * a dated figure and the /go/{ASIN} link on the card (§8rr: an instrument
   * never removes a page element). Their consumer is the sync, which uses them
   * to decide the SNAPSHOT row — never the card.
   */
  condition?: string | null;
  readAt?: string | null;
  source?: string | null;
  lane?: string | null;
}

export type DarkCardMode = 'buyable' | 'override' | 'listPrice' | 'lastRead' | 'suppressed';

export interface DarkCardFigure {
  mode: DarkCardMode;
  /** Formatted, reader-ready figure ("$899.99"). Absent for buyable/suppressed. */
  price?: string;
  currency: string;
  /** YYYY-MM-DD the figure was verified/read. */
  date?: string;
  /** Who the figure came from ("Amazon", "iRobot", …). */
  sourceLabel?: string;
  /** Reader-visible caveat rendered under the figure. */
  disclosure?: string;
  /** Reader-visible provenance chip rendered under the figure. */
  chip?: string;
}

export interface DarkCardPickInput {
  asin?: string;
  /** RAW frontmatter price string, placeholder or not. */
  price?: string;
  listPrice?: PickListPrice;
  /** The guide's price-verified date (lastProductCheck), else updated/publish date. */
  guideDate?: string;
  /** True when data/dead-asins.json hard-gates this pick. */
  hardGated?: boolean;
}

/** Owner rule 2 disclosure — the exact sentence, one definition. */
export const PRICE_MAY_VARY_DISCLOSURE =
  "Amazon's price may vary; check the current price.";

/**
 * Live-read overrides expire at SEVEN days — §8rr.3, one window for every
 * instrument opinion including a live read (narrowed from 14 on 2026-09-08).
 *
 * The 14-day version reasoned that a live page read deserves double an API
 * read's window. The ruling that made a live read the ONLY thing that can
 * darken a card (§8rr.1) is exactly why it cannot also be the longest-lived
 * figure we print: the same override row now (a) prints a price to a reader and
 * (b) authorises scripts/sync-amazon-prices.ts to write a row unbuyable, and a
 * receipt that can take a card dark must not outlive the 7-day window every
 * other receipt in the portfolio is held to.
 *
 * Past 7 days the override falls through to the maker list price or to the last
 * dated Amazon read — never off the card (§8rr: an expiring instrument opinion
 * removes nothing; it only stops adding).
 */
export const OVERRIDE_MAX_AGE_DAYS = 7;

/** True when every required listPrice key is present and honest. */
export function isValidListPrice(value: unknown): value is PickListPrice {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.amount !== 'number' || !Number.isFinite(v.amount) || v.amount <= 0) return false;
  for (const key of ['currency', 'sourceUrl', 'sourceLabel', 'verifiedAt'] as const) {
    if (typeof v[key] !== 'string' || !v[key]) return false;
  }
  // Rule 4: a LIST price comes from the maker. An amazon.com URL here is either
  // a mislabelled Buy-Box price or a fabricated provenance; both are errors.
  if (/(^|\.)amazon\.[a-z.]+/i.test(hostOf(String(v.sourceUrl)))) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v.verifiedAt))) return false;
  return true;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** "$1,574.00" for USD; "EUR 12.50" for anything else (no invented symbols). */
export function formatFigure(amount: number, currency = 'USD'): string {
  const fixed = Math.abs(amount).toFixed(2);
  const [whole, cents] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const cur = (currency || 'USD').toUpperCase();
  return cur === 'USD' ? `$${grouped}.${cents}` : `${cur} ${grouped}.${cents}`;
}

function dayStamp(iso: string | null | undefined): string {
  return (iso || '').slice(0, 10);
}

function ageInDays(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (now.getTime() - t) / 86_400_000;
}

/**
 * THE decision. Pure — every input is passed in, so the gates, the tests and
 * the renderer all reach the same verdict from the same code.
 */
export function resolveDarkCardFigure(
  pick: DarkCardPickInput,
  snapshotRow: SnapshotEntry | null | undefined,
  override: LiveReadOverride | null | undefined,
  now: Date = new Date(),
): DarkCardFigure {
  // --- 0. Not a dark card. The caller takes today's code path, untouched.
  // Scope discipline (owner rule 5): this branch must return before ANY of the
  // new figure logic runs, so a working card cannot be re-derived by accident.
  const snapshotDark = !!snapshotRow && isSnapshotUnbuyable(snapshotRow);
  if (!pick.hardGated && !snapshotDark) return { mode: 'buyable', currency: 'USD' };

  // --- 1. Live read override (rule 4: a live page read IS a source).
  const age = ageInDays(override?.readAt, now);
  const condition = (override?.condition || '').trim().toLowerCase();
  if (
    override &&
    typeof override.price === 'number' &&
    Number.isFinite(override.price) &&
    override.price > 0 &&
    condition === 'new' &&
    age !== null &&
    age >= 0 &&
    age <= OVERRIDE_MAX_AGE_DAYS
  ) {
    const currency = (override.currency || 'USD').toUpperCase();
    const date = dayStamp(override.readAt);
    return {
      mode: 'override',
      price: formatFigure(override.price, currency),
      currency,
      date,
      sourceLabel: 'Amazon',
      chip: `Last Amazon read ${date}`,
    };
  }

  // --- 2. Maker's list price (owner rule 2).
  if (isValidListPrice(pick.listPrice)) {
    const lp = pick.listPrice;
    const currency = lp.currency.toUpperCase();
    return {
      mode: 'listPrice',
      price: formatFigure(lp.amount, currency),
      currency,
      date: lp.verifiedAt,
      sourceLabel: lp.sourceLabel,
      disclosure: PRICE_MAY_VARY_DISCLOSURE,
      chip: `List price · ${lp.sourceLabel} · verified ${lp.verifiedAt}`,
    };
  }

  // --- 3. The last dated Amazon price we hold (ruling ii). Snapshot first —
  // it is a machine read with its own date — then the guide's own frontmatter
  // price carrying the guide's price-verified date. Either way the figure is
  // DATED on the card, so no reader can mistake it for a live quote.
  const snapshotPrice = (snapshotRow?.price || '').trim();
  if (snapshotPrice && !isPlaceholderPrice(snapshotPrice)) {
    const date = dayStamp(snapshotRow?.lastChecked);
    return {
      mode: 'lastRead',
      price: snapshotPrice,
      currency: 'USD',
      date: date || undefined,
      sourceLabel: 'Amazon',
      disclosure: PRICE_MAY_VARY_DISCLOSURE,
      chip: date ? `Last Amazon read ${date}` : 'Last Amazon read',
    };
  }

  const frontmatterPrice = (pick.price || '').trim();
  const guideDate = dayStamp(pick.guideDate);
  if (frontmatterPrice && !isPlaceholderPrice(frontmatterPrice) && guideDate) {
    return {
      mode: 'lastRead',
      price: frontmatterPrice,
      currency: 'USD',
      date: guideDate,
      sourceLabel: 'Amazon',
      disclosure: PRICE_MAY_VARY_DISCLOSURE,
      chip: `Last Amazon read ${guideDate}`,
    };
  }

  // --- 4. Nothing dated anywhere. Today's suppression is the honest outcome.
  return { mode: 'suppressed', currency: 'USD' };
}

/** True for the three modes that keep the card, the figure and the link. */
export function isRelitMode(mode: DarkCardMode): boolean {
  return mode === 'override' || mode === 'listPrice' || mode === 'lastRead';
}

// ---------------------------------------------------------------------------
// data/live-read-overrides.json loader
//
// Optional by design: the file ships on its own data PR (#164). When it is
// absent every lookup returns null and precedence falls straight through to
// rule 2 — the render change is independent of that PR landing.
// ---------------------------------------------------------------------------
type OverrideCache = Record<string, LiveReadOverride>;
let _overrides: OverrideCache | null = null;

export function getLiveReadOverride(asin: string | undefined): LiveReadOverride | null {
  if (!asin) return null;
  if (_overrides === null) {
    const filePath = path.join(process.cwd(), 'data', 'live-read-overrides.json');
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      _overrides =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as OverrideCache)
          : {};
    } catch {
      _overrides = {};
    }
  }
  return _overrides[asin] ?? null;
}

// ---------------------------------------------------------------------------
// Build-time suppression log. What is left dark AFTER the ruling is the number
// the owner is owed — every one of these is a pick with no dated figure
// anywhere, i.e. a rule-3 replacement candidate.
// ---------------------------------------------------------------------------
const suppressedPickKeys = new Map<string, string>();

export function recordDarkCardSuppression(slug: string, rank: number, asin?: string): void {
  suppressedPickKeys.set(`${slug}#${rank}`, asin || '(no asin)');
}

export function darkCardSuppressionSummary(): string {
  // ASIN where there is one, guide#rank where there is not — the no-listing
  // picks carry no ASIN at all and an all-"(no asin)" list identifies nothing.
  const ids = [...suppressedPickKeys.entries()]
    .map(([key, asin]) => (asin === '(no asin)' ? key : asin))
    .sort();
  return `[dark-card] still suppressed after precedence: ${suppressedPickKeys.size} picks — ${ids.join(', ') || '(none)'}`;
}

let _logged = false;
export function logDarkCardSuppressions(): void {
  if (_logged) return;
  _logged = true;
  console.log(darkCardSuppressionSummary());
}
