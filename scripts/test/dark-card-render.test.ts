/**
 * DARK-CARD RENDER RULES — executable spec for the owner's emergency ruling of
 * 2026-09-07 (~21:00 PT, reinforced ~22:45 PT).
 *
 * PREVIEW SKIP (2026-09-24, gates-streamline): package.json validate:content
 * skips this file when VERCEL_ENV=preview (it is one of the two slowest
 * prebuild specs). It still runs in full on production builds, local builds
 * and CI.
 *
 * The 2026-09-07 ruling in one line: a card the availability gates would have
 * removed keeps its card and its /go/ link. Suppression is the last resort.
 *
 * OWNER RULINGS 2026-09-24 narrow what such a card prints:
 *   - a maker/brand-sourced price figure is NEVER displayed (Associates §2(b));
 *   - "Dark cards show no figure — only the Amazon buy path." The last-dated-
 *     Amazon-read rung is gone too. A dark card prints NO figure, NO chip, NO
 *     disclosure; only a fresh live-New override (live evidence the listing is
 *     not dark) re-lights a gated pick with Amazon's own figure.
 * Cases (c) (d) (f) (g) (h) (i) now assert figure-less dark cards; (m) proves a
 * listPrice block is inert; (n) is the mutation-style sweep that no dark card
 * emits a $ figure, in the resolver or on the real corpus.
 *
 * Cases (letters follow the lane brief):
 *   a  buyable + everything else present   -> mode buyable, nothing else changes
 *   b  unbuyable + fresh override          -> override; Amazon figure, readAt
 *                                             chip, InStock JSON-LD, NO seller,
 *                                             isAmazonSold irrelevant/false
 *   c  override 15 days old                -> falls through to figure-less
 *   d  unbuyable + maker listPrice block   -> NO figure (figure-less dark card)
 *   e  listPrice partial / <=0 / amazon.com-> validator ERROR
 *   f  unbuyable, snapshot has a price     -> NO figure (was lastRead)
 *   g  …no snapshot price, frontmatter one -> NO figure (was lastRead)
 *   h  no figure anywhere                  -> suppressed (figure-less), logged
 *   i  override AND listPrice              -> override wins; without the
 *                                             override, NO figure
 *   j  gate parity: an override-re-lit pick is not a prose-gate violation; a
 *      suppressed one still is
 *   k  a live-verification claim counts only live-priced picks
 *   l  §8rr.2 HELD ROW vs FRESHER LIVE READ (incident C2, 2026-09-08):
 *      l1 buyable + HELD + fresh live-New override -> override figure
 *      l2 buyable + NOT held + override            -> buyable, byte-identical
 *      l3 buyable + HELD + override 8 days old     -> buyable (held row stays)
 *      l4 buyable + HELD + no override             -> buyable
 *   m  2026-09-24 inertness: attaching a maker listPrice block never changes
 *      the verdict for any input, and no corpus pick prints a maker figure
 *   o  comparison cells are POSITIONAL: a blanked ("") cell keeps every later
 *      value under its own pick (W4 HOLD on PR #188)
 *   n  2026-09-24 no-figure sweep: every non-buyable, non-override verdict
 *      carries no price/chip/disclosure for any input; every corpus dark card
 *      renders price '' with its buy path intact
 *
 * Run: npx tsx scripts/test/dark-card-render.test.ts
 */
import fs from 'fs';
import path from 'path';
import {
  resolveDarkCardFigure,
  isRelitMode,
  isHeldSnapshotRow,
  isRenderableLiveNewOverride,
  getLiveReadOverride,
  recordDarkCardSuppression,
  darkCardSuppressionSummary,
  formatFigure,
  OVERRIDE_MAX_AGE_DAYS,
  type LiveReadOverride,
  type DarkCardPickInput,
} from '../../src/lib/dark-card';
import { isAmazonSold, isSnapshotUnbuyable, getSnapshotEntry, type SnapshotEntry } from '../../src/lib/price-cache';
import { buildPickProductReviewGraph } from '../../src/lib/schema';
import { getAllGuides } from '../../src/lib/guides';
import matter from 'gray-matter';
import { scanCorpus } from './unbuyable-prose-gate.test';
import { listPriceErrors } from '../lib/list-price-shape.mjs';

