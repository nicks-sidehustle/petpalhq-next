#!/usr/bin/env npx tsx
/**
 * price-drift-detector — port of smarthome-explorer-blog's scripts/audit/
 * price-drift-detector.ts (SHE issue #446 / PR #454), adapted to
 * petpalhq-next's actual data shapes. Mechanical audit: the price a guide
 * states in its own frontmatter vs the price the site actually renders from
 * the amazon-prices.json snapshot. REPORT-ONLY — no writes, no auto-fixing,
 * no network calls.
 *
 * WHY THIS EXISTS (SHE #446): the SHE pool-lane arc (#439/#444) found four
 * products in ONE guide whose editorial price was stale while the price
 * snapshot was current in every case. The snapshot layer updates mechanically
 * (weekly-price-sync.yml → sync-amazon-prices.ts); the editorial layer never
 * reconciles against it. On SHE the editorial layer is consensus-data.ts
 * rows; here it is guide frontmatter `picks[]`. Same bug, different container.
 *
 * WHY THIS MATTERS MORE HERE THAN THE CARD PRICE SUGGESTS. src/lib/guides.ts:
 * 534-538 resolves `getCachedPrice(asin)?.price || frontmatterPrice`, so when
 * a snapshot entry EXISTS the rendered card price is already correct and the
 * stale frontmatter number is invisible on the card. It is NOT invisible
 * everywhere: the pick's `body`, `verdict`, and comparison prose are written
 * around the frontmatter number and are NOT overridden by anything. A pick
 * whose card says $62.99 while its own paragraph argues "at $105 this is a
 * lot of topper for the money" is the comparative-prose price-rot class. This
 * report is therefore the scoping tool for prose sweeps, exactly as on SHE:
 * a large delta here means the prose around that pick needs reading.
 *
 * ── PORT DELTAS vs the SHE original (petpalhq-next is NOT SHE) ──
 *
 * 1. THE EDITORIAL SIDE IS GUIDE FRONTMATTER, NOT consensus-data.ts.
 *    src/lib/content/consensus-data.ts exists here but `consensusReviews` is
 *    literally `[]` (v2 scaffold, never populated). The real product corpus is
 *    1,257 `picks[]` entries across 244 markdown guides in src/content/guides,
 *    each carrying `price`, `asin`, `name`, `rank` and `label`. Porting against
 *    consensus-data.ts would have produced a clean, meaningless "0 compared".
 *
 * 2. FRONTMATTER IS READ RAW, DELIBERATELY NOT VIA getAllGuides(). parsePicks
 *    in guides.ts already merges the snapshot price OVER the frontmatter price
 *    (line 535). Comparing getAllGuides() output against the snapshot would
 *    compare the snapshot with itself and report a permanent, reassuring 0%
 *    drift. This script parses the .md frontmatter directly with gray-matter
 *    so it sees the un-merged editorial number — the whole point of the audit.
 *
 * 3. NO LAST-WINS COLLAPSE. SHE groups consensus rows by product id and treats
 *    the last array entry as canonical, because only one row can render. Here
 *    the same ASIN legitimately appears in several guides (a product featured
 *    in multiple roundups) and EACH guide renders its OWN frontmatter price
 *    independently. So every pick is compared on its own; nothing is collapsed.
 *    The unit of comparison is a pick (`{guide-slug}#rank{N}`), not a product.
 *
 * 4. THE "key-conflict" CLASS IS STRUCTURALLY IMPOSSIBLE IN THIS STORE, and is
 *    reported as such rather than as a reassuring zero. SHE's key conflicts are
 *    the same ASIN reachable under two different snapshot KEYS (a productId
 *    slug key and a raw ASIN key) with two different prices. data/amazon-prices
 *    .json here is keyed by ASIN and nothing else, so one ASIN is one key by
 *    construction. The script proves that rather than assuming it: every key is
 *    tested against /^[A-Z0-9]{10}$/ and any non-ASIN key is reported as a real
 *    finding (it would mean the store's key contract has broken).
 *
 * 5. THE "dup-row" CLASS BECOMES CROSS-GUIDE ASIN DISAGREEMENT — the same bug,
 *    relocated. SHE flags one product id carrying two different `priceRange`
 *    values in consensus-data.ts. Here the equivalent is one ASIN carrying two
 *    different frontmatter prices across two picks: the site is quoting two
 *    different prices for the identical product. As in the original, this is an
 *    editorial-hygiene bug independent of whether the ASIN currently has
 *    comparable live pricing, so it is computed ONCE up front over EVERY pick,
 *    before any comparability gate, and never recomputed inside the main loop.
 *
 * 6. TWO EXTRA EXCLUSION REASONS THAT SHE HAS NO EQUIVALENT FOR:
 *    - `no-asin`: getCachedPrice(undefined) returns null (price-cache.ts:55),
 *      so an ASIN-less pick never reads the snapshot and renders its
 *      frontmatter price. Nothing to drift against.
 *    - `dead-asin-gated`: data/dead-asins.json hard-gates DEAD / NO-OFFER ASINs
 *      (§8m guard, guides.ts:550). Production forces those picks unavailable
 *      and replaces the CTA regardless of frontmatter, so a price delta on them
 *      is drift against a number no buyer can act on. USED-BUYBOX is NOT gated
 *      (those ASINs are genuinely purchasable) and stays in the comparison.
 *
 * 7. REVENUE LANES ARE PET LANES, not SHE's pool/security/hubs. See
 *    REVENUE_LANES for the selection rationale.
 *
 * 8. CATEGORY VALUES ARE UNNORMALIZED IN THIS CORPUS ("Cats & Dogs" 126 guides
 *    but also stray "Dog" / "Dogs" / "Cat" singletons). Lane matching and the
 *    roll-up normalize separators so a lane is not silently split into
 *    half-rows that each look half as bad as the lane really is.
 *
 * PRESERVED UNCHANGED from the original: the >5%/>15%/>25% bands, midpoint
 * parsing of price ranges, `/mo` subscription-string handling, the
 * unavailable-with-stale-nonzero-price exclusion, and per-id exclusion
 * reporting instead of a silent aggregate count.
 *
 * Usage:
 *   npm run audit:price-drift                      # human report
 *   npm run audit:price-drift -- --json            # machine-readable (always includes `excluded[]`)
 *   npm run audit:price-drift -- --top=50          # override top-N (default 20)
 *   npm run audit:price-drift -- --show-excluded   # human report: also print the excluded-id table
 *   npm run audit:price-drift:charts               # same, with --strict-charts (exit 1 on chart drift)
 * Exit 0 always, UNLESS --strict-charts is passed AND the chart-cell pass (below)
 * finds DRIFT or column-mismatch — report-only otherwise.
 *
 * ── CHART-CELL PASS (added, W4 #156 H1) ──
 * The pick-level pass above never looks at `comparison.rows` — the chart
 * table rendered beside the pick cards. Since PR #156, guides carry
 * price/cost-shaped chart rows (e.g. "Price (verified 2026-08-10)", "3-Year
 * Cost") whose cells are FROZEN LITERALS: the pick card beside them re-reads
 * data/amazon-prices.json every build, the chart cell does not. #156's W4
 * caught exactly this — a "3-Year Cost" cell reading $29 against a $24
 * snapshot buy-box on best-gps-trackers-for-cats-2026 (the AirTag column).
 * This pass finds every such row, maps its columns to `picks[]` BY INDEX
 * (the render layer's own ordering), and compares each cell to the buy-box
 * with the same drift threshold and exclusion vocabulary as the pick pass,
 * plus two chart-specific findings:
 *   - `column-mismatch`: `values.length !== picks.length` — the row cannot be
 *     mapped to picks at all, which is itself a defect class.
 *   - `list-price-cell`: the cell equals the snapshot's `listPrice`, not its
 *     buy-box `price` — the 2026-09-02 buy-box+list ruling wants the buy-box.
 * A "derived" label (a multi-year/lifetime/per-unit/recurring cost concept —
 * see DERIVED_LABEL_RE) is not 1:1 comparable to one ASIN's buy-box and is
 * excluded by default (`derived-cost`, printed for eyeballing); the one
 * exception is when the guide's own Subscription row says a column has no
 * plan, in which case the derived total must collapse to the buy-box and IS
 * compared. See `analyzeGuideChartCells` for the full per-guide logic —
 * extracted as a pure function precisely so it is testable without the corpus.
 */
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { isPlaceholderPrice } from '../../src/lib/guides';
import { getDeadAsinEntry, isHardGateStatus } from '../../src/lib/dead-asin-guard';

