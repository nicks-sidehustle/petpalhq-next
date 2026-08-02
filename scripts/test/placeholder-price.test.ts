/**
 * Regression test for the placeholder-price guard (card-blanks fix, 2026-08).
 *
 * Some `picks:` frontmatter entries carried a human-readable placeholder
 * string in `price` (e.g. "Check price") instead of a real formatted price
 * or an empty string. Because the placeholder is truthy, it slipped past
 * FeaturedPicksGrid's `{pick.price && (...)}` guard and rendered literally
 * as the visible price (confirmed exemplars: `best-automatic-chicken-coop-doors-2026`
 * picks "ChickenGuard Automatic Coop Door Opener" / "Run-Chicken Automatic
 * Chicken Coop Door"). `isPlaceholderPrice()` in `src/lib/guides.ts` is the
 * single enforcement point `parsePicks()` routes every pick's price through.
 *
 * Uses Node's native test runner (node:test / node:assert), matching this
 * repo's existing `scripts/asin-image-parity.test.mjs` fixture-test
 * convention. Run via tsx (same mechanism as `scripts/test/go-redirect.test.ts`
 * and `scripts/test/tracking-tag.test.ts`) so the `@/*` path aliases used by
 * `src/lib/guides.ts` resolve:
 *
 *   npx tsx --test scripts/test/placeholder-price.test.ts
 *   (or `npm run test:placeholder-price`)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlaceholderPrice } from '../../src/lib/guides';

test('flags the known placeholder strings found in the frontmatter sweep', () => {
  assert.equal(isPlaceholderPrice('Check price'), true);
  assert.equal(isPlaceholderPrice('Check Amazon'), true);
  assert.equal(isPlaceholderPrice('Verify at retailer'), true);
});

test('is case-insensitive and trims surrounding whitespace', () => {
  assert.equal(isPlaceholderPrice('check price'), true);
  assert.equal(isPlaceholderPrice('CHECK PRICE'), true);
  assert.equal(isPlaceholderPrice('  Check price  '), true);
  assert.equal(isPlaceholderPrice('cHeCk AmAzOn'), true);
});

test('does not flag real formatted prices', () => {
  assert.equal(isPlaceholderPrice('$57.99'), false);
  assert.equal(isPlaceholderPrice('$1,199.00'), false);
});

test('does not flag an absent price (blank/undefined/null)', () => {
  assert.equal(isPlaceholderPrice(''), false);
  assert.equal(isPlaceholderPrice(undefined), false);
  assert.equal(isPlaceholderPrice(null), false);
});

test('does not flag arbitrary non-placeholder strings', () => {
  assert.equal(isPlaceholderPrice('See listing for price'), false);
  assert.equal(isPlaceholderPrice('Check current price'), false);
});
