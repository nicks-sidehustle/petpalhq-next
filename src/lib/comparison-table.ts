/**
 * COMPARISON-TABLE PRICES COME FROM THE CARDS (owner decision 2026-09-29).
 *
 * A comparison table may never disagree with its card, so a table's price
 * column is never read from frontmatter. It is resolved here, per row, from the
 * pick the row names — the same `price` / `priceStamp` parsePicks() computed for
 * that pick's card (live-read override, newest-read rule, dark/no-figure
 * handling all included). A dark pick, or one with no dated figure, prints no
 * figure in the table, exactly as its card prints none.
 *
 * FRONTMATTER SHAPE ("headers" table — one row per product):
 *
 *   comparison:
 *     headers: ["Product", "Price", "Pick category", "Score"]
 *     priceColumn: 1            # optional; default = first header matching /price/i
 *     rows:
 *       - pickRef: r1           # keyed row: names picks[rank 1]
 *         cells: ["Fluval Plant 3.0", "", "PAR-test winner", "8.8"]
 *       - pickRef: none         # unkeyed row (checklist/step row, not a pick)
 *         cells: ["Water conditioner", "", "Dechlorinates tap water", ""]
 *
 *   - `pickRef` uses the same convention as `topPicks[].pickRef`: "r<rank>" or
 *     "none".
 *   - Keyed rows: whatever is typed in the price cell is IGNORED; the cell
 *     renders the card's figure + its dated "checked" stamp, or "–" when the
 *     card shows no figure.
 *   - Unkeyed rows render their cells verbatim but may NOT carry a `$` figure
 *     in the price column (a hand-typed figure no card backs).
 *   - A table with no identifiable price column may carry no `$` figure at all.
 *
 * LEGACY array rows (`- ["Product", "$69.99", ...]`) carry no pick key, so
 * their prices are unaudited. They stay DROPPED — a table made only of them
 * renders nothing, as before — and a table that mixes them with keyed rows is
 * an authoring error (a half-migrated table would silently lose rows).
 *
 * Label-shaped tables (`rows: [{ label, values }]`) are not handled here and
 * render exactly as before.
 *
 * Self-contained (no imports) so the mutation test can copy this file out and
 * rewrite it.
 */

export interface ComparisonTableSpecRow {
  /** "r<rank>" for a keyed row; undefined for `pickRef: none`. */
  pickRank?: number;
  cells: string[];
}

export interface ComparisonTableSpec {
  headers: string[];
  /** -1 when the table has no price column. */
  priceColumn: number;
  rows: ComparisonTableSpecRow[];
}

export interface ComparisonTablePriceCell {
  figure: string;
  stamp: string;
  basis?: string;
  checkedAt?: string;
}

export interface ResolvedComparisonTableRow {
  /** Set on keyed rows only. */
  pickRank?: number;
  /** Keyed rows: the price cell is '' (the figure lives in `price`). */
  cells: string[];
  /** Keyed rows only: the card's figure + stamp, or null when the card shows none. */
  price?: ComparisonTablePriceCell | null;
}

export interface ResolvedComparisonTable {
  headers: string[];
  priceColumn: number;
  rows: ResolvedComparisonTableRow[];
}

/** The fields of a resolved GuidePick this module reads (structural). */
export interface ComparisonTablePick {
  rank: number;
  price: string;
  priceStamp?: string;
  priceBasis?: string;
  priceCheckedAt?: string;
}

/** A hand-typed dollar figure: "$69", "$ 69.99", "$1,299". */
export const DOLLAR_FIGURE = /\$\s?\d/;

const str = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';

/**
 * Parses the headers-table form of `comparison`. Returns no spec (and no
 * errors) when there is nothing keyed to render — including every legacy
 * array-row table — so those keep rendering nothing.
 */