let failures = 0;
function check(label: string, ok: boolean, extra = '') {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}${extra ? `\n         ${extra}` : ''}`);
  }
}

const NOW = new Date('2026-09-08T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

// ---------------------------------------------------------------------------
// The 2-entry live-read override FIXTURE, shaped exactly like PR #164's
// data/live-read-overrides.json. `readAt` is stamped relative to NOW at load
// time: a pinned timestamp would quietly age past the ceiling and case (b)
// would stop exercising rule 1 while still reporting PASS. The ceiling itself
// is read from OVERRIDE_MAX_AGE_DAYS (7 since 2026-09-08, was 14) so this file
// never has to be re-tuned when the window moves — but the 6d/8d pair in case
// (c) is pinned in absolute days on purpose: that is the window the ruling
// names, and a purely relative test would still pass at 14.
// ---------------------------------------------------------------------------
const FIXTURE_PATH = path.join(process.cwd(), 'scripts/test/fixtures/live-read-overrides.fixture.json');
const fixture: Record<string, LiveReadOverride> = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
const FRESH_OVERRIDE: LiveReadOverride = { ...fixture.B0FRESHNEW1, readAt: daysAgo(2) };
const STALE_OVERRIDE: LiveReadOverride = { ...fixture.B0STALENEW1, readAt: daysAgo(15) };
check(
  'fixture carries two override rows in the PR #164 shape',
  typeof FRESH_OVERRIDE.price === 'number' &&
    FRESH_OVERRIDE.condition === 'New' &&
    typeof STALE_OVERRIDE.price === 'number',
);
check(
  `stale fixture row is older than the ${OVERRIDE_MAX_AGE_DAYS}-day ceiling`,
  (NOW.getTime() - Date.parse(STALE_OVERRIDE.readAt!)) / 86_400_000 > OVERRIDE_MAX_AGE_DAYS,
);

// A complete, formerly-valid maker list-price block. Since the 2026-09-24
// ruling the renderer has no input for it; `withMakerBlock` smuggles it onto a
// pick the way raw frontmatter would, to prove it is ignored.
const LIST_PRICE = {
  amount: 899.99,
  currency: 'USD',
  sourceUrl: 'https://www.irobot.com/en_US/roomba-j9plus.html',
  sourceLabel: 'iRobot',
  verifiedAt: '2026-09-08',
};
const MAKER_FIGURE = '$899.99';
const withMakerBlock = (p: DarkCardPickInput, block: unknown = LIST_PRICE): DarkCardPickInput =>
  ({ ...p, listPrice: block }) as unknown as DarkCardPickInput;

const buyableRow: SnapshotEntry = {
  price: '$129.99',
  lastChecked: '2026-09-06T02:00:00Z',
  availability: 'IN_STOCK',
  merchantId: 'ATVPDKIKX0DER',
  merchantName: 'Amazon.com',
};
const deadPricedRow: SnapshotEntry = {
  price: '$41.99',
  lastChecked: '2026-08-10T02:54:02.446Z',
  availability: 'OUT_OF_STOCK',
};
const deadPricelessRow: SnapshotEntry = {
  price: null,
  lastChecked: '2026-08-23T02:54:02.446Z',
  availability: 'OUT_OF_STOCK',
};

const darkPick = { asin: 'B0DARKPICK', price: '$28.99', guideDate: '2026-08-23' };

// ---------------------------------------------------------------------------
// (a) A WORKING CARD IS UNTOUCHED — owner rule 5, "only the dark cards".
// ---------------------------------------------------------------------------
{
  const r = resolveDarkCardFigure(
    withMakerBlock(darkPick),
    buyableRow,
    FRESH_OVERRIDE,
    NOW,
  );
  check('(a) buyable snapshot wins over EVERY other input', r.mode === 'buyable', JSON.stringify(r));
  check(
    '(a) a buyable verdict carries no figure, no chip and no disclosure — the caller takes ' +
      'exactly today\'s code path',
    r.price === undefined && r.chip === undefined && r.disclosure === undefined,
    JSON.stringify(r),
  );
  // Same on the real corpus: no working card may acquire dark-card fields.
  let buyableWithChip = 0;
  let gatedPicks = 0;
  for (const g of getAllGuides()) {
    for (const p of g.picks ?? []) {
      if ((p.darkCardMode && isRelitMode(p.darkCardMode)) || p.suppressionReason) {
        gatedPicks++;
        continue;
      }
      if (p.priceDisclosure || p.priceSourceChip || p.darkCardMode) buyableWithChip++;
    }
  }
  check(
    `(a) no working card in the corpus gained a dark-card field (${buyableWithChip} found)`,
    buyableWithChip === 0,
  );
  check(`(a) …and the assertion is not vacuous (${gatedPicks} gated picks exist)`, gatedPicks > 0);
}

// ---------------------------------------------------------------------------
// (b) FRESH OVERRIDE — a live page read IS a source (rule 4).
// ---------------------------------------------------------------------------
{
  const r = resolveDarkCardFigure(darkPick, deadPricelessRow, FRESH_OVERRIDE, NOW);
  check('(b) fresh New override wins', r.mode === 'override', JSON.stringify(r));
  check('(b) the figure is the override\'s own Amazon price', r.price === formatFigure(129.95));
  check(
    '(b) the chip carries the readAt date, not the snapshot date',
    r.chip === `Current Amazon price · checked ${FRESH_OVERRIDE.readAt!.slice(0, 10)}`,
    r.chip,
  );
  check('(b) the source is Amazon', r.sourceLabel === 'Amazon');

  // JSON-LD, wired the way src/app/guides/[slug]/page.tsx wires it.
  const graph = buildPickProductReviewGraph({
    productName: 'Fixture Widget',
    url: 'https://petpalhq.com/guides/x#fixture-widget',
    affiliateUrl: 'https://petpalhq.com/go/B0DARKPICK',
    hasVerifiableOffer: true,
    omitAvailability: false, // override mode: a live read IS a stock signal
    omitSeller: true,
    price: 129.95,
    reviewBody: 'body',
    datePublished: '2026-09-01',
  }) as Record<string, unknown>;
  const product = (graph as { '@graph'?: unknown[] })['@graph']
    ? ((graph as { '@graph': unknown[] })['@graph'].find(
        (n) => (n as Record<string, unknown>)['@type'] === 'Product',
      ) as Record<string, unknown>)
    : (graph as Record<string, unknown>);
  const offer = product.offers as Record<string, unknown> | undefined;
  check('(b) JSON-LD emits an Offer', !!offer, JSON.stringify(product).slice(0, 200));
  check(
    '(b) JSON-LD availability is InStock (a live read backs it)',
    offer?.availability === 'https://schema.org/InStock',
    JSON.stringify(offer),
  );
  check('(b) JSON-LD Offer carries the override price', offer?.price === '129.95');
  check(
    '(b) JSON-LD asserts NO seller — the override deliberately ignores merchant',
    offer !== undefined && !('seller' in offer),
    JSON.stringify(offer),
  );
  check(
    '(b) seller logic is untouched: the price-less dead row is not Amazon-sold',
    isAmazonSold(deadPricelessRow) === false,
  );
  check(
    '(b) …and an override whose merchant says Amazon still does not make the SNAPSHOT ' +
      'Amazon-sold — the two are separate facts',
    FRESH_OVERRIDE.merchant === 'Amazon.com' && isAmazonSold(deadPricelessRow) === false,
  );
}

// ---------------------------------------------------------------------------
// (c) A STALE OVERRIDE FALLS THROUGH — instrument opinions expire.
// ---------------------------------------------------------------------------
{
  const r = resolveDarkCardFigure(darkPick, deadPricedRow, STALE_OVERRIDE, NOW);
  check('(c) a 15-day-old override does not win', r.mode !== 'override', JSON.stringify(r));
  check('(c) …it falls through to a figure-less dark card (2026-09-24)', r.mode === 'suppressed', JSON.stringify(r));
  check('(c) …which prints no figure — not the snapshot\'s last price', r.price === undefined && r.chip === undefined);
  // Boundary: exactly at the ceiling it still counts.
  const atCeiling = resolveDarkCardFigure(
    darkPick,
    deadPricedRow,
    { ...FRESH_OVERRIDE, readAt: daysAgo(OVERRIDE_MAX_AGE_DAYS - 0.01) },
    NOW,
  );
  check(`(c) an override exactly ${OVERRIDE_MAX_AGE_DAYS} days old still counts`, atCeiling.mode === 'override');

  // THE 7-DAY WINDOW, IN ABSOLUTE DAYS (owner ruling 2026-09-08, §8rr.3).
  // Pinned as 6 and 8 rather than relative to the constant: the same override
  // row now also authorises scripts/sync-amazon-prices.ts to write a row
  // unbuyable, so widening this window back to 14 would let a week-old receipt
  // take a card dark. A relative assertion would pass at any width.
  check(
    '(g) the render window is 7 days — the same one the sync releases holds on',
    OVERRIDE_MAX_AGE_DAYS === 7,
    `OVERRIDE_MAX_AGE_DAYS=${OVERRIDE_MAX_AGE_DAYS}`,
  );
  const sixDays = resolveDarkCardFigure(darkPick, deadPricedRow, { ...FRESH_OVERRIDE, readAt: daysAgo(6) }, NOW);
  check('(g) a 6-day-old override is ACCEPTED', sixDays.mode === 'override', JSON.stringify(sixDays));
  const eightDays = resolveDarkCardFigure(darkPick, deadPricedRow, { ...FRESH_OVERRIDE, readAt: daysAgo(8) }, NOW);
  check('(g) an 8-day-old override is REJECTED', eightDays.mode !== 'override', JSON.stringify(eightDays));
  check(
    '(g) …and the 8-day fall-through is a figure-less dark card (card + link kept by guides.ts)',
    eightDays.mode === 'suppressed' && eightDays.price === undefined,
    JSON.stringify(eightDays),
  );
  // A non-New override never counts, at any age.
  const used = resolveDarkCardFigure(
    darkPick,
    deadPricedRow,
    { ...FRESH_OVERRIDE, condition: 'Used' },
    NOW,
  );
  check('(c) a Used-condition override never wins, however fresh', used.mode !== 'override');
}

// ---------------------------------------------------------------------------
// (d) MAKER LIST PRICE BLOCK — withdrawn by owner ruling 2026-09-24
// (Associates §2(b)). A frontmatter `listPrice` block yields NO figure: the
// card is a figure-less dark card ("Check price" + /go/ link).
// ---------------------------------------------------------------------------
{
  const r = resolveDarkCardFigure(withMakerBlock(darkPick), deadPricelessRow, null, NOW);
  check('(d) a listPrice block does NOT produce a listPrice mode', (r.mode as string) !== 'listPrice', JSON.stringify(r));
  check('(d) a listPrice block never prints the maker amount', r.price !== MAKER_FIGURE, r.price);
  check(
    '(d) no chip names the maker or says "List price"',
    !String(r.chip ?? '').startsWith('List price') && !String(r.chip ?? '').includes('iRobot'),
    r.chip,
  );
  check(
    '(d) …it is a figure-less dark card — not even the frontmatter price prints',
    r.mode === 'suppressed' && r.price === undefined && r.chip === undefined && r.disclosure === undefined,
    JSON.stringify(r),
  );
  const priced = resolveDarkCardFigure(withMakerBlock(darkPick), deadPricedRow, null, NOW);
  check(
    '(d) with a dated snapshot price present, still NO figure',
    priced.mode === 'suppressed' && priced.price === undefined,
    JSON.stringify(priced),
  );
  // JSON-LD for a figure-less dark card, wired the way page.tsx wires it
  // (suppressionReason set -> hasVerifiableOffer false, price undefined): the
  // Product/Review still emit, the Offer does not.
  const graph = buildPickProductReviewGraph({
    productName: 'Fixture Widget',
    url: 'https://petpalhq.com/guides/x#fixture-widget',
    affiliateUrl: 'https://petpalhq.com/go/B0DARKPICK',
    hasVerifiableOffer: false,
    price: undefined,
    reviewBody: 'body',
    datePublished: '2026-09-01',
  }) as Record<string, unknown>;
  const product = ((graph as { '@graph'?: unknown[] })['@graph']?.find(
    (n) => (n as Record<string, unknown>)['@type'] === 'Product',
  ) ?? graph) as Record<string, unknown>;
  check('(d) JSON-LD still emits the Product', !!product && product['@type'] === 'Product');
  check('(d) JSON-LD emits NO Offer for a figure-less dark card', !('offers' in product), JSON.stringify(product.offers));
}

// ---------------------------------------------------------------------------
// (e) listPrice is a RETIRED field (2026-09-24) — the validator errors on ANY
// block, complete or not. (The renderer's own shape check is asserted here
// until the render-side removal lands.)
// ---------------------------------------------------------------------------
{
  const bad: Array<[string, unknown]> = [
    ['partial (no sourceUrl)', { amount: 10, currency: 'USD', sourceLabel: 'X', verifiedAt: '2026-09-08' }],
    ['amount 0', { ...LIST_PRICE, amount: 0 }],
    ['amount negative', { ...LIST_PRICE, amount: -5 }],
    ['amazon.com sourceUrl', { ...LIST_PRICE, sourceUrl: 'https://www.amazon.com/dp/B0DARKPICK' }],
    ['amazon.co.uk sourceUrl', { ...LIST_PRICE, sourceUrl: 'https://www.amazon.co.uk/dp/B0DARKPICK' }],
    ['verifiedAt not a date', { ...LIST_PRICE, verifiedAt: 'yesterday' }],
    ['not an object', 'https://www.irobot.com/'],
  ];
  for (const [why, value] of bad) {
    check(
      `(e) renderer prints no figure from listPrice: ${why}`,
      resolveDarkCardFigure(withMakerBlock({ asin: 'B0DARKPICK' }, value), deadPricelessRow, null, NOW).mode ===
        'suppressed',
    );
    const errs = listPriceErrors('fixture-guide', [{ rank: 1, name: 'Fixture', listPrice: value }]);
    check(`(e) validator ERRORS on listPrice: ${why}`, errs.length > 0, JSON.stringify(errs));
  }
  check(
    '(e) the validator ERRORS on a COMPLETE, formerly-valid maker block too',
    listPriceErrors('fixture-guide', [{ rank: 1, name: 'Fixture', listPrice: LIST_PRICE }]).length === 1,
  );
  check(
    '(e) …and is silent on a pick with no listPrice key',
    listPriceErrors('fixture-guide', [{ rank: 1, name: 'Fixture', price: '$10.00' }]).length === 0,
  );
  check(
    '(e) a COMPLETE block renders no figure either (2026-09-24) — only Amazon figures print',
    resolveDarkCardFigure(withMakerBlock({ asin: 'B0DARKPICK' }), deadPricelessRow, null, NOW).mode ===
      'suppressed',
  );
}

// ---------------------------------------------------------------------------
// (f) LAST DATED AMAZON READ, snapshot branch — WITHDRAWN 2026-09-24.
// ---------------------------------------------------------------------------
{
  const r = resolveDarkCardFigure(darkPick, deadPricedRow, null, NOW);
  check('(f) a priced-but-unbuyable snapshot row does NOT re-light the card', r.mode === 'suppressed', JSON.stringify(r));
  check('(f) the snapshot price is NOT printed', r.price === undefined, r.price);
  check('(f) no "Last Amazon read" chip', r.chip === undefined, r.chip);
  check('(f) no price-may-vary disclosure (there is no figure to caveat)', r.disclosure === undefined);
}

// ---------------------------------------------------------------------------
// (g) LAST DATED AMAZON READ, frontmatter branch — WITHDRAWN 2026-09-24.
// ---------------------------------------------------------------------------
{
  const r = resolveDarkCardFigure(darkPick, deadPricelessRow, null, NOW);
  check('(g) a dated frontmatter price does NOT re-light the card', r.mode === 'suppressed', JSON.stringify(r));
  check('(g) the frontmatter price is NOT printed', r.price === undefined && r.chip === undefined, JSON.stringify(r));
  const hardGated = resolveDarkCardFigure({ ...darkPick, hardGated: true }, null, null, NOW);
  check(
    '(g) a dead-asins hard-gated pick with a dated figure is figure-less too',
    hardGated.mode === 'suppressed' && hardGated.price === undefined,
  );
}

// ---------------------------------------------------------------------------
// (h) NO FIGURE ANYWHERE — today's behaviour, and it is logged.
// ---------------------------------------------------------------------------
{
  const r = resolveDarkCardFigure({ asin: 'B0NOFIGURE', price: '', guideDate: '' }, deadPricelessRow, null, NOW);
  check('(h) no dated figure anywhere -> suppressed', r.mode === 'suppressed', JSON.stringify(r));
  check('(h) a suppressed verdict prints nothing', r.price === undefined && r.chip === undefined);
  const noDate = resolveDarkCardFigure({ asin: 'B0NOFIGURE', price: '$10.00', guideDate: '' }, deadPricelessRow, null, NOW);
  check(
    '(h) a frontmatter price with NO date is not a dated figure — an undated price is the ' +
      'false-freshness class, so it suppresses',
    noDate.mode === 'suppressed',
  );
  recordDarkCardSuppression('fixture-guide', 9, 'B0NOFIGURE');
  const summary = darkCardSuppressionSummary();
  check('(h) the suppression is collected into the build-time log line', summary.includes('B0NOFIGURE'), summary);
  check('(h) the log line carries a count', /figure-less dark cards \(buy path only\): \d+ picks/.test(summary), summary);
}

// ---------------------------------------------------------------------------
// (i) PRECEDENCE ORDER — override, else no figure; a listPrice block is inert.
// ---------------------------------------------------------------------------
{
  const both = resolveDarkCardFigure(
    withMakerBlock(darkPick),
    deadPricedRow,
    FRESH_OVERRIDE,
    NOW,
  );
  check('(i) override wins over listPrice', both.mode === 'override', JSON.stringify(both));
  check('(i) …and prints the override figure, not the maker one', both.price === '$129.95', both.price);
  const noOverride = resolveDarkCardFigure(
    withMakerBlock(darkPick),
    deadPricedRow,
    null,
    NOW,
  );
  check(
    '(i) without an override NO figure prints — not the maker one, not the last Amazon read',
    noOverride.mode === 'suppressed' && noOverride.price === undefined,
    JSON.stringify(noOverride),
  );
}

// ---------------------------------------------------------------------------
// (j) GATE PARITY — a re-lit pick is not a prose violation; a suppressed one is.
// ---------------------------------------------------------------------------
{
  const prose = 'The Zephyrine Quantalux 7700 Widget is the one to buy for big runs.';
  const suppressedPick = { name: 'Zephyrine Quantalux 7700 Widget', brand: 'Zephyrine', price: '$99.00', rank: 2 };
  const suppressedGuide = [{
    slug: 'fixture-parity-suppressed', shortAnswer: '', content: '', bottomLine: [prose],
    picks: [{ name: 'Acme Riverstone 9000 Widget', brand: 'Acme', price: '$10.00', available: true, rank: 1 }],
    suppressedPicks: [suppressedPick],
  }] as unknown[];
  check(
    '(j) a SUPPRESSED pick named in prose is still flagged',
    scanCorpus(suppressedGuide as never).some((f) => f.detector === 'D1'),
  );

  // Same guide, same prose — but the precedence re-lit the pick. It is a live,
  // linked, priced card now, so the prose is correct and must not be flagged.
  for (const mode of ['override'] as const) {
    const relitGuide = [{
      slug: `fixture-parity-${mode}`, shortAnswer: '', content: '', bottomLine: [prose],
      picks: [{ name: 'Acme Riverstone 9000 Widget', brand: 'Acme', price: '$10.00', available: true, rank: 1 }],
      suppressedPicks: [{ ...suppressedPick, darkCardMode: mode, priceSourceChip: 'Current Amazon price · checked 2026-08-10' }],
    }] as unknown[];
    check(
      `(j) a pick re-lit in mode ${mode} is NOT flagged`,
      scanCorpus(relitGuide as never).length === 0,
      JSON.stringify(scanCorpus(relitGuide as never).map((f) => `${f.detector}:${f.phrase}`)),
    );
  }
}

// ---------------------------------------------------------------------------
// (k) LIVE-VERIFICATION CLAIMS COUNT ONLY LIVE-PRICED PICKS — W4 MAJOR 2a.
//
// `{{pickCountWord}}` updating is correct; the defect was that it sat inside
// "All four picks were verified live on Amazon, with the exact listing and its
// current price confirmed, as of <hand-typed date>" on two guides whose roster
// now includes re-lit picks — picks captioned, three lines below, "Last Amazon
// read 2026-08-07" and "Amazon's price may vary". The page asserted live
// verification of exactly the figures its own cards disclaim.
//
// Fixed at the source: `buyablePickCount` excludes re-lit picks, and the whole
// sentence is a derived token (`{{livePriceNote}}`) dated from the guide's own
// lastProductCheck. Both directions are asserted here.
// ---------------------------------------------------------------------------
{
  const collect = (v: unknown, out: string[] = []): string[] => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => collect(x, out));
    else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach((x) => collect(x, out));
    return out;
  };
  // "All N picks were verified live …" — the claim that must never coexist with
  // a re-lit pick. Deliberately matches the CLAIM SHAPE, not the two sentences
  // that shipped it, so a new guide cannot reintroduce it in fresh wording.
  const ALL_LIVE = /\ball\s+(?:\w+|\d+)\s+picks?\s+(?:were|are)\s+verified live\b/i;
  const LIVE_CONFIRMED = /\b(?:every product|all picks)[^.]{0,80}\bverified live on Amazon\b/i;
  let guardedGuides = 0;
  let honestVariants = 0;
  for (const g of getAllGuides()) {
    // Not live-priced: an override re-lit card (dated live read) or a
    // figure-less dark card (2026-09-24).
    const relit = (g.picks ?? []).filter(
      (p) => (p.darkCardMode && isRelitMode(p.darkCardMode)) || p.suppressionReason,
    ).length;
    const strings = collect(g);
    if (relit > 0) {
      guardedGuides++;
      // One check per guide, not per string — a per-string check would print
      // several thousand ok lines and bury the gate's real output.
      const bad = strings.filter((str) => ALL_LIVE.test(str) || LIVE_CONFIRMED.test(str));
      check(
        `(k) ${g.slug} has ${relit} re-lit pick(s) but still carries ${bad.length} ` +
          `live-verification claim(s) over figures its own cards disclaim` +
          (bad.length ? `: ${JSON.stringify(bad[0].slice(0, 120))}` : ''),
        bad.length === 0,
      );
      // buyablePickCount is the count such a claim would use: it must exclude
      // the re-lit picks, or the claim is false by construction.
      check(
        `(k) ${g.slug}: buyablePickCount (${g.buyablePickCount}) must exclude its ${relit} re-lit ` +
          `pick(s) — pickCount is ${g.pickCount}`,
        g.buyablePickCount <= g.pickCount - relit,
      );
    }
    if (strings.some((str) => /picks carry a live Amazon price/.test(str))) honestVariants++;
  }
  check(`(k) …and the sweep is not vacuous (${guardedGuides} guides carry a re-lit pick)`, guardedGuides > 0);
  check(
    `(k) the honest variant actually renders somewhere (${honestVariants} guides)`,
    honestVariants > 0,
  );
  // Pinned: the two guides the verifier named.
  for (const slug of ['best-dog-cooling-vests-mats-2026', 'how-to-keep-your-dog-cool-and-prevent-heatstroke-2026']) {
    const g = getAllGuides().find((x) => x.slug === slug);
    check(`(k) fixture guide ${slug} exists`, !!g);
    if (!g) continue;
    const method = String(g.reviewMethod ?? '');
    check(
      `(k) ${slug} renders the honest variant, dated from lastProductCheck`,
      /Two of four picks carry a live Amazon price as of \d{4}-\d{2}-\d{2}/.test(method),
      method.slice(-160),
    );
    check(`(k) ${slug} leaves no unresolved token`, !/\{\{[A-Za-z]/.test(method), method.slice(-160));
  }
}

// ---------------------------------------------------------------------------
// (l) A HELD SNAPSHOT ROW YIELDS TO A FRESHER LIVE READ — §8rr.2.
//
// INCIDENT C2 (2026-09-08 ledger adjudication). AI Nero 3 B08KZT7SMQ printed
// $189.99 on best-reef-wavemakers-powerheads-2026 from a snapshot row last
// CONFIRMED 2026-09-03, whose unbuyable flip #160/#171's two-read hysteresis was
// holding (`pendingUnbuyableSince` set, prior values retained). A live page read
// the same day saw $179.99, New, in stock, and wrote it to
// data/live-read-overrides.json — and rule 0 returned "buyable" for the held row
// before precedence ever looked at the override, so the reader got a five-day-old
// API figure over a same-day live one.
//
// §8rr.2 gives precedence to the newer successful read and ranks a live-page read
// above an API read; §8qq.2 forbids an API figure outright when a live-page
// figure exists for a held/dark card. So the override prints.
//
// The scope guard is the other half of the spec: a row that is NOT held is a
// plainly-buyable card and no override may touch it (owner rule 1/5).
// ---------------------------------------------------------------------------
{
  /** The incident's shape: last CONFIRMED read is buyable and stale, flip held. */
  const heldRow: SnapshotEntry = {
    price: '$189.99',
    lastChecked: '2026-09-03T00:55:01.267Z',
    availability: 'IN_STOCK',
    merchantId: 'A3CC7LJAEVAF74',
    merchantName: 'Leap Habitats',
    pendingUnbuyableSince: '2026-09-08T18:45:18.657Z',
    lastReadAt: '2026-09-08T18:45:18.657Z',
  };
  /** Same row, flip already resolved — an ordinary working card. */
  const notHeldRow: SnapshotEntry = { ...heldRow };
  delete notHeldRow.pendingUnbuyableSince;
  delete notHeldRow.lastReadAt;
  const liveOverride: LiveReadOverride = {
    price: 179.99,
    currency: 'USD',
    availability: 'IN_STOCK',
    merchant: 'unknown',
    condition: 'New',
    readAt: daysAgo(0.2),
    source: 'https://www.amazon.com/dp/B08KZT7SMQ',
  };
  const neroPick = { asin: 'B08KZT7SMQ', price: '$189.99', guideDate: '2026-09-03' };

  // The premises the incident turns on — asserted, not assumed.
  check('(l) the held row is still BUYABLE to every gate', isSnapshotUnbuyable(heldRow) === false);
  check('(l) …and is recognised as HELD', isHeldSnapshotRow(heldRow) === true);
  check('(l) the resolved row is not held', isHeldSnapshotRow(notHeldRow) === false);
  check('(l) a row with a blank marker is not held', isHeldSnapshotRow({ ...heldRow, pendingUnbuyableSince: '  ' }) === false);
  check('(l) a null marker is not held', isHeldSnapshotRow({ ...heldRow, pendingUnbuyableSince: null }) === false);
  check('(l) no snapshot row at all is not held', isHeldSnapshotRow(null) === false);
  check(
    '(l) the live read is NEWER than the held row\'s last confirmed read',
    Date.parse(liveOverride.readAt!) > Date.parse(heldRow.lastChecked),
  );

  // --- l1: the fix.
  const l1 = resolveDarkCardFigure(neroPick, heldRow, liveOverride, NOW);
  check('(l1) held row + fresh live-New override -> mode override', l1.mode === 'override', JSON.stringify(l1));
  check('(l1) the figure is the LIVE price, not the held API price', l1.price === '$179.99', l1.price);
  check('(l1) …and is not the stale figure the incident printed', l1.price !== '$189.99');
  check('(l1) the chip is the readAt provenance chip', l1.chip === `Current Amazon price · checked ${liveOverride.readAt!.slice(0, 10)}`, l1.chip);
  check('(l1) sourceLabel is Amazon — the figure came off Amazon\'s own page', l1.sourceLabel === 'Amazon');
  check(
    '(l1) NO price-may-vary disclosure: an override IS Amazon\'s live price (§8qq rule 1)',
    l1.disclosure === undefined,
    String(l1.disclosure),
  );
  check('(l1) override is a re-lit mode, so the card and the /go/ link stay', isRelitMode(l1.mode) === true);
  check(
    '(l1) the seller of record is omitted — an override is a page read, not a Buy-Box capture',
    !('merchant' in l1) && !('merchantName' in l1),
  );

  // --- l2: SCOPE. A plainly-buyable row is untouched, byte for byte.
  const l2 = resolveDarkCardFigure(neroPick, notHeldRow, liveOverride, NOW);
  check('(l2) NOT held + the same fresh override -> buyable', l2.mode === 'buyable', JSON.stringify(l2));
  check(
    '(l2) …and the verdict is byte-identical to the no-override verdict',
    JSON.stringify(l2) === JSON.stringify(resolveDarkCardFigure(neroPick, notHeldRow, null, NOW)),
    JSON.stringify(l2),
  );
  check(
    '(l2) …carrying no figure, chip or disclosure — today\'s code path exactly',
    l2.price === undefined && l2.chip === undefined && l2.disclosure === undefined,
  );

  // --- l3: the 7-day ceiling still governs. An expired read adds nothing.
  const stale = { ...liveOverride, readAt: daysAgo(8) };
  check(
    `(l3) an override ${OVERRIDE_MAX_AGE_DAYS + 1}d old cannot supersede a held row`,
    isRenderableLiveNewOverride(stale, NOW) === false,
  );
  const l3 = resolveDarkCardFigure(neroPick, heldRow, stale, NOW);
  check('(l3) held row + 8-day-old override -> buyable, the held row stays', l3.mode === 'buyable', JSON.stringify(l3));
  check(
    '(l3) …byte-identical to the no-override verdict — an expired instrument opinion removes and adds nothing',
    JSON.stringify(l3) === JSON.stringify(resolveDarkCardFigure(neroPick, heldRow, null, NOW)),
  );
  const atCeiling = resolveDarkCardFigure(neroPick, heldRow, { ...liveOverride, readAt: daysAgo(OVERRIDE_MAX_AGE_DAYS - 0.01) }, NOW);
  check(`(l3) an override just inside the ${OVERRIDE_MAX_AGE_DAYS}d window still supersedes`, atCeiling.mode === 'override');
  const future = resolveDarkCardFigure(neroPick, heldRow, { ...liveOverride, readAt: daysAgo(-1) }, NOW);
  check('(l3) a FUTURE-dated read is clock skew, never fresher evidence', future.mode === 'buyable');

  // --- l4: no override at all.
  const l4 = resolveDarkCardFigure(neroPick, heldRow, null, NOW);
  check('(l4) held row + no override -> buyable', l4.mode === 'buyable', JSON.stringify(l4));
  check('(l4) …and prints nothing of its own', l4.price === undefined && l4.chip === undefined);

  // --- Non-New / dark-state overrides are the SYNC's business (#171), not the
  // card's. They must not supersede a held row here, and they must not suppress
  // it either (§8rr: an instrument never removes a page element).
  for (const dark of ['unavailable', 'used-only', 'not-found', 'Used']) {
    const r = resolveDarkCardFigure(neroPick, heldRow, { ...liveOverride, condition: dark }, NOW);
    check(`(l) a "${dark}" override neither prints nor removes — the held row stays`, r.mode === 'buyable', JSON.stringify(r));
  }
  check(
    '(l) a zero/negative override price is not a figure',
    isRenderableLiveNewOverride({ ...liveOverride, price: 0 }, NOW) === false &&
      isRenderableLiveNewOverride({ ...liveOverride, price: -5 }, NOW) === false,
  );

  // --- CORPUS INVARIANT. Self-neutralising: it asserts nothing when no held row
  // currently carries a fresh live read, and catches the incident class the
  // moment one does.
  const offenders: string[] = [];
  const relitHeld: string[] = [];
  for (const g of getAllGuides()) {
    for (const p of g.picks ?? []) {
      if (!p.asin) continue;
      const row = getSnapshotEntry(p.asin);
      if (!isHeldSnapshotRow(row)) continue;
      if (!isRenderableLiveNewOverride(getLiveReadOverride(p.asin), new Date())) continue;
      const label = `${g.slug}#${p.rank} ${p.asin}`;
      if (p.darkCardMode === 'override') relitHeld.push(`${label} -> ${p.price}`);
      else offenders.push(`${label} mode=${String(p.darkCardMode)} price=${p.price} row=${row?.price}`);
    }
  }
  check(
    `(l) corpus: every held row with a fresh live read prints the live figure ` +
      `(${relitHeld.length} such pick(s))`,
    offenders.length === 0,
    offenders.join('; '),
  );
  if (relitHeld.length) console.log(`       held rows printing their live read: ${relitHeld.join(', ')}`);
}

