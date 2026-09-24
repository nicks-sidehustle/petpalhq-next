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
// GATE PARITY — owner rulings 2026-09-07 / 2026-09-24 (dark-card figures).
//
// Since 2026-09-24 a dark card prints NO figure ("Dark cards show no figure —
// only the Amazon buy path"). The only gated pick that prints a figure is a
// fresh live-read override, and that figure must be a real price — never a
// placeholder and never blank. Every other gated pick must print '' — never a
// placeholder string standing where a price would be.
// ---------------------------------------------------------------------------
test('gated picks: an override prints a real figure; a dark card prints nothing', () => {
  let darkCards = 0;
  for (const guide of getAllGuides()) {
    for (const pick of guide.picks ?? []) {
      if (pick.darkCardMode && pick.darkCardMode !== 'buyable') {
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
      } else if (pick.suppressionReason) {
        darkCards++;
        assert.equal(
          pick.price,
          '',
          `${guide.slug}/${pick.asin ?? pick.name} is a dark card but prints ${JSON.stringify(pick.price)}`,
        );
      }
    }
  }
  // Vacuity: the dark-card half must have something to check.
  assert.ok(darkCards > 0, 'no dark cards in the corpus — the no-figure assertion is vacuous');
});

test('a placeholder is not a figure: the precedence suppresses rather than printing it', () => {
  const dark = { asin: 'B000000000', hardGated: true, guideDate: '2026-09-01' };
  assert.equal(resolveDarkCardFigure({ ...dark, price: 'Check price' }, null, null).mode, 'suppressed');
  // 2026-09-24: a real dated frontmatter figure no longer re-lights either.
  assert.equal(resolveDarkCardFigure({ ...dark, price: '$57.99' }, null, null).mode, 'suppressed');
  // …and the same on the snapshot branch.
  const snap = { price: 'Check price', lastChecked: '2026-09-01T00:00:00Z', availability: 'OUT_OF_STOCK' };
  assert.equal(resolveDarkCardFigure({ ...dark, price: '' }, snap, null).mode, 'suppressed');
});
