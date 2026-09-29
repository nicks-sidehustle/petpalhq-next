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
 *   - A keyed row whose pick is declared in the guide's frontmatter but is not
 *     on the rendered roster (suppressed / dark / dropped) renders "–" in the
 *     price cell, like a dark card — a routine dead-ASIN or price-sync change
 *     never breaks the build. A pickRef naming a rank the frontmatter never
 *     declared is an authoring error and fails the build.
 *   - No `$` figure may appear in ANY cell other than a keyed row's price
 *     cell (which is overwritten from the card): not in an unkeyed row, not in
 *     a non-price column of a keyed row (e.g. "Cost/yr $120"). Only
 *     card-sourced figures may appear in a headers table.
 *   - Once any row uses the headers shape (has `pickRef` — any spelling — or
 *     `cells`), EVERY row must: a row with no `pickRef` key (misspelled key,
 *     label/values row, legacy array row), a pickRef value that is neither
 *     "r<rank>" nor "none", and a second row for the same pick all fail the
 *     build instead of being dropped silently.
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
  if (!Array.isArray(v.rows)) return { errors };

  // A row "uses the headers shape" if it is an object carrying `cells` or any
  // spelling of pickRef (pickref, pick_ref, PickRef...). Label-shaped tables
  // ({label, values} rows only, with or without `headers`) never match.
  const isObj = (r: unknown): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r);
  const headersShaped = (r: Record<string, unknown>) =>
    'cells' in r || Object.keys(r).some((k) => /^pick_?ref$/i.test(k));
  if (!v.rows.some((r) => isObj(r) && headersShaped(r))) return { errors };
  if (!Array.isArray(v.headers)) {
    return { errors: ['comparison has pickRef/cells rows but no headers array'] };
  }

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
  const seenRanks = new Map<number, number>();
  v.rows.forEach((r, i) => {
    if (Array.isArray(r)) return; // counted above
    if (!isObj(r)) {
      errors.push(`comparison.rows[${i}] is not a row object — every row needs a pickRef ("r<rank>" or "none") and cells`);
      return;
    }
    if (!('pickRef' in r)) {
      const near = Object.keys(r).find((k) => /^pick_?ref$/i.test(k));
      errors.push(
        near
          ? `comparison.rows[${i}] spells the key ${JSON.stringify(near)} — it must be "pickRef"`
          : 'label' in r || 'values' in r
            ? `comparison.rows[${i}] is a label/values row inside a headers table — every row needs a pickRef ("r<rank>" or "none") and cells`
            : `comparison.rows[${i}] has no pickRef — every row needs a pickRef ("r<rank>" or "none")`,
      );
      return;
    }
    const ref = str(r.pickRef).trim();
    const cells = Array.isArray(r.cells) ? r.cells.map(str) : [];
    if (!Array.isArray(r.cells)) errors.push(`comparison.rows[${i}] (pickRef ${ref}) has no cells array`);
    const m = /^r([1-9]\d*)$/.exec(ref);
    if (m) {
      const rank = Number(m[1]);
      const first = seenRanks.get(rank);
      if (first !== undefined) {
        errors.push(`comparison.rows[${i}] repeats pickRef r${rank} (already on rows[${first}]) — one row per pick`);
        return;
      }
      seenRanks.set(rank, i);
      rows.push({ pickRank: rank, cells });
    } else if (ref === 'none') {
      rows.push({ cells });
    } else {
      errors.push(`comparison.rows[${i}] pickRef ${JSON.stringify(r.pickRef)} is neither "r<rank>" nor "none"`);
    }
  });

  return { spec: { headers, priceColumn, rows }, errors };
}

/**
 * Fills each keyed row's price cell from its pick's card. `picks` must be the
 * guide's rendered roster (the same objects the cards render). `declaredRanks`
 * are the ranks the guide's frontmatter declares (rendered or not); defaults
 * to the ranks in `picks`. A row whose rank is declared but not rendered
 * (suppressed / dark / dropped) prints "–" like a dark card; a rank never
 * declared is an error.
 */
export function resolveComparisonTable(
  spec: ComparisonTableSpec,
  picks: ComparisonTablePick[],
  declaredRanks: number[] = picks.map((p) => p.rank),
): { table?: ResolvedComparisonTable; errors: string[] } {
  const errors: string[] = [];
  const byRank = new Map(picks.map((p) => [p.rank, p]));
  const declared = new Set([...declaredRanks, ...picks.map((p) => p.rank)]);
  const { priceColumn } = spec;

  // Only card-sourced figures may appear: a `$` anywhere except a keyed row's
  // price cell (which is overwritten from the card below) fails.
  spec.rows.forEach((row, i) => {
    row.cells.forEach((c, col) => {
      if (row.pickRank !== undefined && col === priceColumn) return;
      if (!DOLLAR_FIGURE.test(c)) return;
      const where =
        priceColumn < 0
          ? 'but the table has no price column — set priceColumn'
          : col === priceColumn
            ? 'in the price column of an unkeyed row — only a pick\'s card may supply a price'
            : `in non-price column ${col} (${JSON.stringify(spec.headers[col] ?? '')}) — only the card-sourced price column may carry a figure`;
      errors.push(
        `comparison.rows[${i}] (pickRef ${row.pickRank === undefined ? 'none' : `r${row.pickRank}`}) has a hand-typed figure ${JSON.stringify(c)} ${where}`,
      );
    });
  });

  const rows: ResolvedComparisonTableRow[] = spec.rows.map((row, i) => {
    if (row.pickRank === undefined) return { cells: row.cells };
    const pick = byRank.get(row.pickRank);
    if (!pick && !declared.has(row.pickRank)) {
      errors.push(`comparison.rows[${i}] pickRef r${row.pickRank} names no pick declared in this guide`);
    }
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

  return rows.length ? { table: { headers: spec.headers, priceColumn, rows }, errors } : { errors };
}
