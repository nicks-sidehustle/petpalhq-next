/**
 * SYNC IS HOLD-ONLY — owner ruling 2026-09-08, RUNBOOK §8rr.1 / §8mm / §8l.
 * (Replaces two-read-hysteresis.test.ts; same function, narrower law.)
 *
 * WHAT THIS PINS. #160 held a buyable -> unbuyable API read on the first read
 * and let a SECOND API read confirm it (>=12h later, or a 7d marker ceiling).
 * W4 on #168 measured those confirmations: the Creators API returns a
 * NON-FEATURED backorder offer for some ASINs while the live page's featured
 * offer is New and in stock, so the second read agrees with the first for a
 * reason that has nothing to do with the listing — 6 of 6 sampled "two-read
 * confirmed" flips were FALSE, 16 flips in that PR were false negatives against
 * a live page, and one of them (B00I9A8CW6) wrote a USED $45.99 offer in as the
 * row price. Two reads of the same wrong instrument are not two pieces of
 * evidence.
 *
 * The law now:
 *   - an API read can only ever HOLD a flip, at any age, forever;
 *   - only a LIVE PAGE READ (data/live-read-overrides.json, <=7d) applies one;
 *   - an offer that is not New never becomes the row price.
 *
 * CASES
 *   (a) API buyable -> unbuyable, at 1h / 13h / 8d marker ages -> ALWAYS held,
 *       never applied. This is the case the removed 12h and 7d paths used to
 *       release, and the mutation below re-adds one of them to prove it.
 *   (b) held + live read "unavailable" 2d old      -> APPLIED, marker cleared
 *   (c) held + live read "unavailable" 8d old      -> still HELD (§8rr.3)
 *   (d) held + live read "live-new"                -> prior row kept, marker gone
 *   (e) API unbuyable -> buyable                   -> applied on the first read
 *   (f) API offer that is not New                  -> HELD, price NOT written
 *   (h) Issue #91 error retain path                -> unchanged
 *
 * REGRESSION CASES CARRIED OVER from the two-read suite (still load-bearing):
 *   (m1) prior DISCLOSABLE BACKORDER is applied, not held (W4 M1)
 *   (m2) malformed marker is re-seeded, not carried as garbage
 *   (m3) malformed runAt THROWS rather than silently freezing every hold
 *   (m4) a marker dropped on the prior-not-plainly-buyable path is COUNTED
 *   (m5) a held row whose next read ERRORS keeps its marker (#91 continuity)
 *   (m6) accounting: every result lands in exactly one bucket
 *   (m7) corpus-shape replay — data age never releases anything
 *   (m8) used-only / dark live reads never fabricate a hold on a row the API
 *        reads as buyable (an override can resolve a hold, never create one)
 *
 * Run: npx tsx scripts/test/sync-hold-only.test.ts
 * (wired into `npm run validate:content` and `npm run test:sync-hold-only`)
 */
import {
  applyFetchResults,
  liveReadVerdict,
  LIVE_READ_MAX_AGE_MS,
  type FetchOutcome,
  type PriceCache,
} from '../sync-amazon-prices';
import { isDisclosableBackorder, isSnapshotUnbuyable } from '../../src/lib/price-cache';
import { OVERRIDE_MAX_AGE_DAYS, type LiveReadOverride } from '../../src/lib/dark-card';
import { buildLiveReadRow } from '../record-live-read';

