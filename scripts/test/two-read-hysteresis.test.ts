/**
 * TWO-READ HYSTERESIS — #649 class (2026-09-07).
 *
 * WHAT THIS PINS. `applyFetchResults()` (scripts/sync-amazon-prices.ts) used to
 * accept ANY single read outright whenever that read carried a price. Issue #91
 * hardened the no-price shapes (a throw, or a 200 with empty item data) but not
 * the shape that actually did the damage in #649: a well-formed 200 carrying a
 * price and an availability of OUT_OF_STOCK / UNAVAILABLE / third-party
 * AVAILABLE_DATE, for a listing still perfectly buyable on the live page. One
 * such read removed the buy path from every guide citing the ASIN. It
 * false-suppressed 11 petpal picks (restored in #144), and today's session-start
 * sync produced 18 buyable -> unbuyable flips from single reads.
 *
 * The rule now: a buyable -> unbuyable flip is HELD on the first contradicting
 * read and applied only when a second read >= 12h later still says unbuyable.
 * Unbuyable -> buyable still applies on the first read (positive evidence).
 *
 * SIX CASES, one per branch the hold logic can take:
 *   (a) prior buyable + fresh unbuyable, no marker      -> HELD, marker set
 *   (b) prior buyable + fresh unbuyable, marker 13h old  -> flip APPLIED, marker gone
 *   (c) prior buyable + fresh unbuyable, marker  2h old  -> still HELD, marker unmoved
 *   (d) prior unbuyable + fresh buyable                  -> applies immediately
 *   (e) prior buyable + fresh buyable, stale marker      -> marker cleared, price updated
 *   (f) no prior entry + fresh unbuyable                 -> legacy behavior, applied
 *
 * (a) and (c) are the guard. (b), (d), (e) and (f) are the RELEASE cases — a
 * hold that never releases is not hysteresis, it is a freeze, and it would rot
 * the snapshot into permanent optimism. Both directions are asserted here
 * because a guard proven only to hold is half a guard.
 *
 * W4 FIX CYCLE 1 (2026-09-07) adds the cases the verifier found unpinned:
 *   (g) prior DISCLOSABLE BACKORDER + fresh unbuyable    -> applied, NOT held (M1)
 *   (h) the exact 12h boundary: 11h59m held, 12h00m applied
 *   (i) malformed marker  -> re-seeded to this run, not held forever (m1)
 *   (j) future-dated marker -> clamped to this run (m2)
 *   (k) malformed runAt   -> THROWS rather than silently disabling release (m3)
 *   (l) 7-day hard ceiling on MARKER AGE — the only clock (M2.iii)
 *   (m) marker dropped because the prior row is no longer plainly buyable is
 *       COUNTED as cleared, not dropped silently (m4)
 *   (n) held row -> next read errors: the marker survives the #91 retain path (m5)
 *   (o) accounting: succeeded counts only rows WRITTEN; every result lands in
 *       exactly one of {succeeded, held, retained, dropped} (m4)
 *
 * W4 FIX CYCLE 2 adds the regression guard for the limb that was removed:
 *   (p) corpus-shape replay — a plainly-buyable row with a 30-day-old
 *       `lastChecked` and NO marker is HELD at every runAt, never applied. Data
 *       age measures our merge cadence, not the listing, so it must not release
 *       anything. Without this, one late dispatch suppressed 901 of the 1,039
 *       committed rows on a single read.
 *   (q) the same row with an 8-day-old MARKER is applied — a hold that is
 *       actually running is still bounded.
 *
 * Run: npx tsx scripts/test/two-read-hysteresis.test.ts
 * (wired into `npm run validate:content` and `npm run test:two-read-hysteresis`)
 */
import {
  applyFetchResults,
  PENDING_UNBUYABLE_HOLD_MS,
  PENDING_UNBUYABLE_MAX_HOLD_MS,
  type FetchOutcome,
  type PriceCache,
} from '../sync-amazon-prices';
import { isDisclosableBackorder, isSnapshotUnbuyable } from '../../src/lib/price-cache';