const ROOT = path.join(import.meta.dirname, '..', '..');
const GUIDES_DIR = path.join(ROOT, 'src/content/guides');
const SNAPSHOT_PATH = path.join(ROOT, 'data/amazon-prices.json');

/** Mirrors CachedPriceEntry in src/lib/price-cache.ts. Note `price` is a
 *  formatted STRING here ("$1,027.94"), not a number as it is on SHE. */
export interface SnapshotEntry {
  price: string;
  lastChecked: string;
  availability?: string | null;
  /**
   * The Creators API `savingBasis` figure (LIST_PRICE / WAS_PRICE), when the
   * listing carries one — data/amazon-prices.json has this on ~1 in 5 rows.
   * Only read for the chart-cell pass's `list-price-cell` flag: the
   * 2026-09-02 buy-box+list ruling wants prose/cells to compare on the buy-
   * box (`price` above), not this. Not consumed by the pick-level pass above,
   * which predates the ruling and is unchanged here.
   */
  listPrice?: string | null;
}

/** Report-only drift bands (abs % delta). */
const DRIFT_BANDS = [5, 15, 25] as const;

/** A snapshot key must be a bare ASIN — see port delta 4. */
const ASIN_RE = /^[A-Z0-9]{10}$/;

/**
 * Availability markers that mean "not a comparable live price". UNAVAILABLE is
 * self-explanatory; AVAILABLE_DATE is a preorder/backorder marker whose price
 * is a placeholder for a product you cannot buy today. IN_STOCK and
 * IN_STOCK_SCARCE are both genuinely purchasable and stay in the comparison.
 */
const UNAVAILABLE_STATES = new Set(['UNAVAILABLE', 'OUT_OF_STOCK', 'AVAILABLE_DATE']);

/**
 * Chart-cell pass (W4 #156 H1): a `comparison.rows` row whose LABEL names a
 * price/cost concept. Named constant so both the JSON and human report can
 * print which labels actually matched — the coverage signal needed to see
 * this pass is really scanning the corpus, not just the ones anticipated.
 * Corpus-scanned 2026-09 (92 of 238 comparison-bearing guides, 36 distinct
 * matching labels): "Price (verified ...)", "Approx. price", "MSRP",
 * "3-Year Cost", "Ongoing cost after purchase", "Pack size & cost-per-filter",
 * etc. — see DERIVED_LABEL_RE below for how those get split.
 */
const PRICE_LABEL_RE = /\b(price|cost|msrp)\b/i;

/**
 * Sub-classifies a price/cost-shaped label as DERIVED — a multi-year/
 * lifetime aggregate, a per-unit rate, or a recurring/ongoing fee — rather
 * than the pick's own current one-time selling price. A derived cell is not
 * 1:1 comparable to a single ASIN's buy-box (a "3-Year Cost" or a "price per
 * pound" has no reason to equal the snapshot price) and defaults to excluded
 * (`derived-cost`) instead of scored as drift against a number it was never
 * meant to match. Matches "cost" (3-Year Cost, Ongoing cost after purchase,
 * Filter type and cost) and "per" (price per pound, cost-per-filter) — a bare
 * "Price"/"MSRP"/"Hardware price" label matches neither and is treated as
 * DIRECT, fully comparable to the buy-box.
 */
const DERIVED_LABEL_RE = /\bcost\b|\bper\b/i;

/**
 * A row label naming the subscription itself (e.g. "Subscription",
 * "Subscription model"). Used two ways in analyzeGuideChartCells: (1) a
 * price/cost-shaped row carrying THIS label may legitimately show "$0" for a
 * subscription-free product — a zero there is a real value, not a parse
 * failure; (2) it locates the guide's OWN subscription row so a derived-cost
 * column can be tested for the zero-subscription special case (a derived
 * total with no subscription must collapse to the buy-box).
 */
