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
 *   2. [WITHDRAWN 2026-09-24 — see (iv)] Dark card: print the maker's list
 *      price, with "Amazon's price may vary; check the current price," and the
 *      link stays exactly as it is. No "unavailable" treatment, no stripped
 *      links.
 *   3. Product truly gone: replace it. Until the replacement lands, rule 2
 *      applies to the old card.
 *   4. Every figure has a source. A list price comes from the maker's page,
 *      fetch-verified with URL and date; Amazon's price comes from a live page
 *      read. The API is a hint, never a source.
 *   5. Scope is the dark cards. Cards that work today are untouched.
 *
 * Later rulings folded in here:
 *   (i)  [7-DAY EXPIRY RETIRED 2026-09-26 — see (v)] instruments never remove
 *        page elements; live-read overrides used to expire at 7 days.
 *   (ii) [WITHDRAWN 2026-09-24 — see (iv)] a dark card with NO maker price
 *        printed the LAST DATED AMAZON PRICE with "Last Amazon read <date>".
 *  (iii) §8rr.2 — precedence goes to the NEWER successful read, and a live page
 *        read outranks an API read. A snapshot row whose unbuyable flip is
 *        being HELD (`pendingUnbuyableSince`) keeps its LAST CONFIRMED API
 *        price, which can be days old; when a live-New override read the page
 *        more recently, that override is the newer read and it prints. See
 *        rule 0 below for why this is the one place a held row is visible to
 *        rendering code. (Incident: AI Nero 3 B08KZT7SMQ printed $189.99 from
 *        a 2026-09-03 held API row over a same-day live read of $179.99.)
 *   (iv) OWNER RULINGS 2026-09-24 — rule 2 and ruling (ii) are WITHDRAWN.
 *        (a) A maker/brand-sourced price figure is never displayed: Amazon
 *            Associates Participation Requirements §2(b) permit only
 *            Amazon-served / API figures. A frontmatter `listPrice` block has
 *            NO render effect.
 *        (b) "Dark cards show no figure — only the Amazon buy path." A dark
 *            card prints NO price and NO dated-figure chip: not a maker price,
 *            not the snapshot's last price, not the frontmatter price. It keeps
 *            its card, its "Check price" CTA and its /go/ link (buy path
 *            floor). The "lastRead" rung is gone.
 *        (c) Kept: a live-New override (rule 1). It is not a figure for a
 *            dark card — it is live evidence (a live Amazon page read, New
 *            offer) that the listing is NOT dark, so the card renders as live
 *            with Amazon's own figure.
 *    (v) OWNER RULINGS 2026-09-26 — NO TIMER; NEWEST DATED READ WINS. The 7-day
 *        window (§8rr.3) is retired: a live read (data/live-read-overrides.json,
 *        one row per ASIN, written by scripts/record-live-read.ts) never
 *        expires by age. Instead every decision is "the newest dated read":
 *        (a) FIGURE + STAMP. A live-New read's readAt is compared with the
 *            snapshot row's lastChecked. The NEWER one decides: live newer ->
 *            the live figure + its date; API row newer AND buyable AND priced
 *            -> the API figure + its date. Tie -> the live read.
 *        (b) DARK. Only a live read — or a data/dead-asins.json hard gate,
 *            which is live-read-derived (lastVerified) — can darken a card. A
 *            live unavailable / used-only / not-found read darkens on its own,
 *            no dead-asins entry needed (the PR #193 gap). Between a dark
 *            signal and a live-New read, the NEWER wins (readAt vs readAt /
 *            lastVerified; tie -> the live-New read). A card darkened by a live
 *            read stays dark until a NEWER LIVE-New read — an API row can never
 *            relight it, and an API read can never darken (HOLD-only, sync).
 *        Only an unparseable or future-dated readAt (clock skew / bad write)
 *        is ignored.
 *
 * PRECEDENCE:
 *   L. The governing LIVE state = the newer of (live-read row, dead-asins
 *      hard gate). "dark"                                -> "suppressed"
 *   N. Governing live state is live-New:
 *        snapshot row buyable + priced + lastChecked STRICTLY newer than
 *        readAt                                          -> "buyable" (API)
 *        otherwise                                       -> "override" (live)
 *                       (merchant is IGNORED — seller logic belongs to the
 *                        snapshot gate; isAmazonSold() is never consulted.)
 *   0. No live state, snapshot row buyable or absent     -> "buyable"
 *   2. (retired 2026-09-24 — maker list price; see (iv)a)
 *   3. (retired 2026-09-24 — last dated Amazon read; see (iv)b)
 *   4. No live state, snapshot row unbuyable             -> "suppressed"
 *      NO figure, NO chip, NO disclosure. The card still renders with its
 *      "Check price" CTA and /go/ link (buy path floor, guides.ts).
 *
 * Every mode keeps the card and the /go/{ASIN} link. The cookie sets on the
 * click regardless — that is the whole revenue mechanism these rulings
 * protect.
 */

import fs from 'fs';
import path from 'path';
import { isSnapshotUnbuyable, type SnapshotEntry } from './price-cache';
import { priceStampText } from './price-stamp';

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
   * "not-found" are also written here by scripts/record-live-read.ts; since
   * the 2026-09-26 ruling they make the card a figure-less dark card (rule
   * 1b) — the card and its /go/{ASIN} link stay (buy path floor). The sync
   * also reads them to decide the SNAPSHOT row.
   */
  condition?: string | null;
  readAt?: string | null;
  source?: string | null;
  lane?: string | null;
}