let failures = 0;
function check(label: string, ok: boolean, extra = '') {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}${extra ? `\n         ${extra}` : ''}`);
  }
}

const RUN_AT = '2026-09-07T12:00:00.000Z';
const runMs = Date.parse(RUN_AT);
const iso = (msAgo: number) => new Date(runMs - msAgo).toISOString();
const HOURS = 60 * 60 * 1000;

/** A confirmed-buyable prior row (IN_STOCK, priced, Amazon-sold). */
function buyablePrior(overrides: Partial<PriceCache[string]> = {}): PriceCache[string] {
  return {
    price: '$49.99',
    lastChecked: '2026-09-05T00:00:00.000Z', // 2d before RUN_AT — clearly inside the 7d ceiling
    availability: 'IN_STOCK',
    merchantId: 'ATVPDKIKX0DER',
    merchantName: 'Amazon.com',
    listPrice: '$59.99',
    listPriceBasis: 'LIST_PRICE',
    savingsPercent: 17,
    ...overrides,
  };
}

/** A fetch outcome. `availability` decides buyability via isSnapshotUnbuyable. */
function read(asin: string, price: string, availability: string, merchantId: string | null = 'ATVPDKIKX0DER'): FetchOutcome {
  return {
    asin,
    ok: true,
    result: {
      asin,
      price,
      currency: 'USD',
      availability,
      merchantId,
      merchantName: merchantId ? 'Amazon.com' : null,
      lastChecked: RUN_AT,
      listPrice: null,
      listPriceBasis: null,
      savingsPercent: null,
    },
  };
}

/** Runs `fn` with console.warn captured, so a branch can be pinned by the
 *  REASON it reports and not just by its outcome. */
function captureWarn<T>(fn: () => T): { value: T; warnings: string[] } {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((a) => String(a)).join(' '));
  };
  try {
    return { value: fn(), warnings };
  } finally {
    console.warn = original;
  }
}

console.log(
  `hold window: ${PENDING_UNBUYABLE_HOLD_MS / HOURS}h | hard ceiling: ${PENDING_UNBUYABLE_MAX_HOLD_MS / HOURS}h\n`,
);

// --- (a) prior buyable + fresh unbuyable, no marker -> HELD ------------------
{
  const prev: PriceCache = { B0HOLDA001: buyablePrior() };
  const { output, held, confirmedUnbuyable, cleared } = applyFetchResults(
    prev,
    [read('B0HOLDA001', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  const row = output.B0HOLDA001!;
  check('(a) counted as held', held === 1 && confirmedUnbuyable === 0 && cleared === 0, `held=${held}`);
  check('(a) row is still BUYABLE to the gate', !isSnapshotUnbuyable(row), `availability=${row.availability}`);
  check('(a) prior availability retained', row.availability === 'IN_STOCK');
  check('(a) prior price retained (not the contradicted read)', row.price === '$49.99');
  check('(a) prior lastChecked retained — no false freshness', row.lastChecked === '2026-09-05T00:00:00.000Z');
  check('(a) marker set to this run', row.pendingUnbuyableSince === RUN_AT);
  check('(a) lastReadAt records the read that was held', row.lastReadAt === RUN_AT);
}

// --- (b) marker 13h old, fresh still unbuyable -> flip APPLIED ---------------
{
  const prev: PriceCache = { B0HOLDB002: buyablePrior({ pendingUnbuyableSince: iso(13 * HOURS), lastReadAt: iso(13 * HOURS) }) };
  const { output, held, confirmedUnbuyable } = applyFetchResults(
    prev,
    [read('B0HOLDB002', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  const row = output.B0HOLDB002!;
  check('(b) counted as confirmed unbuyable', confirmedUnbuyable === 1 && held === 0, `held=${held} confirmed=${confirmedUnbuyable}`);
  check('(b) flip APPLIED — row is now unbuyable', isSnapshotUnbuyable(row), `availability=${row.availability}`);
  check('(b) fresh availability written', row.availability === 'OUT_OF_STOCK');
  check('(b) fresh price written', row.price === '$41.10');
  check('(b) fresh lastChecked written', row.lastChecked === RUN_AT);
  check('(b) marker removed', row.pendingUnbuyableSince === undefined, `got ${String(row.pendingUnbuyableSince)}`);
}

// --- (c) marker 2h old, fresh still unbuyable -> still HELD ------------------
{
  const setAt = iso(2 * HOURS);
  const prev: PriceCache = { B0HOLDC003: buyablePrior({ pendingUnbuyableSince: setAt, lastReadAt: setAt }) };
  const { output, held, confirmedUnbuyable } = applyFetchResults(
    prev,
    [read('B0HOLDC003', '$41.10', 'UNAVAILABLE')],
    RUN_AT,
  );
  const row = output.B0HOLDC003!;
  check('(c) still counted as held', held === 1 && confirmedUnbuyable === 0, `held=${held} confirmed=${confirmedUnbuyable}`);
  check('(c) row is still BUYABLE to the gate', !isSnapshotUnbuyable(row), `availability=${row.availability}`);
  check('(c) marker NOT refreshed — the 12h clock runs from the FIRST read', row.pendingUnbuyableSince === setAt, `got ${String(row.pendingUnbuyableSince)}`);
  check('(c) lastReadAt advanced to this run', row.lastReadAt === RUN_AT);
}

// --- (d) prior unbuyable + fresh buyable -> applies immediately --------------
{
  const prev: PriceCache = {
    B0HOLDD004: buyablePrior({ availability: 'OUT_OF_STOCK', price: '$41.10' }),
  };
  const { output, held, confirmedUnbuyable, cleared } = applyFetchResults(
    prev,
    [read('B0HOLDD004', '$52.00', 'IN_STOCK')],
    RUN_AT,
  );
  const row = output.B0HOLDD004!;
  check('(d) no hold bookkeeping on a restore', held === 0 && confirmedUnbuyable === 0 && cleared === 0);
  check('(d) restore applied on the FIRST read', !isSnapshotUnbuyable(row) && row.availability === 'IN_STOCK');
  check('(d) fresh price written', row.price === '$52.00');
  check('(d) no marker left behind', row.pendingUnbuyableSince === undefined);
}

// --- (e) prior buyable + fresh buyable, stale marker -> marker cleared -------
{
  const prev: PriceCache = { B0HOLDE005: buyablePrior({ pendingUnbuyableSince: iso(3 * HOURS), lastReadAt: iso(3 * HOURS) }) };
  const { output, held, cleared } = applyFetchResults(
    prev,
    [read('B0HOLDE005', '$44.44', 'IN_STOCK')],
    RUN_AT,
  );
  const row = output.B0HOLDE005!;
  check('(e) counted as cleared', cleared === 1 && held === 0, `cleared=${cleared} held=${held}`);
  check('(e) marker cleared', row.pendingUnbuyableSince === undefined, `got ${String(row.pendingUnbuyableSince)}`);
  check('(e) lastReadAt cleared with it', row.lastReadAt === undefined);
  check('(e) price updated to the fresh read', row.price === '$44.44' && row.lastChecked === RUN_AT);
}

// --- (f) no prior entry + fresh unbuyable -> legacy behavior -----------------
{
  const { output, held, succeeded } = applyFetchResults(
    {},
    [read('B0HOLDF006', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  const row = output.B0HOLDF006!;
  check('(f) nothing held — there is no buyable state to protect', held === 0 && succeeded === 1);
  check('(f) fresh unbuyable row written as-is', isSnapshotUnbuyable(row) && row.availability === 'OUT_OF_STOCK');
  check('(f) no marker invented', row.pendingUnbuyableSince === undefined);
}

// --- regression control: Issue #91 retain-on-failure is untouched ------------
{
  const prev: PriceCache = { B0RETAIN9: buyablePrior() };
  const { output, retained } = applyFetchResults(
    prev,
    [{ asin: 'B0RETAIN9', ok: false, error: 'simulated 500' }],
    RUN_AT,
  );
  check('(#91) error read still retains + marks stale', retained === 1 && output.B0RETAIN9?.stale === true);
  check('(#91) no pending marker invented on the error path', output.B0RETAIN9?.pendingUnbuyableSince === undefined);
}

// --- (g) M1: prior DISCLOSABLE BACKORDER is NOT held ------------------------
// A held row is written as {...prior}, so holding an Amazon-sold, priced
// AVAILABLE_DATE row would retain BOTH availability=AVAILABLE_DATE and
// merchantId=ATVPDKIKX0DER — keeping isDisclosableBackorder() true and
// backorderDisclosureLabel() telling the reader "On backorder at Amazon — you
// can order it now" for the whole window, after the freshest read said the
// offer is gone or the buy box moved to a third party. That is an affirmative
// orderability-and-seller claim the current evidence contradicts, so the hold
// excludes this class outright: it was already a degraded state, and
// suppression is the honest answer for it.
{
  const backorderPrior = buyablePrior({ price: '$129.99', availability: 'AVAILABLE_DATE' });
  check('(g) fixture really is a disclosable backorder', isDisclosableBackorder(backorderPrior));
  check('(g) fixture is buyable to the coarse gate — this is why it needed excluding', !isSnapshotUnbuyable(backorderPrior));

  // g1: fresh read says the offer is gone entirely.
  {
    const { output, held, confirmedUnbuyable } = applyFetchResults(
      { B0BACKG001: backorderPrior },
      [read('B0BACKG001', '$129.99', 'OUT_OF_STOCK')],
      RUN_AT,
    );
    const row = output.B0BACKG001!;
    check('(g1) NOT held — backorder-class prior applies immediately', held === 0 && confirmedUnbuyable === 0, `held=${held}`);
    check('(g1) row is now unbuyable — suppression is the honest state', isSnapshotUnbuyable(row));
    check('(g1) disclosure claim is gone', !isDisclosableBackorder(row));
    check('(g1) no marker invented', row.pendingUnbuyableSince === undefined);
  }

  // g2: buy box moved to a third party — same availability, different seller.
  {
    const { output, held } = applyFetchResults(
      { B0BACKG002: backorderPrior },
      [read('B0BACKG002', '$129.99', 'AVAILABLE_DATE', 'A3PSELLER1')],
      RUN_AT,
    );
    const row = output.B0BACKG002!;
    check('(g2) NOT held on a seller move to 3P', held === 0, `held=${held}`);
    check('(g2) fresh merchantId written — no stale "Amazon is the seller" claim', row.merchantId === 'A3PSELLER1');
    check('(g2) row no longer renders the backorder disclosure', !isDisclosableBackorder(row) && isSnapshotUnbuyable(row));
  }
}

// --- (h) the exact 12h boundary --------------------------------------------
{
  const justUnder = applyFetchResults(
    { B0EDGEH001: buyablePrior({ pendingUnbuyableSince: iso(PENDING_UNBUYABLE_HOLD_MS - 60_000) }) },
    [read('B0EDGEH001', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  check('(h) 11h59m -> still HELD', justUnder.held === 1 && justUnder.confirmedUnbuyable === 0);

  const exactly = applyFetchResults(
    { B0EDGEH002: buyablePrior({ pendingUnbuyableSince: iso(PENDING_UNBUYABLE_HOLD_MS) }) },
    [read('B0EDGEH002', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  check('(h) exactly 12h00m -> APPLIED (>= boundary, not >)', exactly.confirmedUnbuyable === 1 && exactly.held === 0);
  check('(h) exactly 12h00m -> marker removed', exactly.output.B0EDGEH002?.pendingUnbuyableSince === undefined);
}

// --- (i) malformed marker re-seeds instead of holding forever ---------------
{
  const { value, warnings } = captureWarn(() =>
    applyFetchResults(
      { B0BADI001: buyablePrior({ pendingUnbuyableSince: 'pending' }) },
      [read('B0BADI001', '$41.10', 'OUT_OF_STOCK')],
      RUN_AT,
    ),
  );
  const row = value.output.B0BADI001!;
  check('(i) still held this run (it is a first read again)', value.held === 1);
  check('(i) malformed marker RE-SEEDED to this run — the window can now expire', row.pendingUnbuyableSince === RUN_AT, `got ${String(row.pendingUnbuyableSince)}`);
  check('(i) warned about the malformed marker', warnings.some((w) => w.includes('not a parseable timestamp')));
}

// --- (j) future-dated marker is clamped to this run -------------------------
{
  const { value, warnings } = captureWarn(() =>
    applyFetchResults(
      { B0BADJ001: buyablePrior({ pendingUnbuyableSince: iso(-3 * HOURS) }) },
      [read('B0BADJ001', '$41.10', 'OUT_OF_STOCK')],
      RUN_AT,
    ),
  );
  const row = value.output.B0BADJ001!;
  check('(j) clock skew does not extend the hold — marker clamped to this run', row.pendingUnbuyableSince === RUN_AT, `got ${String(row.pendingUnbuyableSince)}`);
  check('(j) warned about the future marker', warnings.some((w) => w.includes('in the FUTURE')));
}

// --- (k) malformed runAt THROWS rather than disabling release ---------------
{
  let threw = false;
  let message = '';
  try {
    applyFetchResults({ B0BADK001: buyablePrior() }, [read('B0BADK001', '$41.10', 'OUT_OF_STOCK')], 'not-a-date');
  } catch (err) {
    threw = true;
    message = err instanceof Error ? err.message : String(err);
  }
  check('(k) malformed runAt throws — never a silent permanent hold', threw, message);
  check('(k) the error says why', message.includes('runAt is not a parseable ISO timestamp'));
}

// --- (l) 7-day hard ceiling — MARKER AGE ONLY -------------------------------
// Cycle 1 also released on the age of the last CONFIRMED read. W4 replayed that
// against the committed snapshot: 992 of 1,039 rows share
// `lastChecked: 2026-09-03` and cross 7d together on 2026-09-10, so one late
// dispatch suppressed 901 plainly-buyable rows on a single read. `lastChecked`
// age measures our MERGE cadence, not the listing, so that limb is gone. Cases
// (p) and (q) below are the regression guard.
{
  check('(l) ceiling is a ceiling, not a second weaker rule', PENDING_UNBUYABLE_MAX_HOLD_MS > PENDING_UNBUYABLE_HOLD_MS);

  const { value, warnings } = captureWarn(() =>
    applyFetchResults(
      { B0CEILL001: buyablePrior({ pendingUnbuyableSince: iso(PENDING_UNBUYABLE_MAX_HOLD_MS + HOURS) }) },
      [read('B0CEILL001', '$41.10', 'OUT_OF_STOCK')],
      RUN_AT,
    ),
  );
  check('(l) a marker past the ceiling releases', value.confirmedUnbuyable === 1 && value.held === 0);
  check('(l) release is attributed to the marker ceiling', warnings.some((w) => w.includes('hard ceiling')), warnings.join(' | '));
}

// --- (p) CORPUS-SHAPE REPLAY: stale data must NEVER release a hold ----------
// The exact row shape 992 of the 1,039 committed rows will have: plainly
// buyable, priced, and long past any freshness window, with NO marker because
// its holds have never been merged. One contradicting read must HOLD it — this
// is the #649 shape verbatim, and the only thing standing between this corpus
// and 901 single-read suppressions.
{
  const runAts = [
    '2026-09-07T12:00:00.000Z',
    '2026-09-10T12:00:00.000Z', // the Thursday cadence day the cycle-1 cliff landed on
    '2026-12-01T12:00:00.000Z', // months later — age must still not matter
  ];
  for (const at of runAts) {
    const thirtyDaysBefore = new Date(Date.parse(at) - 30 * 24 * HOURS).toISOString();
    const { output, held, confirmedUnbuyable } = applyFetchResults(
      { B0STALEP01: buyablePrior({ lastChecked: thirtyDaysBefore }) },
      [read('B0STALEP01', '$41.10', 'OUT_OF_STOCK')],
      at,
    );
    const row = output.B0STALEP01!;
    check(`(p) 30d-old lastChecked, no marker, runAt ${at.slice(0, 10)} -> HELD`, held === 1 && confirmedUnbuyable === 0, `held=${held} confirmed=${confirmedUnbuyable}`);
    check(`(p) ... row keeps its buy path, runAt ${at.slice(0, 10)}`, !isSnapshotUnbuyable(row));
    check(`(p) ... marker set so the 12h clock can start, runAt ${at.slice(0, 10)}`, row.pendingUnbuyableSince === at);
  }

  // The `stale: true` rows are the OLDEST ones — their reads keep failing, which
  // is exactly why they need the hold most. Age must not strip it.
  {
    const { held } = applyFetchResults(
      { B0STALEP02: buyablePrior({ lastChecked: '2026-08-10T00:00:00.000Z', stale: true }) },
      [read('B0STALEP02', '$50.22', 'OUT_OF_STOCK')],
      RUN_AT,
    );
    check('(p) a stale:true, month-old row is still HELD — high-noise rows need the hold most', held === 1, `held=${held}`);
  }

  // An unreadable lastChecked is now simply irrelevant, not "infinitely old".
  {
    const { held } = applyFetchResults(
      { B0STALEP03: buyablePrior({ lastChecked: 'whenever' }) },
      [read('B0STALEP03', '$41.10', 'OUT_OF_STOCK')],
      RUN_AT,
    );
    check('(p) unreadable lastChecked no longer releases anything', held === 1, `held=${held}`);
  }
}

// --- (q) the same stale row, once its hold is actually running --------------
// (p) proves stale data cannot START a release. (q) proves the ceiling still
// bounds a hold that IS running, on the one clock that is about the listing.
{
  const { output, held, confirmedUnbuyable } = applyFetchResults(
    {
      B0STALEQ01: buyablePrior({
        lastChecked: iso(30 * 24 * HOURS),
        pendingUnbuyableSince: iso(8 * 24 * HOURS),
      }),
    },
    [read('B0STALEQ01', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  check('(q) same row with an 8d-old marker -> APPLIED', confirmedUnbuyable === 1 && held === 0, `held=${held}`);
  check('(q) row flips and the marker is gone', isSnapshotUnbuyable(output.B0STALEQ01!) && output.B0STALEQ01?.pendingUnbuyableSince === undefined);
}

// --- (m) marker dropped on the prior-not-plainly-buyable path is COUNTED ----
{
  const { output, cleared, held } = applyFetchResults(
    { B0CNTM001: buyablePrior({ availability: 'OUT_OF_STOCK', pendingUnbuyableSince: iso(2 * HOURS) }) },
    [read('B0CNTM001', '$41.10', 'UNAVAILABLE')],
    RUN_AT,
  );
  check('(m) marker drop on the prior-unbuyable path is counted, not silent', cleared === 1 && held === 0, `cleared=${cleared}`);
  check('(m) marker actually gone', output.B0CNTM001?.pendingUnbuyableSince === undefined);
}

// --- (n) held row -> next read errors: the marker survives the #91 path -----
// This is the two-run continuity the hold depends on. Run 1 holds; run 2's
// fetch fails; the retain-on-failure path must not wipe the marker, or the
// hold silently restarts at read one.
{
  const run1 = applyFetchResults(
    { B0CONTN001: buyablePrior() },
    [read('B0CONTN001', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  check('(n) run 1 holds', run1.held === 1 && run1.output.B0CONTN001?.pendingUnbuyableSince === RUN_AT);

  const laterRun = new Date(runMs + 6 * HOURS).toISOString();
  const run2 = applyFetchResults(
    run1.output,
    [{ asin: 'B0CONTN001', ok: false, error: 'simulated 500' }],
    laterRun,
  );
  const row = run2.output.B0CONTN001!;
  check('(n) run 2 error takes the #91 retain path', run2.retained === 1 && row.stale === true);
  check('(n) marker SURVIVES the retain path — the clock is not reset', row.pendingUnbuyableSince === RUN_AT, `got ${String(row.pendingUnbuyableSince)}`);

  // Run 3, >=12h after the ORIGINAL marker, still unbuyable -> confirms.
  const run3At = new Date(runMs + 13 * HOURS).toISOString();
  const run3 = applyFetchResults(run2.output, [read('B0CONTN001', '$41.10', 'OUT_OF_STOCK')], run3At);
  check('(n) run 3 confirms off the ORIGINAL marker, an error run later', run3.confirmedUnbuyable === 1);
}

// --- (o) accounting: succeeded counts only rows WRITTEN ---------------------
{
  const prev: PriceCache = {
    B0ACCT_HELD: buyablePrior(),
    B0ACCT_RETAIN: buyablePrior(),
  };
  const results: FetchOutcome[] = [
    read('B0ACCT_WRITE', '$10.00', 'IN_STOCK'),            // written
    read('B0ACCT_HELD', '$10.00', 'OUT_OF_STOCK'),         // held
    { asin: 'B0ACCT_RETAIN', ok: false, error: 'boom' },   // retained
    { asin: 'B0ACCT_DROP', ok: false, error: 'boom' },     // dropped
  ];
  const { succeeded, held, retained, dropped } = applyFetchResults(prev, results, RUN_AT);
  check('(o) succeeded counts ONLY rows written', succeeded === 1, `succeeded=${succeeded}`);
  check('(o) held is its own outcome, not a success', held === 1);
  check('(o) retained/dropped unchanged', retained === 1 && dropped === 1);
  check(
    '(o) every result lands in exactly one bucket',
    succeeded + held + retained + dropped === results.length,
    `${succeeded}+${held}+${retained}+${dropped} != ${results.length}`,
  );
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\ntwo-read-hysteresis: PASS');