const SUBSCRIPTION_LABEL_RE = /subscription/i;

/**
 * Revenue-weighted lanes for THIS site, pinned ahead of the general category
 * roll-up so a regression in a money lane is visible immediately rather than
 * buried in a long-tail table. Selected from the live corpus by roster size ×
 * average ticket (measured, not guessed):
 *   - cats-dogs   625 picks, avg $141 — dominant volume
 *   - aquarium    217 picks, avg $158 — canister filters/tanks, high ticket
 *   - playground  139 picks, avg $164 — the highest average ticket on the site
 * Matched against a separator-normalized `category` so the stray singleton
 * spellings ("Dog", "Dogs", "Cat") land in the right lane (port delta 8).
 */
const REVENUE_LANES: Array<{ label: string; test: (haystack: string) => boolean }> = [
  { label: 'cats-dogs', test: (h) => /\bcats?\b|\bdogs?\b/.test(h) },
  { label: 'aquarium', test: (h) => /\baquarium\b|\bfish\b/.test(h) },
  { label: 'playground', test: (h) => /\bplayground\b/.test(h) },
];

/** Lowercases and collapses `-`/`&`/`_`/whitespace so "Cats & Dogs",
 *  "cats-dogs" and "Cats  Dogs" all normalize to the same token stream. */
function normalizeCategory(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-_&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses a price string ("$259.99", "$249-$280", "$1,027.94", "discontinued")
 * into a representative number. Plain ranges resolve to their midpoint (we
 * compare against a single live price, not a sort key). Returns null for
 * anything without a parseable dollar amount.
 *
 * Subscription-style strings ("$0 device + $44.95/month") mix a one-time
 * hardware cost with a recurring fee; naively averaging every `$N` would blend
 * the two into a number that means nothing. Amounts immediately followed by
 * `/mo` or `/month` are treated as recurring and excluded whenever at least one
 * non-recurring amount exists, since the snapshot always prices the hardware
 * ASIN, not a subscription.
 *
 * Used for BOTH sides here, unlike SHE where the snapshot side was already a
 * number — data/amazon-prices.json stores formatted strings (port delta note).
 */
function parsePriceToNumber(price: string | undefined | null): number | null {
  if (!price) return null;
  const re = /\$([\d,]+(?:\.\d+)?)(\s*\/\s*mo(?:nth)?)?/g;
  const oneTime: number[] = [];
  const recurring: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(price))) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    if (m[2]) recurring.push(n);
    else oneTime.push(n);
  }
  const pool = oneTime.length ? oneTime : recurring;
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => a + b, 0) / pool.length;
}

type ExcludeReason =
  | 'unparseable'
  | 'subscription-string'
  | 'zero-editorial'
  | 'no-asin'
  | 'dead-asin-gated'
  | 'no-snapshot'
  | 'unavailable';

interface ExcludedRow {
  id: string;
  category: string;
  reason: ExcludeReason;
  frontmatterPrice?: string;
  snapshotPrice?: string;
  availability?: string | null;
  asin?: string;
  // Carried through even for excluded rows — cross-guide ASIN disagreement is
  // an editorial-hygiene bug independent of price comparability.
  asinDisagreement?: boolean;
}

interface DriftRow {
  id: string;
  guideSlug: string;
  productName: string;
  category: string;
  rank: number;
  asin: string;
  editorialPrice: number;
  snapshotPrice: number;
  deltaPct: number;
  lastChecked: string;
  availability: string;
  asinDisagreement: boolean;
}

/** One frontmatter pick, flattened with the guide context it came from. */
interface RawPick {
  id: string;
  guideSlug: string;
  category: string;
  rank: number;
  name: string;
  price: string;
  asin?: string;
}

function readPicks(): RawPick[] {
  const out: RawPick[] = [];
  for (const file of fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md')).sort()) {
    const slug = file.replace(/\.md$/, '');
    const data = matter(fs.readFileSync(path.join(GUIDES_DIR, file), 'utf-8')).data as Record<
      string,
      unknown
    >;
    const picks = Array.isArray(data.picks) ? (data.picks as Array<Record<string, unknown>>) : [];
    picks.forEach((p, i) => {
      const rank = typeof p.rank === 'number' ? p.rank : i + 1;
      out.push({
        id: `${slug}#rank${rank}`,
        guideSlug: slug,
        category: String(data.category ?? ''),
        rank,
        name: String(p.name ?? ''),
        price: p.price == null ? '' : String(p.price),
        asin: typeof p.asin === 'string' && p.asin ? p.asin : undefined,
      });
    });
  }
  return out;
}

/** One pick, positionally ordered exactly as `picks:` in frontmatter — the
 *  chart-cell pass maps `comparison.rows[].values[i]` to `picks[i]` BY THIS
 *  ORDER, matching the render layer, never by rank or ASIN. Deliberately not
 *  RawPick: that type is flattened cross-guide by readPicks() and loses the
 *  per-guide array position readGuideCharts() needs to preserve. */
export interface ChartPick {
  id: string;
  name: string;
  asin?: string;
}

export interface RawComparisonRow {
  label: string;
  values: unknown[];
}

export interface RawGuideChart {
  slug: string;
  picks: ChartPick[];
  comparisonRows: RawComparisonRow[];
}

/** Reads every guide's `picks:` (position-preserved) and `comparison.rows:`
 *  directly from frontmatter, the same raw-parse-not-getAllGuides() approach
 *  readPicks() uses and for the same reason (port delta 2): the merged/
 *  rendered view would compare the snapshot with itself. Guides with no
 *  comparison rows are skipped — nothing for this pass to check. */
