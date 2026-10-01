/**
 * COMPARISON CHARTS CARRY NO PRICES; A KEYED ROW'S NAME COMES FROM THE PICK
 * (owner decision 2026-09-30, superseding the 2026-09-29 plan to fill chart
 * prices from the cards).
 *
 * Owner, verbatim: "why are we putting prices in the comparison charts again?
 * I thought those were for comparing other metrics associated with the product
 * quality and longevity and general use" → "Drop prices from all charts".
 * Prices live only on the product cards, with their dated "checked" stamps.
 * A comparison chart compares quality, longevity and general use — never price.
 *
 * FRONTMATTER SHAPE ("headers" table — one row per product):
 *
 *   comparison:
 *     headers: ["Product", "Pick category", "Score"]
 *     nameColumn: 0             # optional; default = 0 (the first column)
 *     rows:
 *       - pickRef: r1           # keyed row: names picks[rank 1]
 *         cells: ["Fluval Plant 3.0", "PAR-test winner", "8.8"]
 *       - pickRef: none         # unkeyed row (checklist/step row, not a pick)
 *         cells: ["Water conditioner", "Dechlorinates tap water", ""]
 *
 * BLOCKING rules for a headers table (each fails the build):
 *   - NO PRICE COLUMN: a header matching PRICE_HEADER (/price|cost/i) fails.
 *     `priceColumn` is retired; a table that still sets it fails.
 *   - NO MONEY FIGURE ANYWHERE: a DOLLAR_FIGURE ("$120", "$  120", "$.99",
 *     fullwidth "＄120", "US$120", "USD 120", "120 USD", "120 dollars") in any
 *     header or any cell of any row (keyed or unkeyed, name column included)
 *     fails. The rendered name of a keyed row is checked too.
 *   - `pickRef` uses the same convention as `topPicks[].pickRef`: "r<rank>" or
 *     "none". A keyed row's name cell (`nameColumn`) renders the card's
 *     product name (`pick.name`); whatever is typed there is ignored, so a rank
 *     swap can never put one product's name on another product's row.
 *   - A keyed row whose pick is declared in the guide's frontmatter but is not
 *     on the rendered roster (suppressed / dark / dropped) keeps the name typed
 *     in the frontmatter — a routine dead-ASIN change never breaks the build.
 *     A pickRef naming a rank the frontmatter never declared fails.
 *   - Once any row uses the headers shape (has `pickRef` — any spelling — or
 *     `cells`), EVERY row must: a row with no `pickRef` key (misspelled key,
 *     label/values row, legacy array row), a pickRef value that is neither
 *     "r<rank>" nor "none", and a second row for the same pick all fail.
 *
 * LEGACY array rows (`- ["Product", "$69.99", ...]`) carry no pick key. They
 * stay DROPPED — a table made only of them renders nothing, as before — and a
 * table that mixes them with keyed rows is an authoring error.
 *
 * LABEL-SHAPED tables (`rows: [{ label, values }]`) are not parsed here and
 * render exactly as before. 108 of them still carry price rows / money
 * figures until their cleanup PRs merge, so they are NOT blocked yet:
 * labelChartPriceFindings() feeds a WARN-ONLY report
 * (scripts/report-label-chart-prices.ts). FLIP TO BLOCKING once the label-chart
 * price cleanup PRs land.
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
  /** Keyed rows render `pick.name` here (default 0). */
  nameColumn: number;
  rows: ComparisonTableSpecRow[];
}

export interface ResolvedComparisonTableRow {
  /** Set on keyed rows only. */
  pickRank?: number;
  /** Keyed rows: the name cell is the card's `pick.name`. */
  cells: string[];
}

export interface ResolvedComparisonTable {
  headers: string[];
  nameColumn: number;
  rows: ResolvedComparisonTableRow[];
}

/** The fields of a resolved GuidePick this module reads (structural). */
export interface ComparisonTablePick {
  rank: number;
  /** The card's product name. */
  name: string;
}

/**
 * A money figure: "$69", "$ 69.99", "$  120", "$.99", "$1,299", fullwidth
 * "＄120", "US$120", "USD 120", "USD120", "120 USD", "120 dollars".
 */
export const DOLLAR_FIGURE = /[$\uFF04]\s*\.?\d|\bUSD\s*\.?\d|\d\s*(?:USD|dollars?)\b/i;

/** A header (or label-row label) that names a price column/row. */
export const PRICE_HEADER = /price|cost/i;

const str = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';

/**
 * Parses the headers-table form of `comparison`. Returns no spec (and no
 * errors) when there is nothing keyed to render — including every legacy
 * array-row table and every label-shaped table.
 */