// ---------------------------------------------------------------------------
// (m) INERTNESS — owner ruling 2026-09-24 (Associates §2(b)). Mutation-style:
// attaching a maker listPrice block to ANY pick, under ANY snapshot/override
// combination, must leave the verdict byte-identical to the same pick without
// it. Re-introducing a maker rung anywhere in the ladder flips at least one of
// these (the dead-priceless + no-override + no-frontmatter cell alone would go
// suppressed -> listPrice).
// ---------------------------------------------------------------------------
{
  const rows: Array<[string, SnapshotEntry | null, boolean]> = [
    ['buyable', buyableRow, false],
    ['dead-priced', deadPricedRow, false],
    ['dead-priceless', deadPricelessRow, false],
    ['hard-gated/no-row', null, true],
  ];
  const overrides: Array<[string, LiveReadOverride | null]> = [
    ['none', null],
    ['stale', STALE_OVERRIDE],
    ['fresh', FRESH_OVERRIDE],
  ];
  const picks: Array<[string, DarkCardPickInput]> = [
    ['frontmatter-priced', darkPick],
    ['no-frontmatter-figure', { asin: 'B0DARKPICK', price: '', guideDate: '' }],
  ];
  let cells = 0;
  const diverged: string[] = [];
  for (const [rn, row, hard] of rows) {
    for (const [on, ov] of overrides) {
      for (const [pn, base] of picks) {
        cells++;
        const pick = { ...base, hardGated: hard };
        const without = resolveDarkCardFigure(pick, row, ov, NOW);
        const withBlock = resolveDarkCardFigure(withMakerBlock(pick), row, ov, NOW);
        if (
          JSON.stringify(without) !== JSON.stringify(withBlock) ||
          withBlock.price === MAKER_FIGURE ||
          String(withBlock.chip ?? '').startsWith('List price')
        ) {
          diverged.push(`${rn}/${on}/${pn}: ${JSON.stringify(without)} vs ${JSON.stringify(withBlock)}`);
        }
      }
    }
  }
  check(
    `(m) a maker listPrice block changes no verdict across ${cells} input cells`,
    diverged.length === 0,
    diverged.join('; '),
  );

  // Real corpus: no rendered pick carries a maker figure or a "List price" chip.
  const makerOnCorpus: string[] = [];
  for (const g of getAllGuides()) {
    for (const p of [...(g.picks ?? []), ...(g.suppressedPicks ?? [])]) {
      if (
        (p.darkCardMode as string | undefined) === 'listPrice' ||
        String(p.priceSourceChip ?? '').startsWith('List price') ||
        'listPrice' in (p as object)
      ) {
        makerOnCorpus.push(`${g.slug}#${p.rank} ${p.asin ?? ''}`);
      }
    }
  }
  check(
    `(m) corpus: no pick renders a maker list-price figure (${makerOnCorpus.length} found)`,
    makerOnCorpus.length === 0,
    makerOnCorpus.join(', '),
  );
}