export function parseComparisonTable(value: unknown): { spec?: ComparisonTableSpec; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') return { errors };
  const v = value as { headers?: unknown; rows?: unknown; priceColumn?: unknown };
  if (!Array.isArray(v.headers) || !Array.isArray(v.rows)) return { errors };

  const keyedish = v.rows.filter(
    (r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r) && 'pickRef' in r,
  );
  if (!keyedish.length) return { errors };

  const headers = v.headers.map(str);
  const arrayRows = v.rows.filter((r) => Array.isArray(r)).length;
  if (arrayRows) {
    errors.push(
      `comparison mixes ${arrayRows} unkeyed array row(s) with pickRef rows — every row needs a pickRef ("r<rank>" or "none")`,
    );
  }

  let priceColumn: number;
  if (v.priceColumn !== undefined) {
    priceColumn = typeof v.priceColumn === 'number' ? v.priceColumn : -2;
    if (!Number.isInteger(priceColumn) || priceColumn < 0 || priceColumn >= headers.length) {
      errors.push(`comparison.priceColumn ${JSON.stringify(v.priceColumn)} is not a header index (0..${headers.length - 1})`);
      priceColumn = -1;
    }
  } else {
    priceColumn = headers.findIndex((h) => /\bprice\b/i.test(h));
  }

  const rows: ComparisonTableSpecRow[] = [];
  keyedish.forEach((r, i) => {
    const ref = str(r.pickRef).trim();
    const cells = Array.isArray(r.cells) ? r.cells.map(str) : [];
    if (!Array.isArray(r.cells)) errors.push(`comparison.rows[${i}] (pickRef ${ref}) has no cells array`);
    const m = /^r(\d+)$/.exec(ref);
    if (m) {
      rows.push({ pickRank: Number(m[1]), cells });
    } else if (ref === 'none') {
      rows.push({ cells });
    } else {
      errors.push(`comparison.rows[${i}] pickRef ${JSON.stringify(ref)} is neither "r<rank>" nor "none"`);
    }
  });

  return { spec: { headers, priceColumn, rows }, errors };
}

/**
 * Fills each keyed row's price cell from its pick's card. `picks` must be the
 * guide's resolved roster (the same objects the cards render).
 */
export function resolveComparisonTable(
  spec: ComparisonTableSpec,
  picks: ComparisonTablePick[],
): { table?: ResolvedComparisonTable; errors: string[] } {
  const errors: string[] = [];
  const byRank = new Map(picks.map((p) => [p.rank, p]));
  const { priceColumn } = spec;

  const rows: ResolvedComparisonTableRow[] = spec.rows.map((row, i) => {
    if (row.pickRank === undefined) {
      if (priceColumn >= 0 && DOLLAR_FIGURE.test(row.cells[priceColumn] ?? '')) {
        errors.push(
          `comparison.rows[${i}] (pickRef none) has a hand-typed figure ${JSON.stringify(row.cells[priceColumn])} in the price column — only a pick's card may supply a price`,
        );
      }
      return { cells: row.cells };
    }
    const pick = byRank.get(row.pickRank);
    if (!pick) errors.push(`comparison.rows[${i}] pickRef r${row.pickRank} names no pick on this page`);
    const cells = row.cells.slice();
    if (priceColumn >= 0) {
      while (cells.length <= priceColumn) cells.push('');
      cells[priceColumn] = '';
    }
    const price: ComparisonTablePriceCell | null =
      pick && pick.price && pick.priceStamp
        ? {
            figure: pick.price,
            stamp: pick.priceStamp,
            basis: pick.priceBasis,
            checkedAt: pick.priceCheckedAt,
          }
        : null;
    return { pickRank: row.pickRank, cells, price };
  });

  if (priceColumn < 0) {
    spec.rows.forEach((row, i) => {
      const bad = row.cells.find((c) => DOLLAR_FIGURE.test(c));
      if (bad) {
        errors.push(
          `comparison.rows[${i}] has a hand-typed figure ${JSON.stringify(bad)} but the table has no price column — set priceColumn`,
        );
      }
    });
  }

  return rows.length ? { table: { headers: spec.headers, priceColumn, rows }, errors } : { errors };
}
