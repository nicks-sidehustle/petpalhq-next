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
 * Run: npx tsx scripts/test/two-read-hysteresis.test.ts
 * (wired into `npm run validate:content` and `npm run test:two-read-hysteresis`)
 */
import {
  applyFetchResults,
  PENDING_UNBUYABLE_HOLD_MS,
  type FetchOutcome,
  type PriceCache,
} from '../sync-amazon-prices';
import { isSnapshotUnbuyable } from '../../src/lib/price-cache';

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
    lastChecked: '2026-09-01T00:00:00.000Z',
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

console.log(`hold window: ${PENDING_UNBUYABLE_HOLD_MS / HOURS}h\n`);

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
  check('(a) prior lastChecked retained — no false freshness', row.lastChecked === '2026-09-01T00:00:00.000Z');
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

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\ntwo-read-hysteresis: PASS');