export type DarkCardMode = 'buyable' | 'override' | 'suppressed';

export interface DarkCardFigure {
  mode: DarkCardMode;
  /** Formatted, reader-ready figure ("$129.95"). Set ONLY for mode "override". */
  price?: string;
  currency: string;
  /** YYYY-MM-DD the figure was verified/read. */
  date?: string;
  /** Who the figure came from — always "Amazon" (override). */
  sourceLabel?: string;
  /** Reader-visible caveat rendered under the figure. */
  disclosure?: string;
  /** Reader-visible provenance chip rendered under the figure. */
  chip?: string;
}

export interface DarkCardPickInput {
  asin?: string;
  /**
   * RAW frontmatter price string. NEVER printed on a dark card (owner ruling
   * 2026-09-24, (iv)b); accepted only so callers can pass raw frontmatter and
   * the tests can prove it does not leak.
   */
  price?: string;
  /** The guide's price-verified date. Never printed on a dark card; see `price`. */
  guideDate?: string;
  /** True when data/dead-asins.json hard-gates this pick. */
  hardGated?: boolean;
  /**
   * The hard gate's `lastVerified` (YYYY-MM-DD) — the date of the live read it
   * was derived from. A NEWER live-New read relights the card; an older one
   * does not (2026-09-26, newest dated read wins). Absent/unparseable = the
   * gate has no date, so any valid live-New read is newer.
   */
  hardGateVerifiedAt?: string | null;
}

/**
 * The live-read states that mean the listing is DARK, in both fields the
 * override shape carries. `condition` is the field scripts/record-live-read.ts
 * writes; `availability` is accepted too so a lane that only captured
 * availability still counts. Shared with scripts/sync-amazon-prices.ts so the
 * render layer and the sync cannot disagree about what "dark" means.
 *
 * No age constant lives here any more: live reads do not expire (owner ruling
 * 2026-09-26, retiring the §8rr.3 7-day window). The newest live read of an
 * ASIN stands until a newer live read replaces it.
 */