let failures = 0;
function check(label: string, ok: boolean, extra = '') {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}${extra ? `\n         ${extra}` : ''}`);
  }
}

const RUN_AT = '2026-09-08T12:00:00.000Z';
const runMs = Date.parse(RUN_AT);
const iso = (msAgo: number) => new Date(runMs - msAgo).toISOString();
const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

/** A confirmed-buyable prior row (IN_STOCK, priced, Amazon-sold). */
function buyablePrior(overrides: Partial<PriceCache[string]> = {}): PriceCache[string] {
  return {
    price: '$49.99',
    lastChecked: '2026-09-06T00:00:00.000Z',
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
function read(
  asin: string,
  price: string,
  availability: string,
  merchantId: string | null = 'ATVPDKIKX0DER',
  extra: { condition?: string | null; title?: string | null; merchantName?: string | null } = {},
): FetchOutcome {
  return {
    asin,
    ok: true,
    result: {
      asin,
      price,
      currency: 'USD',
      availability,
      merchantId,
      merchantName:
        extra.merchantName !== undefined ? extra.merchantName : merchantId ? 'Amazon.com' : null,
      lastChecked: RUN_AT,
      listPrice: null,
      listPriceBasis: null,
      savingsPercent: null,
      condition: extra.condition ?? null,
      title: extra.title ?? null,
    },
  };
}

/** A live-read override row, built through the CLI's own validator so the test
 *  cannot pin a shape scripts/record-live-read.ts would never write. */
function liveRead(
  asin: string,
  state: 'live-new' | 'unavailable' | 'used-only' | 'not-found',
  msAgo: number,
  price: number | null = null,
): LiveReadOverride {
  return buildLiveReadRow({
    asin,
    state,
    source: `https://www.amazon.com/dp/${asin}`,
    price: state === 'live-new' ? (price ?? 49.99) : null,
    merchant: 'Amazon.com',
    readAt: iso(msAgo),
    lane: 'test',
  });
}

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
  `live-read window: ${LIVE_READ_MAX_AGE_MS / DAYS}d (dark-card OVERRIDE_MAX_AGE_DAYS=${OVERRIDE_MAX_AGE_DAYS})\n`,
);
check(
  'the sync and the render layer share ONE expiry window',
  LIVE_READ_MAX_AGE_MS === OVERRIDE_MAX_AGE_DAYS * DAYS,
  `${LIVE_READ_MAX_AGE_MS} vs ${OVERRIDE_MAX_AGE_DAYS * DAYS}`,
);

// --- (a) an API read NEVER applies a flip, at any marker age -----------------
// 1h is inside the old 12h window, 13h is past it, 8d is past the old 7d marker
// ceiling. All three released under #160; all three must hold now.
{
  const ages: Array<[string, number | null]> = [
    ['no marker (first contradicting read)', null],
    ['marker 1h old', 1 * HOURS],
    ['marker 13h old (past the removed 12h window)', 13 * HOURS],
    ['marker 8d old (past the removed 7d ceiling)', 8 * DAYS],
  ];
  for (const [label, msAgo] of ages) {
    const marker = msAgo === null ? undefined : iso(msAgo);
    const prev: PriceCache = {
      B0HOLDA001: buyablePrior(marker ? { pendingUnbuyableSince: marker, lastReadAt: marker } : {}),
    };
    const { output, held, confirmedUnbuyable, succeeded } = applyFetchResults(
      prev,
      [read('B0HOLDA001', '$41.10', 'OUT_OF_STOCK')],
      RUN_AT,
    );
    const row = output.B0HOLDA001!;
    check(`(a) ${label} -> HELD, never applied`, held === 1 && confirmedUnbuyable === 0 && succeeded === 0, `held=${held} confirmed=${confirmedUnbuyable}`);
    check(`(a) ${label} -> row is still BUYABLE to the gate`, !isSnapshotUnbuyable(row), `availability=${row.availability}`);
    check(`(a) ${label} -> prior price retained, contradicted read discarded`, row.price === '$49.99');
    check(`(a) ${label} -> prior lastChecked retained (no false freshness)`, row.lastChecked === '2026-09-06T00:00:00.000Z');
    check(`(a) ${label} -> marker records the FIRST contradicting read`, row.pendingUnbuyableSince === (marker ?? RUN_AT), `got ${String(row.pendingUnbuyableSince)}`);
    check(`(a) ${label} -> lastReadAt advanced to this run`, row.lastReadAt === RUN_AT);
  }
}