function readGuideCharts(): RawGuideChart[] {
  const out: RawGuideChart[] = [];
  for (const file of fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md')).sort()) {
    const slug = file.replace(/\.md$/, '');
    const data = matter(fs.readFileSync(path.join(GUIDES_DIR, file), 'utf-8')).data as Record<
      string,
      unknown
    >;
    const comparison = data.comparison as { rows?: unknown } | undefined;
    const rawRows = Array.isArray(comparison?.rows) ? (comparison!.rows as Array<Record<string, unknown>>) : [];
    if (rawRows.length === 0) continue;

    const rawPicks = Array.isArray(data.picks) ? (data.picks as Array<Record<string, unknown>>) : [];
    const picks: ChartPick[] = rawPicks.map((p, i) => {
      const rank = typeof p.rank === 'number' ? p.rank : i + 1;
      return {
        id: `${slug}#rank${rank}`,
        name: String(p.name ?? ''),
        asin: typeof p.asin === 'string' && p.asin ? p.asin : undefined,
      };
    });
    const comparisonRows: RawComparisonRow[] = rawRows
      .filter((r) => typeof r.label === 'string')
      .map((r) => ({
        label: r.label as string,
        values: Array.isArray(r.values) ? (r.values as unknown[]) : [],
      }));

    out.push({ slug, picks, comparisonRows });
  }
  return out;
}

export interface ChartCellFinding {
  id: string;
  guideSlug: string;
  rowLabel: string;
  colIndex: number;
  pickId: string;
  productName: string;
  asin: string;
  cellRaw: string;
  cellPrice: number;
  snapshotPrice: number;
  deltaPct: number;
  status: 'exact-match' | 'within-tolerance' | 'drift';
  listPriceCell: boolean;
  derived: boolean;
  lastChecked: string;
}

export type ChartCellExcludeReason = ExcludeReason | 'derived-cost';

export interface ChartCellExcludedRow {
  id: string;
  guideSlug: string;
  rowLabel: string;
  colIndex: number;
  pickId?: string;
  reason: ChartCellExcludeReason;
  cellRaw?: string;
}

export interface ChartColumnMismatch {
  guideSlug: string;
  rowLabel: string;
  valuesLength: number;
  picksLength: number;
}

export interface GuideChartCellResult {
  matchedLabels: string[];
  compared: ChartCellFinding[];
  excluded: ChartCellExcludedRow[];
  columnMismatches: ChartColumnMismatch[];
}

/**
 * Chart-cell pass (W4 #156 H1) for ONE guide. Extracted as a pure function —
 * no filesystem, no process.argv — so the test suite exercises it on
 * fixtures instead of the live corpus (task requirement: don't need the
 * corpus to test this).
 *
 * Column mapping: `row.values[i]` -> `guide.picks[i]` BY INDEX, because that
 * is how the render layer places chart columns beside pick cards — never by
 * rank or ASIN. A row whose values.length disagrees with picks.length cannot
 * be mapped at all; that disagreement is reported as `column-mismatch`, a
 * defect in its own right, rather than guessed at.
 */
export function analyzeGuideChartCells(
  guide: RawGuideChart,
  snapshot: Record<string, SnapshotEntry>
): GuideChartCellResult {
  const matchedLabels: string[] = [];
  const compared: ChartCellFinding[] = [];
  const excluded: ChartCellExcludedRow[] = [];
  const columnMismatches: ChartColumnMismatch[] = [];

  const subscriptionRow = guide.comparisonRows.find((r) => SUBSCRIPTION_LABEL_RE.test(r.label));

  for (const row of guide.comparisonRows) {
    if (!PRICE_LABEL_RE.test(row.label)) continue;
    matchedLabels.push(row.label);

    if (row.values.length !== guide.picks.length) {
      columnMismatches.push({
        guideSlug: guide.slug,
        rowLabel: row.label,
        valuesLength: row.values.length,
        picksLength: guide.picks.length,
      });
      continue;
    }

    const isDerived = DERIVED_LABEL_RE.test(row.label);
    const isSubscriptionLabel = SUBSCRIPTION_LABEL_RE.test(row.label);

    row.values.forEach((rawValue, i) => {
      const pick = guide.picks[i];
      const cellRaw = rawValue == null ? '' : String(rawValue);
      const id = `${guide.slug}::${row.label}#${i}`;
      const base = { id, guideSlug: guide.slug, rowLabel: row.label, colIndex: i, pickId: pick.id };

      const parsed = parsePriceToNumber(cellRaw);
      if (parsed === null) {
        excluded.push({ ...base, reason: 'unparseable', cellRaw });
        return;
      }
      // "None — $0" and similar parse to 0. That is a real value for a
      // subscription-shaped label (a genuine "no plan required" cost); for
      // every other price/cost label a $0 cell is not a price at all —
      // unparseable rather than a fake zero-value drift target.
      if (parsed <= 0 && !isSubscriptionLabel) {
        excluded.push({ ...base, reason: 'unparseable', cellRaw });
        return;
      }
      const cellPrice = parsed;

      if (!pick.asin) {
        excluded.push({ ...base, reason: 'no-asin', cellRaw });
        return;
      }
      const asin = pick.asin;

      const guard = getDeadAsinEntry(asin);
      if (guard && isHardGateStatus(guard.status)) {
        excluded.push({ ...base, reason: 'dead-asin-gated', cellRaw });
        return;
      }

      const entry = snapshot[asin];
      if (!entry) {
        excluded.push({ ...base, reason: 'no-snapshot', cellRaw });
        return;
      }

      const snapshotPrice = parsePriceToNumber(entry.price);
      if (
        snapshotPrice === null ||
        snapshotPrice <= 0 ||
        UNAVAILABLE_STATES.has(String(entry.availability ?? '').toUpperCase())
      ) {
        excluded.push({ ...base, reason: 'unavailable', cellRaw });
        return;
      }

      // Derived figures (3-year cost, per-unit rate, recurring fee, ...) are
      // not 1:1 comparable to a single ASIN's buy-box UNLESS this guide's own
      // Subscription row says this column has no plan — a derived total then
      // collapses to hardware cost and must equal the buy-box. Every other
      // derived cell is excluded and printed for eyeballing, never scored as
      // drift against a number it was never meant to match.
      if (isDerived) {
        const subCellRaw = subscriptionRow?.values?.[i];
        const subCell = subCellRaw == null ? '' : String(subCellRaw);
        const subParsed = parsePriceToNumber(subCell);
        const subIsZero = subParsed === 0 || /^\s*none\b/i.test(subCell);
        if (!subIsZero) {
          excluded.push({ ...base, reason: 'derived-cost', cellRaw });
          return;
        }
      }

      // Guard division-by-zero for the (only reachable via a subscription-
      // labeled $0 cell) cellPrice === 0 edge — fall back to the buy-box as
      // the percentage base rather than producing Infinity/NaN.
      const denom = cellPrice !== 0 ? cellPrice : snapshotPrice;
      const deltaPct = (Math.abs(snapshotPrice - cellPrice) / denom) * 100;

      const listPriceNum = parsePriceToNumber(entry.listPrice ?? null);
      const listPriceCell =
        listPriceNum !== null &&
        Math.abs(listPriceNum - cellPrice) < 0.01 &&
        Math.abs(snapshotPrice - cellPrice) >= 0.01;

      const status: ChartCellFinding['status'] =
        deltaPct < 0.01 ? 'exact-match' : deltaPct <= DRIFT_BANDS[0] ? 'within-tolerance' : 'drift';

      compared.push({
        id,
        guideSlug: guide.slug,
        rowLabel: row.label,
        colIndex: i,
        pickId: pick.id,
        productName: pick.name,
        asin,
        cellRaw,
        cellPrice,
        snapshotPrice,
        deltaPct,
        status,
        listPriceCell,
        derived: isDerived,
        lastChecked: entry.lastChecked,
      });
    });
  }

  return { matchedLabels: [...new Set(matchedLabels)], compared, excluded, columnMismatches };
}