export const LIVE_READ_DARK_CONDITIONS: ReadonlySet<string> = new Set(['unavailable', 'used-only', 'not-found']);
export const LIVE_READ_DARK_AVAILABILITY: ReadonlySet<string> = new Set([
  'OUT_OF_STOCK',
  'UNAVAILABLE',
  'USED_ONLY',
  'NOT_FOUND',
]);

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
 * True for an override row this module will PRINT a figure from: a live page
 * read of a NEW offer, with a real positive price and a parseable readAt that
 * is not future-dated (clock skew or a bad write is never fresher evidence).
 * ANY AGE — live reads have no timer (owner ruling 2026-09-26). Whether it
 * actually prints is decided by resolveDarkCardFigure(): the newest dated read
 * wins against the snapshot row and a dead-asins gate.
 */
export function isRenderableLiveNewOverride(
  override: LiveReadOverride | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!override) return false;
  if (typeof override.price !== 'number' || !Number.isFinite(override.price) || override.price <= 0) {
    return false;
  }
  if ((override.condition || '').trim().toLowerCase() !== 'new') return false;
  const age = ageInDays(override.readAt, now);
  return age !== null && age >= 0;
}

/**
 * True for an override row that says the listing is DARK — a live page read
 * that found it unavailable / used-only / not-found — with a parseable,
 * not-future-dated readAt. ANY AGE (owner ruling 2026-09-26). Such a read makes
 * the card a figure-less dark card on its own (rule L) — no dead-asins entry
 * needed, and no API row can relight it; only a newer live-New read replacing
 * it can. It never removes the card or its /go/ link (buy path floor).
 */
export function isLiveDarkOverride(
  override: LiveReadOverride | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!override) return false;
  const condition = (override.condition || '').trim().toLowerCase();
  const availability = (override.availability || '').trim().toUpperCase();
  if (condition === 'new') return false;
  if (!LIVE_READ_DARK_CONDITIONS.has(condition) && !LIVE_READ_DARK_AVAILABILITY.has(availability)) return false;
  const age = ageInDays(override.readAt, now);
  return age !== null && age >= 0;
}

/**
 * True when this snapshot row's unbuyable flip is being HELD by the two-read
 * hysteresis: the row's price / availability / seller are the LAST CONFIRMED
 * values, deliberately retained, and `lastChecked` deliberately still points at
 * that older confirmed read (see SnapshotEntry.pendingUnbuyableSince).
 *
 * A held row is still treated as buyable by every gate (isSnapshotUnbuyable()
 * is unchanged). A held row's lastChecked is its last CONFIRMED read, so
 * under "newest dated read wins" (2026-09-26) a later live-New read outranks
 * it by date alone — resolveDarkCardFigure() no longer needs this marker.
 */
export function isHeldSnapshotRow(row: SnapshotEntry | null | undefined): boolean {
  return !!row && typeof row.pendingUnbuyableSince === 'string' && row.pendingUnbuyableSince.trim() !== '';
}

/**
 * The LIVE state that governs this pick (owner ruling 2026-09-26, newest dated
 * read wins), from the two live-read-derived signals: the live-read row and a
 * dead-asins hard gate (dated by lastVerified). "dark" / "new" / null (no
 * valid live signal). Between a live-New read and a hard gate the NEWER wins,
 * compared by day since lastVerified is a date; a tie goes to the live-New
 * read (its readAt is a timestamp, the gate's is a day).
 */
export function governingLiveState(
  pick: Pick<DarkCardPickInput, 'hardGated' | 'hardGateVerifiedAt'>,
  override: LiveReadOverride | null | undefined,
  now: Date = new Date(),
): 'dark' | 'new' | null {
  if (isLiveDarkOverride(override, now)) return 'dark';
  const liveNew = isRenderableLiveNewOverride(override, now);
  if (!pick.hardGated) return liveNew ? 'new' : null;
  if (!liveNew) return 'dark';
  const gateDay = dayStamp(pick.hardGateVerifiedAt);
  const readDay = dayStamp(override?.readAt);
  return /^\d{4}-\d{2}-\d{2}$/.test(gateDay) && gateDay > readDay ? 'dark' : 'new';
}