// ---------------------------------------------------------------------------
// (o) COMPARISON CELLS ARE POSITIONAL (W4 round-1 HOLD on PR #188, BLOCKER 1).
// GuideComparisonTable renders comparison.rows[].values[i] under picks[i]. The
// parser used to drop "" cells, so blanking one dark-pick price shifted every
// later value one column left (a dark IceCap showed the Fiji Cube's price).
// Asserted against RAW frontmatter over the whole corpus, plus the two rows
// the verifier named, pinned cell by cell. Fails on the filtering parser.
// ---------------------------------------------------------------------------
{
  const misaligned: string[] = [];
  let rowsChecked = 0;
  let blankCells = 0;
  const guidesDir = path.join(process.cwd(), 'src/content/guides');
  for (const g of getAllGuides()) {
    const file = path.join(guidesDir, `${g.slug}.md`);
    if (!g.comparison?.rows?.length || !fs.existsSync(file)) continue;
    const raw = matter(fs.readFileSync(file, 'utf8')).data?.comparison?.rows;
    if (!Array.isArray(raw)) continue;
    const rawRows = raw.filter((r: Record<string, unknown>) => r && r.label);
    g.comparison.rows.forEach((row, ri) => {
      const rawValues = Array.isArray(rawRows[ri]?.values) ? rawRows[ri].values : [];
      rowsChecked++;
      rawValues.forEach((v: unknown, ci: number) => {
        const want = v === undefined || v === null ? '' : String(v);
        if (want === '') blankCells++;
        if ((row.values[ci] ?? '') !== want) {
          misaligned.push(`${g.slug} "${row.label}" col ${ci}: raw ${JSON.stringify(want)} rendered ${JSON.stringify(row.values[ci])}`);
        }
      });
    });
  }
  check(
    `(o) every comparison cell stays under its own pick (${rowsChecked} rows, ${blankCells} blank cells)`,
    misaligned.length === 0,
    misaligned.slice(0, 6).join('; '),
  );
  check('(o) …and the sweep exercises at least one blank cell', blankCells > 0);

  const rowOf = (slug: string, label: string) =>
    getAllGuides().find((x) => x.slug === slug)?.comparison?.rows.find((r) => r.label === label)?.values ?? [];
  const sumps = rowOf('best-reef-aquarium-sumps-refugiums-2026', 'Listed price at time of check');
  check(
    '(o) reef sumps price row: dark cols 1/3/4 blank, live cols 0/2 keep their own figures',
    JSON.stringify(sumps) === JSON.stringify(['$262.85', '', '$404.99', '', '']),
    JSON.stringify(sumps),
  );
  const moms = rowOf('best-mothers-day-gifts-pet-moms-2026', 'Price (list)');
  check(
    '(o) mothers-day price row: dark cols 6/8 blank, cols 7/9 keep $129.00/$229.95',
    moms.length === 10 && moms[6] === '' && moms[7] === '$129.00' && moms[8] === '' && moms[9] === '$229.95',
    JSON.stringify(moms),
  );
}