// --- (b) held + live read "unavailable" 2d old -> APPLIED --------------------
{
  const marker = iso(3 * DAYS);
  const prev: PriceCache = { B0LIVEB001: buyablePrior({ pendingUnbuyableSince: marker, lastReadAt: marker }) };
  const { value, warnings } = captureWarn(() =>
    applyFetchResults(
      prev,
      [read('B0LIVEB001', '$41.10', 'OUT_OF_STOCK')],
      RUN_AT,
      { B0LIVEB001: liveRead('B0LIVEB001', 'unavailable', 2 * DAYS) },
    ),
  );
  const row = value.output.B0LIVEB001!;
  check('(b) counted as confirmed unbuyable', value.confirmedUnbuyable === 1 && value.held === 0, `held=${value.held} confirmed=${value.confirmedUnbuyable}`);
  check('(b) flip APPLIED — the row is now unbuyable', isSnapshotUnbuyable(row), `availability=${row.availability}`);
  check('(b) fresh availability + price written', row.availability === 'OUT_OF_STOCK' && row.price === '$41.10');
  check('(b) marker cleared', row.pendingUnbuyableSince === undefined, `got ${String(row.pendingUnbuyableSince)}`);
  check('(b) the log attributes the flip to the LIVE READ, not the API', warnings.some((w) => w.includes('confirmed by live read')), warnings.join(' | '));

  // not-found and used-only are the same verdict class.
  for (const state of ['not-found', 'used-only'] as const) {
    const r = applyFetchResults(
      { B0LIVEB002: buyablePrior() },
      [read('B0LIVEB002', '$41.10', 'UNAVAILABLE')],
      RUN_AT,
      { B0LIVEB002: liveRead('B0LIVEB002', state, 1 * DAYS) },
    );
    check(`(b) live read "${state}" also confirms`, r.confirmedUnbuyable === 1 && r.held === 0, `held=${r.held}`);
  }
}