/**
 * True when the API snapshot row, not the live-New read, is the newest dated
 * read that can set the figure: the row is buyable, carries a price, and its
 * lastChecked is STRICTLY later than the live read's readAt (tie -> live).
 * An unbuyable row never wins here: the API may only HOLD, never darken.
 */
export function isSnapshotNewerThanLiveRead(
  row: SnapshotEntry | null | undefined,
  override: LiveReadOverride | null | undefined,
): boolean {
  if (!row || !override || !row.price || isSnapshotUnbuyable(row)) return false;
  const rowMs = Date.parse(row.lastChecked || '');
  const liveMs = Date.parse(override.readAt || '');
  return Number.isFinite(rowMs) && Number.isFinite(liveMs) && rowMs > liveMs;
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
  // OWNER RULINGS 2026-09-26 — no timer; the newest dated read wins.
  const live = governingLiveState(pick, override, now);

  // --- L. Live DARK (a live unavailable / used-only / not-found read, or a
  // dead-asins hard gate, newer than any live-New read): figure-less, buy path
  // kept. No API row can relight it — only a NEWER live-New read can.
  if (live === 'dark') return { mode: 'suppressed', currency: 'USD' };

  // --- N. Live-New governs the live state: its figure prints UNLESS a buyable,
  // priced API row was read strictly later (tie -> the live read).
  if (live === 'new' && override) {
    if (isSnapshotNewerThanLiveRead(snapshotRow, override)) return { mode: 'buyable', currency: 'USD' };
    return overrideFigure(override);
  }

  // --- 0. No live state: today's code path, untouched.
  const snapshotDark = !!snapshotRow && isSnapshotUnbuyable(snapshotRow);
  if (!snapshotDark) {
    return { mode: 'buyable', currency: 'USD' };
  }

  // --- 2/3. RETIRED (owner rulings 2026-09-24, (iv)a/b). No maker figure, no
  // snapshot last price, no frontmatter price: a dark card prints nothing but
  // its buy path.

  // --- 4. Dark, no live read: no figure. The card and its /go/ link stay.
  return { mode: 'suppressed', currency: 'USD' };
}

/**
 * The "override" figure for a live-read row the caller has already checked with
 * isRenderableLiveNewOverride(): Amazon's live New price, dated by `readAt`.
 */
export function overrideFigure(override: LiveReadOverride): DarkCardFigure {
  const currency = (override.currency || 'USD').toUpperCase();
  const date = dayStamp(override.readAt);
  return {
    mode: 'override',
    price: formatFigure(override.price as number, currency),
    currency,
    date,
    sourceLabel: 'Amazon',
    // CLAUDE.md §4 (owner 2026-09-24): an offer price is labeled as the
    // current price, with its dated check notation — the same stamp every
    // priced card carries (src/lib/price-stamp.ts).
    chip: priceStampText('current', date),
  };
}

/**
 * True for the one mode that prints a live-read figure: a live-New override
 * that is the newest dated read (2026-09-26). Every other gated pick is a
 * figure-less dark card.
 */
export function isRelitMode(mode: DarkCardMode): boolean {
  return mode === 'override';
}

// ---------------------------------------------------------------------------
// data/live-read-overrides.json loader
//
// Optional by design: the file ships on its own data PR (#164). When it is
// absent every lookup returns null and precedence falls straight through to
// rule 4 — the render change is independent of that PR landing.
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
// Build-time dark-card log. Every pick here renders buy path only — no figure
// (owner ruling 2026-09-24) — and is a rule-3 replacement candidate. It is the
// number the owner is owed, worked toward zero by replacement.
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
  return `[dark-card] figure-less dark cards (buy path only): ${suppressedPickKeys.size} picks — ${ids.join(', ') || '(none)'}`;
}

let _logged = false;
export function logDarkCardSuppressions(): void {
  if (_logged) return;
  _logged = true;
  console.log(darkCardSuppressionSummary());
}