/**
 * The `--strict-charts` exit-code decision, extracted as its own pure
 * function so "a chart-cell DRIFT (or column-mismatch) trips --strict-charts"
 * is unit-testable directly — without spawning the CLI against the live
 * corpus, whose drift count changes as guides get fixed and would make a
 * subprocess-based mutation check flaky by construction.
 */
export function chartCellExitCode(
  strictCharts: boolean,
  chartSummary: { drift: number; columnMismatch: number }
): 0 | 1 {
  return strictCharts && (chartSummary.drift > 0 || chartSummary.columnMismatch > 0) ? 1 : 0;
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const showExcluded = args.includes('--show-excluded');
  const strictCharts = args.includes('--strict-charts');
  const topArg = args.find((a) => a.startsWith('--top='));
  const topN = topArg ? parseInt(topArg.split('=')[1], 10) : 20;

  const snapshot: Record<string, SnapshotEntry> = fs.existsSync(SNAPSHOT_PATH)
    ? (JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8')) as Record<string, SnapshotEntry>)
    : {};
  const picks = readPicks();

  // ── Port delta 4: prove the ASIN-keyed contract instead of assuming it.
  // A non-ASIN key would mean the store can address one product two ways,
  // which is precisely the precondition for SHE's key-conflict class.
  const malformedKeys = Object.keys(snapshot).filter((k) => !ASIN_RE.test(k));

  // ── Port delta 5: cross-guide ASIN disagreement, computed ONCE up front over
  // EVERY pick, BEFORE any comparability gate. Computing this inside the main
  // loop would silently drop the flag for any pick diverted into `excluded` via
  // an early `continue` — the "silent exclusion drops a real signal" failure
  // mode the original guards against.
  const byAsin = new Map<string, RawPick[]>();
  for (const p of picks) {
    if (!p.asin) continue;
    if (!byAsin.has(p.asin)) byAsin.set(p.asin, []);
    byAsin.get(p.asin)!.push(p);
  }
  const disagreeingAsins = new Map<string, RawPick[]>();
  for (const [asin, group] of byAsin) {
    if (group.length < 2) continue;
    // Compare parsed numbers, not raw strings: "$99" and "$99.00" are the same
    // price written two ways and are not an editorial disagreement.
    const distinct = new Set(
      group
        .map((p) => parsePriceToNumber(p.price))
        .filter((n): n is number => n !== null)
        .map((n) => Math.round(n * 100))
    );
    if (distinct.size > 1) disagreeingAsins.set(asin, group);
  }
  const disagreementPickIds = new Set(
    [...disagreeingAsins.values()].flat().map((p) => p.id)
  );

  const rows: DriftRow[] = [];
  const excluded: ExcludedRow[] = [];

  for (const pick of picks) {
    const asinDisagreement = disagreementPickIds.has(pick.id);
    const base = { id: pick.id, category: pick.category, asin: pick.asin, asinDisagreement };

    // Placeholder strings ("Check price") are truthy but not a real price —
    // guides.ts:538 blanks them at render, so treat them as absent here too.
    const editorialRaw = isPlaceholderPrice(pick.price) ? '' : pick.price;
    const editorialPrice = parsePriceToNumber(editorialRaw);

    if (editorialPrice === null) {
      excluded.push({ ...base, reason: 'unparseable', frontmatterPrice: pick.price });
      continue;
    }
    if (editorialPrice <= 0) {
      const reason: ExcludeReason = /\/\s*mo(?:nth)?\b/i.test(editorialRaw)
        ? 'subscription-string'
        : 'zero-editorial';
      excluded.push({ ...base, reason, frontmatterPrice: pick.price });
      continue;
    }

    // Port delta 6: price-cache.ts:55 returns null for an absent ASIN, so the
    // snapshot is never consulted and the frontmatter price is what renders.
    if (!pick.asin) {
      excluded.push({ ...base, reason: 'no-asin', frontmatterPrice: pick.price });
      continue;
    }

    // Port delta 6: §8m hard gate. DEAD / NO-OFFER ASINs are forced unavailable
    // and their CTA replaced regardless of frontmatter (guides.ts:550), so a
    // price delta here is drift against a number no buyer can act on.
    // USED-BUYBOX is deliberately NOT gated — those are purchasable.
    const guard = getDeadAsinEntry(pick.asin);
    if (guard && isHardGateStatus(guard.status)) {
      excluded.push({ ...base, reason: 'dead-asin-gated', frontmatterPrice: pick.price });
      continue;
    }

    const entry = snapshot[pick.asin];
    if (!entry) {
      excluded.push({ ...base, reason: 'no-snapshot', frontmatterPrice: pick.price });
      continue;
    }

    const snapshotPrice = parsePriceToNumber(entry.price);
    // A snapshot entry that is unpriced, non-positive, or flagged unavailable
    // is a delisted/preorder marker, not a comparable live price. Gating on
    // price alone would miss unavailable entries carrying a stale nonzero
    // price — those produce fake drift against a number nobody sees.
    if (
      snapshotPrice === null ||
      snapshotPrice <= 0 ||
      UNAVAILABLE_STATES.has(String(entry.availability ?? '').toUpperCase())
    ) {
      excluded.push({
        ...base,
        reason: 'unavailable',
        frontmatterPrice: pick.price,
        snapshotPrice: entry.price,
        availability: entry.availability,
      });
      continue;
    }

    const deltaPct = (Math.abs(snapshotPrice - editorialPrice) / editorialPrice) * 100;
    rows.push({
      id: pick.id,
      guideSlug: pick.guideSlug,
      productName: pick.name,
      category: pick.category,
      rank: pick.rank,
      asin: pick.asin,
      editorialPrice,
      snapshotPrice,
      deltaPct,
      lastChecked: entry.lastChecked,
      availability: String(entry.availability ?? ''),
      asinDisagreement,
    });
  }

  const compared = rows;
  const excludedByReason = (reason: ExcludeReason) => excluded.filter((e) => e.reason === reason).length;
  const driftBandCounts = DRIFT_BANDS.map((band) => ({
    band,
    count: compared.filter((r) => r.deltaPct > band).length,
  }));

  // Built from `disagreeingAsins` (computed over ALL picks) — NOT filtered from
  // `rows`/`excluded` — so the count is correct regardless of which picks
  // happened to be comparable this run.
  const disagreementReport = [...disagreeingAsins.entries()].map(([asin, group]) => ({
    asin,
    picks: group.map((p) => ({
      id: p.id,
      price: p.price,
      excludedReason: excluded.find((e) => e.id === p.id)?.reason ?? null,
    })),
  }));

  const ranked = [...compared].sort((a, b) => b.deltaPct - a.deltaPct);

  const laneStats = REVENUE_LANES.map((lane) => {
    const laneRows = compared.filter((r) => lane.test(normalizeCategory(r.category)));
    const drifted5 = laneRows.filter((r) => r.deltaPct > 5).length;
    const maxDelta = laneRows.reduce((m, r) => Math.max(m, r.deltaPct), 0);
    return { label: lane.label, compared: laneRows.length, drifted5, maxDelta };
  });

  // Category roll-up keyed on the NORMALIZED category (port delta 8) so the
  // singleton spellings merge into their real lane. Raw spellings are carried
  // along so the report still points at real strings in the files.
  const categoryMap = new Map<
    string,
    { compared: number; drifted5: number; sumDelta: number; maxDelta: number; rawSpellings: Set<string> }
  >();
  for (const r of compared) {
    const key = normalizeCategory(r.category);
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { compared: 0, drifted5: 0, sumDelta: 0, maxDelta: 0, rawSpellings: new Set() });
    }
    const c = categoryMap.get(key)!;
    c.compared++;
    if (r.deltaPct > 5) c.drifted5++;
    c.sumDelta += r.deltaPct;
    c.maxDelta = Math.max(c.maxDelta, r.deltaPct);
    c.rawSpellings.add(r.category);
  }
  const categoryRollup = [...categoryMap.entries()]
    .map(([category, c]) => ({
      category,
      compared: c.compared,
      drifted5: c.drifted5,
      maxDelta: c.maxDelta,
      avgDelta: c.sumDelta / c.compared,
      rawSpellings: [...c.rawSpellings].sort(),
    }))
    .sort((a, b) => b.drifted5 - a.drifted5 || b.avgDelta - a.avgDelta);

  // Per-guide roll-up — the unit a refresh pass actually operates on.
  const guideMap = new Map<string, { compared: number; drifted5: number; maxDelta: number }>();
  for (const r of compared) {
    if (!guideMap.has(r.guideSlug)) guideMap.set(r.guideSlug, { compared: 0, drifted5: 0, maxDelta: 0 });
    const g = guideMap.get(r.guideSlug)!;
    g.compared++;
    if (r.deltaPct > 5) g.drifted5++;
    g.maxDelta = Math.max(g.maxDelta, r.deltaPct);
  }
  const guideRollup = [...guideMap.entries()]
    .map(([slug, g]) => ({ slug, ...g }))
    .sort((a, b) => b.drifted5 - a.drifted5 || b.maxDelta - a.maxDelta);

  const summary = {
    totalPicks: picks.length,
    guides: new Set(picks.map((p) => p.guideSlug)).size,
    snapshotEntries: Object.keys(snapshot).length,
    comparedCount: compared.length,
    unparseableCount: excludedByReason('unparseable'),
    subscriptionStringCount: excludedByReason('subscription-string'),
    zeroEditorialCount: excludedByReason('zero-editorial'),
    noAsinCount: excludedByReason('no-asin'),
    deadAsinGatedCount: excludedByReason('dead-asin-gated'),
    noSnapshotCount: excludedByReason('no-snapshot'),
    unavailableCount: excludedByReason('unavailable'),
    excludedTotal: excluded.length,
    driftBandCounts,
    // Structurally impossible in an ASIN-keyed store — see port delta 4. This
    // is null, not 0: "cannot happen here" and "checked, found none" are
    // different statements and conflating them would be the kind of reassuring
    // fake zero this tool exists to eliminate.
    keyConflictCount: null as null,
    malformedSnapshotKeys: malformedKeys,
    asinDisagreementCount: disagreementReport.length,
  };

  // ── Chart-cell pass (W4 #156 H1) — see analyzeGuideChartCells doc comment.
  const guideCharts = readGuideCharts();
  const chartMatchedLabels = new Set<string>();
  const chartCompared: ChartCellFinding[] = [];
  const chartExcluded: ChartCellExcludedRow[] = [];
  const chartColumnMismatches: ChartColumnMismatch[] = [];
  for (const guide of guideCharts) {
    const result = analyzeGuideChartCells(guide, snapshot);
    result.matchedLabels.forEach((l) => chartMatchedLabels.add(l));
    chartCompared.push(...result.compared);
    chartExcluded.push(...result.excluded);
    chartColumnMismatches.push(...result.columnMismatches);
  }

  const chartGuidesWithPriceRows = new Set([
    ...chartCompared.map((c) => c.guideSlug),
    ...chartExcluded.map((c) => c.guideSlug),
    ...chartColumnMismatches.map((c) => c.guideSlug),
  ]).size;
  const chartDrift = chartCompared.filter((c) => c.status === 'drift');
  const chartListPriceCell = chartCompared.filter((c) => c.listPriceCell);
  const chartDerivedExcluded = chartExcluded.filter((e) => e.reason === 'derived-cost');
  const chartExcludedByReason = (reason: ChartCellExcludeReason) =>
    chartExcluded.filter((e) => e.reason === reason).length;

  const chartSummary = {
    guidesWithPriceRows: chartGuidesWithPriceRows,
    cellsChecked: chartCompared.length + chartExcluded.length,
    compared: chartCompared.length,
    drift: chartDrift.length,
    listPriceCell: chartListPriceCell.length,
    columnMismatch: chartColumnMismatches.length,
    excludedTotal: chartExcluded.length,
    excludedUnparseable: chartExcludedByReason('unparseable'),
    excludedNoAsin: chartExcludedByReason('no-asin'),
    excludedDeadAsinGated: chartExcludedByReason('dead-asin-gated'),
    excludedNoSnapshot: chartExcludedByReason('no-snapshot'),
    excludedUnavailable: chartExcludedByReason('unavailable'),
    excludedDerivedCost: chartExcludedByReason('derived-cost'),
  };

  // --strict-charts: exit 1 on chart-cell DRIFT or column-mismatch. Default
  // behaviour (no flag) is unchanged — report-only, exit 0.
  const exitCode = chartCellExitCode(strictCharts, chartSummary);

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          summary,
          revenueLanes: laneStats,
          categoryRollup,
          guideRollup,
          // The dup-row analogue: one ASIN, two+ editorial prices. Covers ALL
          // picks including ones excluded from price comparison —
          // `excludedReason` is null when the pick is comparable.
          asinDisagreements: disagreementReport,
          // Every excluded pick + reason, per-row — never a silent aggregate.
          excluded,
          top: ranked.slice(0, topN),
          // Chart-cell pass (W4 #156 H1) — comparison.rows price/cost cells.
          chartCells: {
            summary: chartSummary,
            matchedLabels: [...chartMatchedLabels].sort(),
            compared: chartCompared,
            excluded: chartExcluded,
            columnMismatches: chartColumnMismatches,
          },
        },
        null,
        2
      )
    );
    process.exit(exitCode);
  }

  console.log(
    `\nprice-drift-detector (port of SHE #446/#454) — ${summary.totalPicks} frontmatter picks across ` +
      `${summary.guides} guides, ${summary.snapshotEntries} snapshot entries\n`
  );
  console.log(
    `SUMMARY: ${summary.comparedCount} compared, ` +
      `${driftBandCounts[0].count} drifted >5%, ${driftBandCounts[1].count} drifted >15%, ${driftBandCounts[2].count} drifted >25%, ` +
      `${summary.asinDisagreementCount} cross-guide ASIN price disagreements\n` +
      `EXCLUDED: ${summary.excludedTotal} total — ${summary.unparseableCount} unparseable/placeholder price, ` +
      `${summary.subscriptionStringCount} subscription-string, ${summary.zeroEditorialCount} zero-editorial, ` +
      `${summary.noAsinCount} no ASIN (snapshot never consulted — price-cache.ts:55), ` +
      `${summary.deadAsinGatedCount} dead-ASIN hard-gated (§8m), ` +
      `${summary.noSnapshotCount} no snapshot entry, ${summary.unavailableCount} unavailable/preorder` +
      (showExcluded ? '' : ' — pass --show-excluded for the full id list')
  );
  console.log(
    `KEY CONFLICTS: n/a — data/amazon-prices.json is ASIN-keyed, so one ASIN is one key by construction ` +
      `(verified: ${malformedKeys.length} malformed keys${malformedKeys.length ? ' → ' + malformedKeys.join(', ') : ''})`
  );

  console.log(`\n── Revenue-weighted lanes (cats-dogs / aquarium / playground) ──`);
  for (const lane of laneStats) {
    console.log(
      `  ${lane.label.padEnd(12)} compared=${String(lane.compared).padStart(4)}  drifted>5%=${String(lane.drifted5).padStart(3)}  maxDelta=${lane.maxDelta.toFixed(1)}%`
    );
  }

  console.log(`\n── Category roll-up (normalized; sorted by drifted>5% count) ──`);
  for (const c of categoryRollup.slice(0, 15)) {
    const merged = c.rawSpellings.length > 1 ? `  [merged: ${c.rawSpellings.join(' + ')}]` : '';
    console.log(
      `  ${c.category.padEnd(14)} compared=${String(c.compared).padStart(4)}  drifted>5%=${String(c.drifted5).padStart(3)}  avg=${c.avgDelta.toFixed(1)}%  max=${c.maxDelta.toFixed(1)}%${merged}`
    );
  }

  console.log(`\n── Worst guides (sorted by drifted>5% count) — the refresh unit ──`);
  for (const g of guideRollup.slice(0, 15)) {
    console.log(
      `  ${g.slug.padEnd(52)} compared=${String(g.compared).padStart(3)}  drifted>5%=${String(g.drifted5).padStart(3)}  max=${g.maxDelta.toFixed(1)}%`
    );
  }

  if (disagreementReport.length) {
    console.log(
      `\n── Cross-guide ASIN price disagreements (dup-row analogue — one ASIN, two+ editorial ` +
        `prices; covers ALL picks regardless of price-comparison exclusion) ──`
    );
    for (const d of disagreementReport.slice(0, 25)) {
      const parts = d.picks
        .map((p) => `${p.id}=${p.price || '(blank)'}${p.excludedReason ? `[${p.excludedReason}]` : ''}`)
        .join('  vs  ');
      console.log(`  ${d.asin}: ${parts}`);
    }
    if (disagreementReport.length > 25) {
      console.log(`  … ${disagreementReport.length - 25} more — use --json for the full list`);
    }
  }

  if (showExcluded && excluded.length) {
    console.log(`\n── Excluded (${excluded.length} — id + reason, never a silent aggregate) ──`);
    console.log(`  ${'id'.padEnd(56)} ${'reason'.padEnd(18)} disagree detail`);
    for (const e of excluded) {
      const detail =
        e.reason === 'unavailable'
          ? `snapshot=${e.snapshotPrice} availability=${e.availability}`
          : e.frontmatterPrice
          ? `price="${e.frontmatterPrice}"`
          : '';
      console.log(
        `  ${e.id.padEnd(56)} ${e.reason.padEnd(18)} ${(e.asinDisagreement ? 'Y' : '-').padEnd(9)} ${detail}`
      );
    }
  }

  console.log(`\n── Top ${Math.min(topN, ranked.length)} by abs % delta ──`);
  console.log(
    `  ${'pick'.padEnd(56)} ${'editorial'.padStart(10)} ${'snapshot'.padStart(10)} ${'Δ%'.padStart(7)} ${'asin'.padEnd(11)} disagree`
  );
  for (const r of ranked.slice(0, topN)) {
    console.log(
      `  ${r.id.padEnd(56)} ${('$' + r.editorialPrice.toFixed(2)).padStart(10)} ${('$' + r.snapshotPrice.toFixed(2)).padStart(10)} ${r.deltaPct.toFixed(1).padStart(6)}% ${r.asin.padEnd(11)} ${r.asinDisagreement ? 'Y' : '-'}`
    );
  }
  console.log(
    `\n══ Comparison-chart price cells (W4 #156 H1 — chart rows re-read frontmatter, not the live snapshot) ══`
  );
  console.log(
    `CHART LABELS MATCHED (${chartMatchedLabels.size}): ` +
      ([...chartMatchedLabels].sort().join(', ') || '(none)')
  );
  console.log(
    `CHART SUMMARY: ${chartSummary.guidesWithPriceRows} guides with price/cost-shaped chart rows, ` +
      `${chartSummary.cellsChecked} cells checked (${chartSummary.compared} compared), ` +
      `${chartSummary.drift} drift, ${chartSummary.listPriceCell} list-price-cell, ` +
      `${chartSummary.columnMismatch} column-mismatch`
  );
  console.log(
    `CHART EXCLUDED: ${chartSummary.excludedTotal} total — ${chartSummary.excludedUnparseable} unparseable, ` +
      `${chartSummary.excludedNoAsin} no-asin, ${chartSummary.excludedDeadAsinGated} dead-asin-gated, ` +
      `${chartSummary.excludedNoSnapshot} no-snapshot, ${chartSummary.excludedUnavailable} unavailable, ` +
      `${chartSummary.excludedDerivedCost} derived-cost` +
      (showExcluded ? '' : ' — pass --show-excluded for the full chart-cell id list')
  );

  if (chartColumnMismatches.length) {
    console.log(
      `\n── Chart column-mismatch (values.length !== picks.length — cannot map columns to picks; a defect on its own) ──`
    );
    for (const m of chartColumnMismatches) {
      console.log(`  ${m.guideSlug.padEnd(52)} "${m.rowLabel}" values=${m.valuesLength} picks=${m.picksLength}`);
    }
  }

  console.log(
    chartDrift.length
      ? `\n── Chart-cell DRIFT (${chartDrift.length} — frozen literal vs current buy-box) ──`
      : `\n── Chart-cell DRIFT: none ──`
  );
  for (const c of chartDrift) {
    console.log(
      `  ${c.id.padEnd(70)} cell=$${c.cellPrice.toFixed(2)} buybox=$${c.snapshotPrice.toFixed(2)} ` +
        `Δ=${c.deltaPct.toFixed(1)}%${c.listPriceCell ? '  [list-price-cell]' : ''}${c.derived ? '  [derived]' : ''}`
    );
  }

  if (chartListPriceCell.length) {
    console.log(
      `\n── Chart cells equal to LIST price, not buy-box (${chartListPriceCell.length} — 2026-09-02 ruling: compare on buy-box) ──`
    );
    for (const c of chartListPriceCell) {
      console.log(`  ${c.id.padEnd(70)} cell=$${c.cellPrice.toFixed(2)} buybox=$${c.snapshotPrice.toFixed(2)}`);
    }
  }

  if (chartDerivedExcluded.length) {
    console.log(
      `\n── Derived-cost chart rows (${chartDerivedExcluded.length} — excluded from comparison, printed for eyeballing) ──`
    );
    for (const e of chartDerivedExcluded.slice(0, 40)) {
      console.log(`  ${e.id.padEnd(70)} cell="${e.cellRaw}"`);
    }
    if (chartDerivedExcluded.length > 40) {
      console.log(`  … ${chartDerivedExcluded.length - 40} more — use --json for the full list`);
    }
  }

  if (showExcluded && chartExcluded.length) {
    console.log(`\n── Chart cells excluded (${chartExcluded.length} — id + reason, never a silent aggregate) ──`);
    for (const e of chartExcluded) {
      console.log(`  ${e.id.padEnd(70)} ${e.reason.padEnd(16)} ${e.cellRaw ? `cell="${e.cellRaw}"` : ''}`);
    }
  }

  console.log('');
  process.exit(exitCode);
}

// Guarded entrypoint: analyzeGuideChartCells (and the types around it) is
// exported for scripts/test/price-drift-chart-cells.test.ts to import as a
// pure function. Without this guard, importing this module for that export
// would also run main() — real filesystem reads, argv parsing off the test
// runner's own argv, and a process.exit() that would kill the test process.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