// ---------------------------------------------------------------------------
// (n) NO FIGURE ON ANY DARK CARD — owner ruling 2026-09-24, "Dark cards show no
// figure — only the Amazon buy path." Mutation-style, both layers:
//   resolver: across every snapshot row x override x pick-input cell (with and
//     without a maker block), any verdict that is neither "buyable" nor
//     "override" must carry no price, chip, disclosure, and no "$" anywhere.
//     Re-adding the lastRead rung (or any other figure rung) fails the
//     dead-priced / frontmatter-priced cells.
//   corpus: every gated pick that is not override-re-lit renders price '' with
//     no chip/disclosure, keeps its /go/ buy path, and the count is non-zero.
// ---------------------------------------------------------------------------
{
  const rows: Array<[string, SnapshotEntry | null, boolean]> = [
    ['dead-priced', deadPricedRow, false],
    ['dead-priceless', deadPricelessRow, false],
    ['hard-gated/no-row', null, true],
    ['hard-gated/buyable-row', buyableRow, true],
    ['hard-gated/dead-priced', deadPricedRow, true],
  ];
  const overrides: Array<[string, LiveReadOverride | null]> = [
    ['none', null],
    ['stale', STALE_OVERRIDE],
    ['used', { ...FRESH_OVERRIDE, condition: 'Used' }],
    ['dark-state', { ...FRESH_OVERRIDE, price: null, condition: 'unavailable' }],
  ];
  const inputs: Array<[string, DarkCardPickInput]> = [
    ['frontmatter-priced', darkPick],
    ['frontmatter-priced+maker', withMakerBlock(darkPick)],
    ['no-frontmatter-figure', { asin: 'B0DARKPICK', price: '', guideDate: '' }],
  ];
  let cells = 0;
  const leaks: string[] = [];
  for (const [rn, row, hard] of rows) {
    for (const [on, ov] of overrides) {
      for (const [pn, base] of inputs) {
        cells++;
        const r = resolveDarkCardFigure({ ...base, hardGated: hard }, row, ov, NOW);
        if (
          r.mode !== 'suppressed' ||
          r.price !== undefined ||
          r.chip !== undefined ||
          r.disclosure !== undefined ||
          JSON.stringify(r).includes('$')
        ) {
          leaks.push(`${rn}/${on}/${pn}: ${JSON.stringify(r)}`);
        }
      }
    }
  }
  check(`(n) no dark verdict emits a figure across ${cells} dark input cells`, leaks.length === 0, leaks.join('; '));
  // The one gated verdict allowed a figure is a FRESH live-New override.
  const live = resolveDarkCardFigure(darkPick, deadPricedRow, FRESH_OVERRIDE, NOW);
  check('(n) …and a fresh live-New override still re-lights with Amazon\'s figure', live.mode === 'override' && live.price === '$129.95');

  const figured: string[] = [];
  const noBuyPath: string[] = [];
  let darkCards = 0;
  for (const g of getAllGuides()) {
    for (const p of g.picks ?? []) {
      if (!p.suppressionReason) continue;
      darkCards++;
      const label = `${g.slug}#${p.rank} ${p.asin ?? ''}`;
      if (p.price !== '' || p.priceSourceChip || p.priceDisclosure || p.darkCardMode) {
        figured.push(`${label} price=${JSON.stringify(p.price)} chip=${p.priceSourceChip ?? ''}`);
      }
      if (!p.buyPathId) noBuyPath.push(label);
    }
  }
  check(`(n) corpus: dark cards showing a figure = ${figured.length} (of ${darkCards})`, figured.length === 0, figured.slice(0, 10).join('; '));
  check(`(n) corpus: every dark card keeps its /go/ buy path (${noBuyPath.length} missing)`, noBuyPath.length === 0, noBuyPath.join(', '));
  check(`(n) …and the sweep is not vacuous (${darkCards} dark cards)`, darkCards > 0);
}

console.log('');
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('dark-card-render: PASS');
