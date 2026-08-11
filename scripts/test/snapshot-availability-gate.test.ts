/**
 * §8m snapshot availability gate — regression check (2026-08-10 price-desync triage).
 *
 * Two jobs:
 *  1. Pin the predicate's vocabulary: AVAILABLE_DATE / OUT_OF_STOCK / UNAVAILABLE
 *     gate; IN_STOCK / IN_STOCK_SCARCE / LEADTIME / missing do NOT. Gating a
 *     scarce or leadtime ASIN would fabricate an OutOfStock claim on a real,
 *     working conversion path.
 *  2. Assert no live guide pick ships a Buy CTA while the price snapshot says
 *     the ASIN has no buyable offer — i.e. every snapshot-unbuyable pick has
 *     been forced `available: false` by parsePicks.
 *
 * Run: npx tsx scripts/test/snapshot-availability-gate.test.ts
 */
import { getAllGuides } from '../../src/lib/guides';
import { getSiteWideProductMap } from '../../src/lib/guide-links';
import {
  getCachedPrice,
  isUnbuyableAvailability,
  snapshotUnavailableLabel,
} from '../../src/lib/price-cache';

let failures = 0;
function check(label: string, ok: boolean) {
  if (!ok) {
    failures++;
    console.error(`  FAIL: ${label}`);
  }
}

// 1. Predicate vocabulary
for (const gated of ['AVAILABLE_DATE', 'OUT_OF_STOCK', 'UNAVAILABLE', 'available_date']) {
  check(`${gated} must gate`, isUnbuyableAvailability(gated) === true);
}
for (const open of ['IN_STOCK', 'IN_STOCK_SCARCE', 'LEADTIME', 'in_stock_scarce']) {
  check(`${open} must NOT gate`, isUnbuyableAvailability(open) === false);
}
for (const empty of [undefined, null, '']) {
  check(`${String(empty)} must NOT gate`, isUnbuyableAvailability(empty) === false);
}

// 2. Live corpus: every snapshot-unbuyable pick is gated
const rows: string[] = [];
const asins = new Set<string>();
for (const guide of getAllGuides()) {
  for (const pick of guide.picks ?? []) {
    const cached = getCachedPrice(pick.asin);
    if (!cached || !isUnbuyableAvailability(cached.availability)) continue;
    asins.add(pick.asin!);
    rows.push(
      `${guide.slug}  ${pick.asin}  ${cached.availability}  ${cached.price}  available=${pick.available}  label=${pick.guardLabel ?? '(none)'}`,
    );
    check(
      `${guide.slug}/${pick.asin} must be forced unavailable`,
      pick.available === false,
    );
    check(
      `${guide.slug}/${pick.asin} must carry an honest-state label`,
      typeof pick.guardLabel === 'string' && pick.guardLabel.length > 0,
    );
    check(
      `${guide.slug}/${pick.asin} must NOT claim delisted`,
      !/delisted/i.test(pick.guardLabel ?? '') || pick.guardStatus === 'dead',
    );
  }
}

// 3. Cross-guide leak: no snapshot-unbuyable ASIN may survive in the site-wide
//    auto-link map (a guide that merely MENTIONS the product in prose must not
//    emit a live /go/ CTA for it).
const siteWide = getSiteWideProductMap();
for (const asin of asins) {
  const leaked = [...siteWide.entries()].filter(([, url]) => url === `/go/${asin}`);
  check(
    `${asin} must not remain in the site-wide auto-link map (keys: ${leaked.map(([k]) => k).join(', ')})`,
    leaked.length === 0,
  );
}

console.log(rows.join('\n'));
console.log(`\nSnapshot-gated pick rows: ${rows.length} across ${asins.size} distinct ASINs`);
console.log(`Sample label: ${snapshotUnavailableLabel({ price: '$1', lastChecked: '2026-08-10T02:54:02.446Z', availability: 'AVAILABLE_DATE' })}`);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('snapshot-availability-gate: PASS');
