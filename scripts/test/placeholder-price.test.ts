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
import { isPlaceholderPrice, getAllGuides } from '../../src/lib/guides';
import { resolveDarkCardFigure } from '../../src/lib/dark-card';

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

// ---------------------------------------------------------------------------
// GATE PARITY — owner emergency ruling 2026-09-07 (dark-card figures).
//
// The ruling puts a figure back on cards that used to render nothing, and the
// only thing standing between "a dated, sourced price" and "the literal words
// Check price on a money card" is that the precedence routes its rule-3
// fallbacks through isPlaceholderPrice(). So the gate asserts it at the level
// that matters: the same function the renderer calls, over the real corpus.
//
// Direction matters here. A placeholder is not a figure, so a pick whose only
// candidate price is "Check price" must come back SUPPRESSED, not re-lit with
// a placeholder printed where a price belongs.
// ---------------------------------------------------------------------------
test('the dark-card precedence never re-lights a card with a placeholder figure', () => {
  const relitPrices: string[] = [];
  for (const guide of getAllGuides()) {
    for (const pick of guide.picks ?? []) {
      if (!pick.darkCardMode || pick.darkCardMode === 'buyable') continue;
      relitPrices.push(pick.price);
      assert.equal(
        isPlaceholderPrice(pick.price),
        false,
        `${guide.slug}/${pick.asin ?? pick.name} is re-lit (mode=${pick.darkCardMode}) but its ` +
          `figure is the placeholder ${JSON.stringify(pick.price)}`,
      );
      assert.ok(
        pick.price.trim().length > 0,
        `${guide.slug}/${pick.asin ?? pick.name} is re-lit but prints a BLANK figure`,
      );
    }
  }
  // Vacuity: if nothing is re-lit the assertions above pass over an empty set.
  assert.ok(relitPrices.length > 0, 'no re-lit picks in the corpus — parity assertion is vacuous');
});

test('a placeholder is not a figure: the precedence suppresses rather than printing it', () => {
  const dark = { asin: 'B000000000', hardGated: true, guideDate: '2026-09-01' };
  assert.equal(resolveDarkCardFigure({ ...dark, price: 'Check price' }, null, null).mode, 'suppressed');
  assert.equal(resolveDarkCardFigure({ ...dark, price: '$57.99' }, null, null).mode, 'lastRead');
  // …and the same on the snapshot branch.
  const snap = { price: 'Check price', lastChecked: '2026-09-01T00:00:00Z', availability: 'OUT_OF_STOCK' };
  assert.equal(resolveDarkCardFigure({ ...dark, price: '' }, snap, null).mode, 'suppressed');
});