// --- (c) held + live read 8 days old -> still HELD ---------------------------
{
  const prev: PriceCache = { B0LIVEC001: buyablePrior() };
  const { value, warnings } = captureWarn(() =>
    applyFetchResults(
      prev,
      [read('B0LIVEC001', '$41.10', 'OUT_OF_STOCK')],
      RUN_AT,
      { B0LIVEC001: liveRead('B0LIVEC001', 'unavailable', 8 * DAYS) },
    ),
  );
  const row = value.output.B0LIVEC001!;
  check('(c) an 8-day-old live read confirms nothing (§8rr.3)', value.held === 1 && value.confirmedUnbuyable === 0, `held=${value.held} confirmed=${value.confirmedUnbuyable}`);
  check('(c) the row keeps its buy path', !isSnapshotUnbuyable(row) && row.price === '$49.99');
  check('(c) the log says WHY the override was unusable', warnings.some((w) => w.includes('older than')), warnings.join(' | '));

  // Boundary: 6d in, 8d out — the same pair the dark-card renderer is pinned to.
  const at6d = applyFetchResults(
    { B0LIVEC002: buyablePrior() },
    [read('B0LIVEC002', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
    { B0LIVEC002: liveRead('B0LIVEC002', 'unavailable', 6 * DAYS) },
  );
  check('(c) a 6-day-old live read still confirms', at6d.confirmedUnbuyable === 1, `confirmed=${at6d.confirmedUnbuyable}`);
  check('(c) liveReadVerdict: 6d = dark, 8d = none', liveReadVerdict(liveRead('B0XXXXXXX1', 'unavailable', 6 * DAYS), runMs).verdict === 'dark' && liveReadVerdict(liveRead('B0XXXXXXX1', 'unavailable', 8 * DAYS), runMs).verdict === 'none');
  check('(c) a FUTURE-dated live read confirms nothing either', liveReadVerdict(liveRead('B0XXXXXXX1', 'unavailable', -3 * HOURS), runMs).verdict === 'none');
}

// --- (d) held + live read "live-new" -> prior row kept, marker cleared -------
{
  const marker = iso(4 * DAYS);
  const prev: PriceCache = { B0LIVED001: buyablePrior({ pendingUnbuyableSince: marker, lastReadAt: marker }) };
  const { output, held, confirmedUnbuyable, cleared, liveNewRejected } = applyFetchResults(
    prev,
    [read('B0LIVED001', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
    { B0LIVED001: liveRead('B0LIVED001', 'live-new', 1 * DAYS, 49.99) },
  );
  const row = output.B0LIVED001!;
  check('(d) the API read is rejected as a false negative', liveNewRejected === 1 && held === 0 && confirmedUnbuyable === 0, `held=${held} rejected=${liveNewRejected}`);
  check('(d) counted as a cleared marker', cleared === 1, `cleared=${cleared}`);
  check('(d) the confirmed buyable row is kept intact', !isSnapshotUnbuyable(row) && row.price === '$49.99' && row.availability === 'IN_STOCK');
  check('(d) marker and lastReadAt both cleared — nothing is pending any more', row.pendingUnbuyableSince === undefined && row.lastReadAt === undefined, JSON.stringify(row));
}

// --- (e) API unbuyable -> buyable applies on the FIRST read ------------------
{
  const prev: PriceCache = { B0RESTE001: buyablePrior({ availability: 'OUT_OF_STOCK', price: '$41.10' }) };
  const { output, held, cleared, succeeded } = applyFetchResults(
    prev,
    [read('B0RESTE001', '$52.00', 'IN_STOCK')],
    RUN_AT,
  );
  const row = output.B0RESTE001!;
  check('(e) restore applied on the first read', succeeded === 1 && held === 0 && cleared === 0);
  check('(e) row is buyable with the fresh price', !isSnapshotUnbuyable(row) && row.price === '$52.00' && row.availability === 'IN_STOCK');
  check('(e) no marker left behind', row.pendingUnbuyableSince === undefined);

  // …and a stale marker on an otherwise buyable row is cleared by a buyable read.
  const withMarker = applyFetchResults(
    { B0RESTE002: buyablePrior({ pendingUnbuyableSince: iso(3 * DAYS), lastReadAt: iso(3 * DAYS) }) },
    [read('B0RESTE002', '$44.44', 'IN_STOCK')],
    RUN_AT,
  );
  check('(e) a buyable read clears a standing marker', withMarker.cleared === 1 && withMarker.output.B0RESTE002?.pendingUnbuyableSince === undefined);
  check('(e) …and writes the fresh price', withMarker.output.B0RESTE002?.price === '$44.44');
}

// --- (f) USED-PRICE GUARD: a not-New offer never becomes the row price -------
// Shaped like B00I9A8CW6's #168 read: a well-formed 200, IN_STOCK, carrying a
// price — off a USED offer. #168 wrote $45.99 in as the row price.
{
  const usedShapes: Array<[string, ReturnType<typeof read>]> = [
    [
      'condition field says Used',
      read('B00I9A8CW6', '$45.99', 'IN_STOCK', 'ATVPDKIKX0DER', { condition: 'Used' }),
    ],
    [
      'merchant is Amazon Resale (Amazon-sold, still not New)',
      read('B00I9A8CW7', '$45.99', 'IN_STOCK', 'ATVPDKIKX0DER', { merchantName: 'Amazon Resale' }),
    ],
    [
      '§8l title marker (Renewed)',
      read('B00I9A8CW8', '$45.99', 'IN_STOCK', 'ATVPDKIKX0DER', { title: 'PetSafe ScoopFree Litter Box (Renewed)' }),
    ],
  ];
  for (const [label, outcome] of usedShapes) {
    const asin = outcome.asin;
    const { output, held, usedOnly, usedOnlyAsins, succeeded } = applyFetchResults(
      { [asin]: buyablePrior() },
      [outcome],
      RUN_AT,
    );
    const row = output[asin]!;
    check(`(f) ${label} -> withheld by the used-price guard`, usedOnly === 1 && usedOnlyAsins[0] === asin, `usedOnly=${usedOnly}`);
    check(`(f) ${label} -> counted as held, not written`, held === 1 && succeeded === 0, `held=${held} succeeded=${succeeded}`);
    check(`(f) ${label} -> the USED price is NOT the row price`, row.price === '$49.99', `price=${row.price}`);
    check(`(f) ${label} -> the card keeps its buy path`, !isSnapshotUnbuyable(row));
    check(`(f) ${label} -> marker set so a live read is asked for`, row.pendingUnbuyableSince === RUN_AT);
  }

  // A plain New read of the same shape is unaffected — the guard fires only on
  // a POSITIVE not-New signal, never on silence (§8mm).
  const newRead = applyFetchResults(
    { B00I9A8CW6: buyablePrior() },
    [read('B00I9A8CW6', '$45.99', 'IN_STOCK', 'ATVPDKIKX0DER', { condition: 'New', title: 'PetSafe ScoopFree Litter Box' })],
    RUN_AT,
  );
  check('(f) a New offer of the same shape still writes normally', newRead.usedOnly === 0 && newRead.succeeded === 1 && newRead.output.B00I9A8CW6?.price === '$45.99');
  const silentRead = applyFetchResults(
    { B00I9A8CW6: buyablePrior() },
    [read('B00I9A8CW6', '$45.99', 'IN_STOCK')],
    RUN_AT,
  );
  check('(f) NO condition signal is not a used signal — absence never darkens', silentRead.usedOnly === 0 && silentRead.succeeded === 1);

  // No prior row: the used price is still never written, and nothing is invented.
  const noPrior = applyFetchResults(
    {},
    [read('B00I9A8CW9', '$45.99', 'IN_STOCK', 'ATVPDKIKX0DER', { condition: 'Used' })],
    RUN_AT,
  );
  check('(f) used offer + no prior row -> nothing written at all', noPrior.dropped === 1 && noPrior.output.B00I9A8CW9 === undefined, JSON.stringify(noPrior.output));
}

// --- (h) Issue #91 retain-on-failure path is untouched ----------------------
{
  const prev: PriceCache = { B0RETAIN9: buyablePrior() };
  const { output, retained } = applyFetchResults(
    prev,
    [{ asin: 'B0RETAIN9', ok: false, error: 'simulated 500' }],
    RUN_AT,
  );
  check('(h) error read still retains + marks stale', retained === 1 && output.B0RETAIN9?.stale === true);
  check('(h) no pending marker invented on the error path', output.B0RETAIN9?.pendingUnbuyableSince === undefined);

  const okRead = read('B0RETAIN8', '$0', 'IN_STOCK');
  const emptyResult = okRead.ok ? okRead.result : null!;
  const emptyOk = applyFetchResults(
    { B0RETAIN8: buyablePrior() },
    [{ asin: 'B0RETAIN8', ok: true, result: { ...emptyResult, price: null } }],
    RUN_AT,
  );
  check('(h) an empty-200 read takes the same retain path', emptyOk.retained === 1 && emptyOk.output.B0RETAIN8?.stale === true);
  check('(h) …and the retained price is the prior one', emptyOk.output.B0RETAIN8?.price === '$49.99');
}

// --- (m1) prior DISCLOSABLE BACKORDER is applied, not held ------------------
// A held row is written as {...prior}, so holding an Amazon-sold, priced
// AVAILABLE_DATE row would keep backorderDisclosureLabel() telling the reader
// "On backorder at Amazon — you can order it now" after the freshest read said
// the offer is gone or the buy box moved. That is an affirmative
// orderability-and-seller claim, not a preserved figure, so it is excluded.
{
  const backorderPrior = buyablePrior({ price: '$129.99', availability: 'AVAILABLE_DATE' });
  check('(m1) fixture really is a disclosable backorder', isDisclosableBackorder(backorderPrior));

  const gone = applyFetchResults(
    { B0BACKG001: backorderPrior },
    [read('B0BACKG001', '$129.99', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  check('(m1) NOT held — backorder-class prior applies immediately', gone.held === 0 && gone.confirmedUnbuyable === 0, `held=${gone.held}`);
  check('(m1) the disclosure claim is gone', !isDisclosableBackorder(gone.output.B0BACKG001!) && isSnapshotUnbuyable(gone.output.B0BACKG001!));

  const seller = applyFetchResults(
    { B0BACKG002: backorderPrior },
    [read('B0BACKG002', '$129.99', 'AVAILABLE_DATE', 'A3PSELLER1')],
    RUN_AT,
  );
  check('(m1) NOT held on a seller move to 3P', seller.held === 0);
  check('(m1) fresh merchantId written — no stale "Amazon is the seller" claim', seller.output.B0BACKG002?.merchantId === 'A3PSELLER1');
}

// --- (m2) malformed marker is re-seeded, not carried as garbage -------------
{
  const { value, warnings } = captureWarn(() =>
    applyFetchResults(
      { B0BADI001: buyablePrior({ pendingUnbuyableSince: 'pending' }) },
      [read('B0BADI001', '$41.10', 'OUT_OF_STOCK')],
      RUN_AT,
    ),
  );
  const row = value.output.B0BADI001!;
  check('(m2) still held', value.held === 1);
  check('(m2) malformed marker RE-SEEDED to this run', row.pendingUnbuyableSince === RUN_AT, `got ${String(row.pendingUnbuyableSince)}`);
  check('(m2) warned about it', warnings.some((w) => w.includes('not a parseable timestamp')));

  const future = captureWarn(() =>
    applyFetchResults(
      { B0BADJ001: buyablePrior({ pendingUnbuyableSince: iso(-3 * HOURS) }) },
      [read('B0BADJ001', '$41.10', 'OUT_OF_STOCK')],
      RUN_AT,
    ),
  );
  check('(m2) future-dated marker clamped to this run', future.value.output.B0BADJ001?.pendingUnbuyableSince === RUN_AT);
  check('(m2) warned about the future marker', future.warnings.some((w) => w.includes('in the FUTURE')));
}

// --- (m3) malformed runAt THROWS -------------------------------------------
// Still load-bearing after the clocks came out: live-read expiry is arithmetic
// on runAt, and a NaN would make every override look unusable — freezing every
// held row permanently instead of releasing them early.
{
  let threw = false;
  let message = '';
  try {
    applyFetchResults({ B0BADK001: buyablePrior() }, [read('B0BADK001', '$41.10', 'OUT_OF_STOCK')], 'not-a-date');
  } catch (err) {
    threw = true;
    message = err instanceof Error ? err.message : String(err);
  }
  check('(m3) malformed runAt throws', threw, message);
  check('(m3) the error says why', message.includes('runAt is not a parseable ISO timestamp'));
}

// --- (m4) marker dropped on the prior-not-plainly-buyable path is COUNTED ---
{
  const { output, cleared, held } = applyFetchResults(
    { B0CNTM001: buyablePrior({ availability: 'OUT_OF_STOCK', pendingUnbuyableSince: iso(2 * HOURS) }) },
    [read('B0CNTM001', '$41.10', 'UNAVAILABLE')],
    RUN_AT,
  );
  check('(m4) marker drop on the prior-unbuyable path is counted, not silent', cleared === 1 && held === 0, `cleared=${cleared}`);
  check('(m4) marker actually gone', output.B0CNTM001?.pendingUnbuyableSince === undefined);
}

// --- (m5) a held row whose next read ERRORS keeps its marker ----------------
{
  const run1 = applyFetchResults(
    { B0CONTN001: buyablePrior() },
    [read('B0CONTN001', '$41.10', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  check('(m5) run 1 holds', run1.held === 1 && run1.output.B0CONTN001?.pendingUnbuyableSince === RUN_AT);

  const run2 = applyFetchResults(
    run1.output,
    [{ asin: 'B0CONTN001', ok: false, error: 'simulated 500' }],
    new Date(runMs + 6 * HOURS).toISOString(),
  );
  check('(m5) run 2 error takes the #91 retain path', run2.retained === 1 && run2.output.B0CONTN001?.stale === true);
  check('(m5) marker SURVIVES the retain path', run2.output.B0CONTN001?.pendingUnbuyableSince === RUN_AT);

  // Run 3, days later, still no live read -> STILL held. Time buys nothing.
  const run3 = applyFetchResults(
    run2.output,
    [read('B0CONTN001', '$41.10', 'OUT_OF_STOCK')],
    new Date(runMs + 9 * DAYS).toISOString(),
  );
  check('(m5) run 3, nine days on and no live read -> still held', run3.held === 1 && run3.confirmedUnbuyable === 0, `held=${run3.held}`);
  check('(m5) …the original marker is preserved across all three runs', run3.output.B0CONTN001?.pendingUnbuyableSince === RUN_AT);
}

// --- (m6) accounting: every result lands in exactly one bucket --------------
{
  const prev: PriceCache = {
    B0ACCTHLD1: buyablePrior(),
    B0ACCTRET1: buyablePrior(),
    B0ACCTUSD1: buyablePrior(),
    B0ACCTLVN1: buyablePrior(),
  };
  const results: FetchOutcome[] = [
    read('B0ACCTWRT1', '$10.00', 'IN_STOCK'),                                              // written
    read('B0ACCTHLD1', '$10.00', 'OUT_OF_STOCK'),                                           // held
    read('B0ACCTUSD1', '$10.00', 'IN_STOCK', 'ATVPDKIKX0DER', { condition: 'Used' }),       // held (used guard)
    read('B0ACCTLVN1', '$10.00', 'OUT_OF_STOCK'),                                        // live-new rejected
    { asin: 'B0ACCTRET1', ok: false, error: 'boom' },                                     // retained
    { asin: 'B0ACCTDRP1', ok: false, error: 'boom' },                                       // dropped
  ];
  const s = applyFetchResults(prev, results, RUN_AT, {
    B0ACCTLVN1: liveRead('B0ACCTLVN1', 'live-new', 1 * DAYS),
  });
  check('(m6) succeeded counts ONLY rows written fresh', s.succeeded === 1, `succeeded=${s.succeeded}`);
  check('(m6) held covers both the availability hold and the used-price hold', s.held === 2 && s.usedOnly === 1, `held=${s.held} usedOnly=${s.usedOnly}`);
  check('(m6) live-new rejection is its own bucket', s.liveNewRejected === 1);
  check('(m6) retained/dropped unchanged', s.retained === 1 && s.dropped === 1);
  check(
    '(m6) every result lands in exactly one bucket',
    s.succeeded + s.held + s.liveNewRejected + s.retained + s.dropped === results.length,
    `${s.succeeded}+${s.held}+${s.liveNewRejected}+${s.retained}+${s.dropped} != ${results.length}`,
  );
}

// --- (m7) corpus-shape replay: data age never releases anything ------------
{
  for (const at of ['2026-09-08T12:00:00.000Z', '2026-09-30T12:00:00.000Z', '2027-03-01T12:00:00.000Z']) {
    const thirtyDaysBefore = new Date(Date.parse(at) - 30 * DAYS).toISOString();
    const { output, held, confirmedUnbuyable } = applyFetchResults(
      { B0STALEP01: buyablePrior({ lastChecked: thirtyDaysBefore }) },
      [read('B0STALEP01', '$41.10', 'OUT_OF_STOCK')],
      at,
    );
    check(`(m7) 30d-old lastChecked, runAt ${at.slice(0, 10)} -> HELD`, held === 1 && confirmedUnbuyable === 0, `held=${held}`);
    check(`(m7) ... the row keeps its buy path`, !isSnapshotUnbuyable(output.B0STALEP01!));
  }
  const staleRow = applyFetchResults(
    { B0STALEP02: buyablePrior({ lastChecked: '2026-08-10T00:00:00.000Z', stale: true }) },
    [read('B0STALEP02', '$50.22', 'OUT_OF_STOCK')],
    RUN_AT,
  );
  check('(m7) a stale:true, month-old row is still HELD', staleRow.held === 1);
}

// --- (m8) an override can RESOLVE a hold, never CREATE one -----------------
// A dark live read on a row the API reads as buyable must change nothing: the
// override is consulted only on the contradicted-buyable branch, so a stale or
// wrong override can never darken a working card by itself (§8rr).
{
  const { output, held, confirmedUnbuyable, succeeded } = applyFetchResults(
    { B0ONLYM801: buyablePrior() },
    [read('B0ONLYM801', '$49.99', 'IN_STOCK')],
    RUN_AT,
    { B0ONLYM801: liveRead('B0ONLYM801', 'unavailable', 1 * DAYS) },
  );
  check('(m8) a dark override does not darken a row the API reads as buyable', succeeded === 1 && held === 0 && confirmedUnbuyable === 0);
  check('(m8) the row stays buyable', !isSnapshotUnbuyable(output.B0ONLYM801!) && output.B0ONLYM801?.availability === 'IN_STOCK');

  // And the CLI refuses to write a price onto a dark verdict at all.
  let threw = false;
  try {
    buildLiveReadRow({ asin: 'B0ONLYM802', state: 'used-only', source: 'https://www.amazon.com/dp/B0ONLYM802', price: 45.99 });
  } catch {
    threw = true;
  }
  check('(m8) record-live-read refuses a price on a used-only verdict (§8l)', threw);

  let threwSource = false;
  try {
    buildLiveReadRow({ asin: 'B0ONLYM803', state: 'unavailable', source: 'https://example.com/whatever' });
  } catch {
    threwSource = true;
  }
  check('(m8) record-live-read refuses a non-amazon --source (§8t)', threwSource);
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsync-hold-only: PASS');
