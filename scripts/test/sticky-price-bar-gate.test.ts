/**
 * Gate-Zero regression test for the guide sticky check-price bar.
 *
 * Locks the one thing that matters about this surface: a persistent, always-on
 * "Check price" CTA must never appear over a guide whose #1 pick cannot
 * actually be bought. The bar is decided entirely by resolveStickyBarPick(),
 * so this test drives that function directly — synthetic cases for each gate,
 * then a sweep over the REAL guide corpus asserting the invariant holds on
 * every published guide.
 *
 * Run: `npx tsx scripts/test/sticky-price-bar-gate.test.ts`
 *      (`--report` also prints the per-guide render/no-render tally).
 */
import {
  resolveStickyBarPick,
  STICKY_BAR_SUBTAG,
} from '../../src/lib/sticky-price-bar';
import { getAllSlugs, getGuideBySlug, type GuidePick } from '../../src/lib/guides';
import { isResolvableAsin } from '../../src/lib/price-cache';

let failures = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failures++;
  }
}

function pick(over: Partial<GuidePick> = {}): GuidePick {
  return {
    rank: 1,
    label: 'Best overall',
    name: 'PetSafe Stay + Play Wireless Fence',
    brand: 'PetSafe',
    score: 8.7,
    price: '$329.95',
    image: '/images/products/x.jpg',
    asin: 'B00LWA6HD8',
    keyFeatures: [],
    body: '',
    bodyHtml: '',
    pros: [],
    cons: [],
    verdict: '',
    ...over,
  } as GuidePick;
}

console.log('\n1. Gate — renders only for a live, priced, /go/-able #1 pick');

const ok = resolveStickyBarPick([pick()], 'best-gps-wireless-dog-fences-2026');
check('renders for a live priced ASIN pick', ok !== null);
check(
  'href is the internal /go/ indirection with the standard subtag pattern',
  ok?.href === `/go/B00LWA6HD8?st=${STICKY_BAR_SUBTAG}&s=best-gps-wireless-dog-fences-2026&p=${STICKY_BAR_SUBTAG}`,
);
check('price is carried through verbatim (one price story)', ok?.price === '$329.95');
check('no amazon.com href is ever rendered', !/amazon\./i.test(ok?.href ?? ''));

check('no picks → no bar', resolveStickyBarPick(undefined, 's') === null);
check('empty picks → no bar', resolveStickyBarPick([], 's') === null);
check(
  'unavailable #1 pick → no bar',
  resolveStickyBarPick([pick({ available: false })], 's') === null,
);
check(
  'no ASIN (direct-sale / quote-based pick) → no bar',
  resolveStickyBarPick([pick({ asin: undefined })], 's') === null,
);
check(
  'search-phrase "ASIN" (not /go/-able to a listing) → no bar',
  resolveStickyBarPick([pick({ asin: 'PetSafe wireless fence' })], 's') === null,
);
check(
  'no resolved price → no bar',
  resolveStickyBarPick([pick({ price: '' })], 's') === null,
);
check(
  'whitespace-only price → no bar',
  resolveStickyBarPick([pick({ price: '   ' })], 's') === null,
);

console.log('\n2. Gate — only the #1 pick is ever promoted');

check(
  'a buyable #2 does NOT rescue an unbuyable #1',
  resolveStickyBarPick(
    [pick({ rank: 1, asin: undefined }), pick({ rank: 2, name: 'Runner-up' })],
    's',
  ) === null,
);
check(
  'rank 1 wins over document order',
  resolveStickyBarPick(
    [pick({ rank: 2, name: 'Runner-up' }), pick({ rank: 1, name: 'Top pick' })],
    's',
  )?.name === 'Top pick',
);

console.log('\n3. Corpus sweep — invariant holds on every published guide');

let rendered = 0;
let suppressed = 0;
const report: string[] = [];

for (const slug of getAllSlugs()) {
  const guide = getGuideBySlug(slug);
  if (!guide) continue;
  const bar = resolveStickyBarPick(guide.picks, slug);
  const top = guide.picks?.find((p) => p.rank === 1) ?? guide.picks?.[0];

  if (bar) {
    rendered++;
    // The invariant: a bar exists ⇒ its #1 pick is live, priced, ASIN-backed,
    // and the bar's price is the SAME string the picks grid renders.
    if (
      !top ||
      top.available === false ||
      !isResolvableAsin(top.asin) ||
      !top.price?.trim() ||
      bar.price !== top.price.trim() ||
      !bar.href.startsWith(`/go/${top.asin}?`)
    ) {
      console.error(`  ✗ ${slug}: bar rendered over a pick that fails the gate`);
      failures++;
    }
  } else {
    suppressed++;
    // The mirror invariant: no bar ⇒ some gate genuinely failed. A guide whose
    // #1 pick clears every condition must not be silently skipped.
    if (
      top &&
      top.available !== false &&
      isResolvableAsin(top.asin) &&
      top.price?.trim()
    ) {
      console.error(`  ✗ ${slug}: gate passes but no bar was resolved`);
      failures++;
    }
  }
  report.push(`${bar ? 'BAR ' : '--- '} ${slug}${bar ? `  ${bar.price}` : ''}`);
}

check(`corpus swept without invariant violations (${rendered} with bar, ${suppressed} without)`, true);
check('at least one guide qualifies (the surface is not dead code)', rendered > 0);
check('at least one guide is gated (the gate is not a no-op)', suppressed > 0);

if (process.argv.includes('--report')) {
  console.log('\n--- per-guide ---');
  for (const line of report.sort()) console.log(line);
}

if (failures) {
  console.error(`\n✗ sticky-price-bar gate: ${failures} failure(s)\n`);
  process.exit(1);
}
console.log('\n✓ sticky-price-bar gate: all checks passed\n');