export function parseComparisonTable(value: unknown): { spec?: ComparisonTableSpec; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') return { errors };
  const v = value as { headers?: unknown; rows?: unknown; priceColumn?: unknown; nameColumn?: unknown };
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

  if (v.priceColumn !== undefined) {
    errors.push(
      'comparison.priceColumn is retired — comparison charts carry no prices (owner 2026-09-30); prices live only on the cards',
    );
  }

  let nameColumn = 0;
  if (v.nameColumn !== undefined) {
    nameColumn = typeof v.nameColumn === 'number' ? v.nameColumn : -2;
    if (!Number.isInteger(nameColumn) || nameColumn < 0 || nameColumn >= headers.length) {
      errors.push(`comparison.nameColumn ${JSON.stringify(v.nameColumn)} is not a header index (0..${headers.length - 1})`);
      nameColumn = 0;
    }
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

  return { spec: { headers, nameColumn, rows }, errors };
}

/**
 * Fills each keyed row's name cell from its pick's card and enforces the
 * no-prices rule. `picks` must be the guide's rendered roster (the same
 * objects the cards render). `declaredRanks` are the ranks the guide's
 * frontmatter declares (rendered or not); defaults to the ranks in `picks`.
 * A row whose rank is declared but not rendered keeps its typed name; a rank
 * never declared is an error.
 */
export function resolveComparisonTable(
  spec: ComparisonTableSpec,
  picks: ComparisonTablePick[],
  declaredRanks: number[] = picks.map((p) => p.rank),
): { table?: ResolvedComparisonTable; errors: string[] } {
  const errors: string[] = [];
  const byRank = new Map(picks.map((p) => [p.rank, p]));
  const declared = new Set([...declaredRanks, ...picks.map((p) => p.rank)]);
  const { nameColumn } = spec;
  const NO_PRICES = 'comparison charts carry no prices (owner 2026-09-30); prices live only on the cards';

  // No price column, and no money figure in any header.
  spec.headers.forEach((h, col) => {
    if (PRICE_HEADER.test(h)) {
      errors.push(`comparison.headers[${col}] ${JSON.stringify(h)} is a price/cost column — ${NO_PRICES}`);
    } else if (DOLLAR_FIGURE.test(h)) {
      errors.push(`comparison.headers[${col}] ${JSON.stringify(h)} has a money figure — ${NO_PRICES}`);
    }
  });
  // No money figure in any typed cell of any row, name column included.
  spec.rows.forEach((row, i) => {
    row.cells.forEach((c, col) => {
      if (!DOLLAR_FIGURE.test(c)) return;
      errors.push(
        `comparison.rows[${i}] (pickRef ${row.pickRank === undefined ? 'none' : `r${row.pickRank}`}) column ${col} (${JSON.stringify(spec.headers[col] ?? '')}) has a money figure ${JSON.stringify(c)} — ${NO_PRICES}`,
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
    if (pick) {
      // Name from the pick: typed text here is ignored.
      while (cells.length <= nameColumn) cells.push('');
      cells[nameColumn] = pick.name;
      if (DOLLAR_FIGURE.test(pick.name)) {
        errors.push(`comparison.rows[${i}] pickRef r${row.pickRank} card name ${JSON.stringify(pick.name)} has a money figure — ${NO_PRICES}`);
      }
    }
    return { pickRank: row.pickRank, cells };
  });

  return rows.length ? { table: { headers: spec.headers, nameColumn, rows }, errors } : { errors };
}

/**
 * WARN-ONLY (not blocking yet): price rows and money figures in a LABEL-SHAPED
 * chart (`rows: [{ label, values }]`). Returns one finding per offending row;
 * [] for any other shape. FLIP TO BLOCKING once the label-chart price cleanup
 * PRs have merged (108 guides at 2026-09-30).
 */
export function labelChartPriceFindings(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const v = value as { headers?: unknown; rows?: unknown };
  if (!Array.isArray(v.rows)) return [];
  const isLabelRow = (r: unknown): r is Record<string, unknown> =>
    !!r && typeof r === 'object' && !Array.isArray(r) && 'label' in r;
  if (!v.rows.length || !v.rows.every(isLabelRow)) return [];
  const findings: string[] = [];
  if (Array.isArray(v.headers)) {
    v.headers.map(str).forEach((h, col) => {
      if (PRICE_HEADER.test(h) || DOLLAR_FIGURE.test(h)) findings.push(`headers[${col}] ${JSON.stringify(h)}`);
    });
  }
  v.rows.forEach((r, i) => {
    const label = str((r as Record<string, unknown>).label);
    const values = Array.isArray((r as Record<string, unknown>).values)
      ? ((r as Record<string, unknown>).values as unknown[]).map(str)
      : [];
    const money = values.filter((x) => DOLLAR_FIGURE.test(x));
    if (PRICE_HEADER.test(label) || DOLLAR_FIGURE.test(label) || money.length) {
      findings.push(
        `rows[${i}] ${JSON.stringify(label)}${money.length ? ` (${money.length} money figure${money.length > 1 ? 's' : ''})` : ''}`,
      );
    }
  });
  return findings;
}
