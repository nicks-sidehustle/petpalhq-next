/**
 * Regression test — Creators API savingBasis extraction (2026-09-01/02
 * owner PRICE-BASIS ruling, RUNBOOK.md:1175).
 *
 * The Creators API `price` field is the BUY-BOX price, never the list/typical
 * price. `price.savingBasis` (LIST_PRICE / WAS_PRICE) is the only field that
 * carries a list/typical price, and only when Amazon includes one on the
 * listing. This pins:
 *
 *  1. extractSavingBasis() (src/lib/amazon-api.ts) reads the LIST_PRICE shape.
 *  2. extractSavingBasis() reads the WAS_PRICE shape.
 *  3. extractSavingBasis() returns all-null when the listing has no
 *     savingBasis at all — never guessed, never backfilled.
 *  4. applyFetchResults() (scripts/sync-amazon-prices.ts) persists the three
 *     fields on a successful fetch.
 *  5. applyFetchResults() leaves a RETAINED (stale) entry byte-for-byte
 *     untouched — the Issue #91 guarantee must not regress under this change.
 *
 * Run: npx tsx scripts/test/creators-saving-basis.test.ts
 * (wired into `npm run validate:content` and `npm run test:creators-saving-basis`)
 */
import { extractSavingBasis } from '../../src/lib/amazon-api';
import { applyFetchResults, type FetchOutcome, type PriceCache } from '../sync-amazon-prices';

let failures = 0;
function check(label: string, ok: boolean) {
  if (!ok) {
    failures++;
    console.error(`  FAIL: ${label}`);
  }
}

// ---------------------------------------------------------------------------
// 1. LIST_PRICE basis present
// ---------------------------------------------------------------------------
{
  const item = {
    asin: 'B0LISTPRICE',
    offersV2: {
      listings: [
        {
          price: {
            money: { displayAmount: '$969.99' },
            savingBasis: {
              money: { displayAmount: '$1,499.00' },
              savingBasisType: 'LIST_PRICE',
            },
            savings: { percentage: 35 },
          },
        },
      ],
    },
  };
  const result = extractSavingBasis(item);
  check('LIST_PRICE: listPrice extracted', result.listPrice === '$1,499.00');
  check('LIST_PRICE: listPriceBasis extracted', result.listPriceBasis === 'LIST_PRICE');
  check('LIST_PRICE: savingsPercent extracted', result.savingsPercent === 35);
}

// ---------------------------------------------------------------------------
// 2. WAS_PRICE basis present (older shape: bare displayAmount + `type`)
// ---------------------------------------------------------------------------
{
  const item = {
    asin: 'B0WASPRICE',
    offersV2: {
      listings: [
        {
          price: {
            displayAmount: '$41.99',
            savingBasis: {
              displayAmount: '$59.99',
              type: 'WAS_PRICE',
            },
            savings: { percentage: 30 },
          },
        },
      ],
    },
  };
  const result = extractSavingBasis(item);
  check('WAS_PRICE: listPrice extracted (bare displayAmount fallback)', result.listPrice === '$59.99');
  check('WAS_PRICE: listPriceBasis extracted (type fallback)', result.listPriceBasis === 'WAS_PRICE');
  check('WAS_PRICE: savingsPercent extracted', result.savingsPercent === 30);
}

// ---------------------------------------------------------------------------
// 3. No savingBasis at all -> all-null, never guessed
// ---------------------------------------------------------------------------
{
  const item = {
    asin: 'B0NOBASIS',
    offersV2: {
      listings: [
        {
          price: { money: { displayAmount: '$19.99' } },
        },
      ],
    },
  };
  const result = extractSavingBasis(item);
  check('no basis: listPrice is null', result.listPrice === null);
  check('no basis: listPriceBasis is null', result.listPriceBasis === null);
  check('no basis: savingsPercent is null', result.savingsPercent === null);
}

