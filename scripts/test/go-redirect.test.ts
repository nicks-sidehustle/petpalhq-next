/**
 * Click-integrity regression test for the CLL /go/ position layer (E-000).
 *
 * Locks the §7 failure mode "instrumentation drift breaking click-integrity":
 * the first-party position params (`s`, `p`) that the render layer appends to
 * `/go/{id}` hrefs must be consumed SERVER-SIDE and NEVER forwarded to
 * amazon.com. The only Amazon-side params allowed on the outbound URL are the
 * affiliate `tag` and (when a placement subtag exists) `ascsubtag`.
 *
 * Run: `npx tsx scripts/test/go-redirect.test.ts` (wired into `validate:content`).
 *
 * Uses only the pure, Next-free modules the real route depends on, mirroring the
 * route's own param handling (subtag = ascsubtag||st; s/p read separately and
 * never passed into buildAmazonDest).
 */
import { buildAmazonDest } from '../../src/lib/go-destination';
import { buildGoHref } from '../../src/lib/affiliate-href';

const TAG = 'petpalhq08-20';
let failures = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failures++;
  }
}

/**
 * Reproduces the route: given a rendered /go href, split off the id + the params
 * the route actually reads, and resolve the Amazon destination the same way.
 */
function resolveFromHref(href: string): string {
  const [path, query] = href.split('?');
  const id = path.replace(/^\/go\//, '');
  const sp = new URLSearchParams(query);
  const subtag = sp.get('ascsubtag') || sp.get('st') || undefined;
  return buildAmazonDest(decodeURIComponent(id), subtag, TAG);
}

function assertNoLeak(label: string, dest: string, slug: string, position: string) {
  check(`${label}: goes to amazon.com`, dest.startsWith('https://www.amazon.com'));
  check(`${label}: carries affiliate tag`, dest.includes(`tag=${TAG}`));
  check(`${label}: no s= param forwarded`, !/[?&]s=/.test(dest));
  check(`${label}: no p= param forwarded`, !/[?&]p=/.test(dest));
  check(`${label}: slug value not leaked`, !dest.includes(slug));
  check(`${label}: position value not leaked`, !dest.includes(position));
}

console.log('go-redirect click-integrity test:');

// 1. Pick-rank ASIN link (position = rank).
{
  const slug = 'best-dog-cameras';
  const position = '3';
  const href = buildGoHref('B0ABCDEFGH', slug, position);
  check('1: tagged href has s=', /[?&]s=best-dog-cameras/.test(href));
  check('1: tagged href has p=', /[?&]p=3/.test(href));
  assertNoLeak('1', resolveFromHref(href), slug, position);
}

// 2. Inline link with a placement subtag (st) present — ascsubtag must forward,
//    s/p must not.
{
  const slug = 'best-cat-litter';
  const position = 'inline';
  const href = `${buildGoHref('B0ZZZZZZZZ', slug, position)}&st=guide-deep-dive`;
  const dest = resolveFromHref(href);
  assertNoLeak('2', dest, slug, position);
  check('2: placement subtag forwarded as ascsubtag', dest.includes('ascsubtag=guide-deep-dive'));
}

// 3. Search-term id (non-ASIN) path.
{
  const slug = 'best-aquarium-heater';
  const position = 'inline';
  const href = buildGoHref('automatic%20fish%20feeder', slug, position);
  const dest = resolveFromHref(href);
  assertNoLeak('3', dest, slug, position);
  check('3: search path used', dest.includes('/s?k='));
}

// 4. Defense-in-depth: even a raw dest built directly never contains s/p.
{
  const dest = buildAmazonDest('B0QWERTYUI', undefined, TAG);
  check('4: buildAmazonDest emits only tag', dest === `https://www.amazon.com/dp/B0QWERTYUI?tag=${TAG}`);
}

if (failures > 0) {
  console.error(`\ngo-redirect test FAILED (${failures} assertion(s)).`);
  process.exit(1);
}
console.log('\ngo-redirect test passed — s/p never forwarded to Amazon.');
