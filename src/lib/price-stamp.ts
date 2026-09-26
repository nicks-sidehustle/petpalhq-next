/**
 * DATED "CHECKED" STAMP — owner rulings 2026-09-24 (CLAUDE.md §3, §4).
 *
 *   "Every displayed price carries a dated 'checked <date>' notation."
 *   "We are in compliance as long as all the list prices have a date stamped
 *    check notation."
 *
 * The date is the day the DISPLAYED figure was actually read, from the figure's
 * own source — never a guide-level stamp (`lastProductCheck` is a content stamp
 * and proves nothing about when a price was read; the false-freshness class):
 *
 *   - snapshot figure  -> that ASIN's `lastChecked` in data/amazon-prices.json
 *   - live-read figure -> the override's `readAt` in data/live-read-overrides.json
 *
 * A figure with no dated read behind it (a frontmatter price with no snapshot
 * row) cannot carry a truthful stamp, so it is not displayed: the card renders
 * buy path only, like a dark card (see parsePicks in guides.ts).
 *
 * Server-safe: no `fs`, so the sticky bar's client component can share types.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-08" or "2026-09-08T17:32:41Z" -> "2026-09-08"; null when not a date. */
export function checkedDay(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((iso || '').trim());
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** "2026-09-08" -> "Sep 8, 2026". Read from the string, so no timezone shift. */
export function formatCheckedDate(day: string): string {
  const [y, mo, d] = day.split('-').map(Number);
  return `${MONTHS[mo - 1]} ${d}, ${y}`;
}

export type PriceBasis = 'list' | 'current';

/** "List price · checked Sep 8, 2026" / "Current price · checked Sep 8, 2026". */
export function priceStampText(basis: PriceBasis, day: string): string {
  return `${basis === 'list' ? 'List' : 'Current'} price · checked ${formatCheckedDate(day)}`;
}

function amount(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const m = /([\d,]+(?:\.\d+)?)/.exec(value || '');
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * True only when the displayed figure IS Amazon's list price: the snapshot row
 * says its reference price is a LIST_PRICE (not a WAS_PRICE) and the figure on
 * the card equals it. Anything else is labeled "Current price".
 */
export function isListPriceFigure(
  figure: string,
  row: { listPrice?: string | null; listPriceBasis?: string | null } | null | undefined,
): boolean {
  if (!row || row.listPriceBasis !== 'LIST_PRICE') return false;
  const shown = amount(figure);
  const list = amount(row.listPrice);
  return shown !== null && list !== null && Math.abs(shown - list) < 0.005;
}

// ---------------------------------------------------------------------------
// Build-time log: figures withheld because nothing dates them.
// ---------------------------------------------------------------------------
const undatedKeys = new Map<string, string>();

export function recordUndatedFigure(slug: string, rank: number, asin?: string): void {
  undatedKeys.set(`${slug}#${rank}`, asin || '(no asin)');
}

export function undatedFigureSummary(): string {
  const ids = [...undatedKeys.keys()].sort();
  return `[price-stamp] figures withheld — no dated read on record (frontmatter price, no snapshot row): ${undatedKeys.size} picks — ${ids.join(', ') || '(none)'}`;
}

let _logged = false;
export function logUndatedFigures(): void {
  if (_logged) return;
  _logged = true;
  console.log(undatedFigureSummary());
}