// Empty item (no listings at all) must not throw and must return all-null.
{
  const result = extractSavingBasis({ asin: 'B0EMPTY' });
  check('empty item: listPrice is null', result.listPrice === null);
  check('empty item: listPriceBasis is null', result.listPriceBasis === null);
  check('empty item: savingsPercent is null', result.savingsPercent === null);
}

// ---------------------------------------------------------------------------
// 4. applyFetchResults() persists the three fields on a successful fetch
// ---------------------------------------------------------------------------
{
  const previousCache: PriceCache = {};
  const results: FetchOutcome[] = [
    {
      asin: 'B0SUCCESS1',
      ok: true,
      result: {
        asin: 'B0SUCCESS1',
        price: '$969.99',
        currency: 'USD',
        availability: 'IN_STOCK',
        merchantId: 'ATVPDKIKX0DER',
        merchantName: 'Amazon.com',
        lastChecked: '2026-09-02T12:00:00.000Z',
        listPrice: '$1,499.00',
        listPriceBasis: 'LIST_PRICE',
        savingsPercent: 35,
      },
    },
  ];
  const { output, succeeded } = applyFetchResults(previousCache, results);
  check('applyFetchResults: success count', succeeded === 1);
  check('applyFetchResults: listPrice persisted', output['B0SUCCESS1']?.listPrice === '$1,499.00');
  check('applyFetchResults: listPriceBasis persisted', output['B0SUCCESS1']?.listPriceBasis === 'LIST_PRICE');
  check('applyFetchResults: savingsPercent persisted', output['B0SUCCESS1']?.savingsPercent === 35);
}

// Success with no basis on this read persists explicit nulls (not omitted) —
// distinguishes "checked, no list price" from "never checked" on rows written
// before this field existed.
{
  const previousCache: PriceCache = {};
  const results: FetchOutcome[] = [
    {
      asin: 'B0NOBASIS2',
      ok: true,
      result: {
        asin: 'B0NOBASIS2',
        price: '$19.99',
        currency: 'USD',
        availability: 'IN_STOCK',
        merchantId: null,
        merchantName: null,
        lastChecked: '2026-09-02T12:00:00.000Z',
        listPrice: null,
        listPriceBasis: null,
        savingsPercent: null,
      },
    },
  ];
  const { output } = applyFetchResults(previousCache, results);
  check('applyFetchResults: listPrice explicit null (key present)', 'listPrice' in (output['B0NOBASIS2'] ?? {}));
  check('applyFetchResults: listPrice value is null', output['B0NOBASIS2']?.listPrice === null);
}

// ---------------------------------------------------------------------------
// 5. A RETAINED (stale) entry stays byte-for-byte untouched — Issue #91
//    guarantee must not regress under this change.
// ---------------------------------------------------------------------------
{
  const previousCache: PriceCache = {
    B0RETAIN1: {
      price: '$29.99',
      lastChecked: '2026-08-25T00:00:00.000Z',
      availability: 'IN_STOCK',
      merchantId: 'ATVPDKIKX0DER',
      merchantName: 'Amazon.com',
      listPrice: '$34.99',
      listPriceBasis: 'WAS_PRICE',
      savingsPercent: 14,
    },
  };
  const results: FetchOutcome[] = [
    { asin: 'B0RETAIN1', ok: false, error: 'GetItems failed 500 for ASIN B0RETAIN1: simulated' },
  ];
  const { output, retained } = applyFetchResults(previousCache, results);
  check('applyFetchResults: retained count', retained === 1);
  check('applyFetchResults: retained entry marked stale', output['B0RETAIN1']?.stale === true);
  check(
    'applyFetchResults: retained entry price/basis fields untouched',
    output['B0RETAIN1']?.price === '$29.99' &&
      output['B0RETAIN1']?.listPrice === '$34.99' &&
      output['B0RETAIN1']?.listPriceBasis === 'WAS_PRICE' &&
      output['B0RETAIN1']?.savingsPercent === 14,
  );
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('creators-saving-basis: PASS');
