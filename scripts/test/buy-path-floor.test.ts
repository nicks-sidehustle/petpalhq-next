/**
 * BUY PATH FLOOR — the in-repo canary.
 *
 * Owner, 2026-09-09 ~8:40am PT (portfolio-wide, scope addendum 8:47am):
 *
 *   "We always want products on guides and review pages to have either a direct
 *    link or a direct search results link."
 *
 * Every product card on every guide, in EVERY state — LIVE, DARK, deferred,
 * no-ASIN — carries a cookie-setting link: the exact `/go/{ASIN}` → `/dp/` page
 * when an ASIN exists, a direct Amazon search-results link when none does. A
 * card with no link at all is a defect: the click is what sets the 24h
 * whole-cart cookie, so a card nobody can click earns nothing. The baseline the
 * ruling was made against was 200 link-less cards on 147 guides portfolio-wide.
 *
 * Five jobs:
 *   1. VOCABULARY MUTATION. The withdrawn availability phrases (owner,
 *      2026-09-08 ~10:45pm PT) are each matched by the gate's own regex, and the
 *      price note that STAYS is not. A guard whose vocabulary does not match the
 *      mechanism is a guard that passes on the defect it names.
 *   2. THE FLOOR. Every rendered pick corpus-wide carries a buy path.
 *   3. DESTINATION. Each buy path resolves, through the SAME function the /go/
 *      route uses, to a real Amazon destination: /dp/{ASIN} for an ASIN, /s?k=
 *      for a search phrase — never to amazon.com with an empty term.
 *   4. TAG (P5). Every destination carries the guide's own resolved tracking
 *      tag, from the same resolver the route calls. A buy path that sets the
 *      wrong site's cookie is worse than none.
 *   5. VACUITY. The corpus actually has cards, and at least one of each buy-path
 *      shape is exercised — otherwise jobs 2-4 pass by reading nothing.
 *
 * Run: npx tsx scripts/test/buy-path-floor.test.ts
 */
import { getAllGuides } from '../../src/lib/guides';
import { buildAmazonDest } from '../../src/lib/go-destination';
import { resolveTagForSlug } from '../../src/config/tracking-ids';

/** Mirrors AVAILABILITY_VOCABULARY in snapshot-availability-gate.test.ts. */
const AVAILABILITY_VOCABULARY =
  /\b(unavailable|out of stock|no featured offer|no longer available|sold out|back ?order(ed)?|in[- ]stock)\b/i;

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) return;
  failures++;
  console.error(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
}

// --- job 1: vocabulary mutation ------------------------------------------
// Each phrase the owner withdrew must be CAUGHT. If someone narrows the regex,
// this list is what fails first.
for (const phrase of [
  'Currently unavailable on Amazon — checked 2026-09-08',
  'No longer available on Amazon — delisted',
  'This item is out of stock',
  'No featured offer on this listing',
  'Sold out at Amazon',
  'On backorder at Amazon',
  'The backordered variant ships in October',
  'Ships later than in-stock items',
]) {
  check(`withdrawn phrase must be caught: ${JSON.stringify(phrase)}`, AVAILABILITY_VOCABULARY.test(phrase));
}
// …and the note that STAYS must not be. The owner kept it explicitly: it is
// about price, not availability.
for (const kept of [
  "Amazon's price may vary; check the current price.",
  'Check price',
  'List price · iRobot · verified 2026-09-07',
  'Last Amazon read 2026-09-08',
  'Ships on a delay — Amazon takes the order now and sends it later than a normal order. Checked 2026-09-08.',
]) {
  check(`kept copy must NOT be caught: ${JSON.stringify(kept)}`, !AVAILABILITY_VOCABULARY.test(kept));
}

// --- jobs 2-5: the corpus -------------------------------------------------
let cards = 0;
let asinPaths = 0;
let searchPaths = 0;
const linklessByGuide = new Map<string, string[]>();
const searchRows: string[] = [];

for (const guide of getAllGuides()) {
  for (const pick of guide.picks ?? []) {
    cards++;
    const id = pick.buyPathId;
    if (!id) {
      const rows = linklessByGuide.get(guide.slug) ?? [];
      rows.push(`#${pick.rank} ${pick.name}`);
      linklessByGuide.set(guide.slug, rows);
      continue;
    }
    // The /go/ route receives the DECODED path segment (Next decodes params),
    // then hands it to buildAmazonDest — so decode here to test what the route
    // actually resolves, not what the anchor spells.
    const tag = resolveTagForSlug(guide.slug);
    const dest = buildAmazonDest(decodeURIComponent(id), undefined, tag);
    const isAsin = /^[A-Z0-9]{10}$/.test(id);
    if (isAsin) {
      asinPaths++;
      check(
        `${guide.slug}/#${pick.rank} ASIN buy path must resolve to the exact product page`,
        dest.startsWith(`https://www.amazon.com/dp/${id}?`),
        dest,
      );
    } else {
      searchPaths++;
      searchRows.push(`${guide.slug}  #${pick.rank}  ${decodeURIComponent(id)}`);
      const k = /\/s\?k=([^&]+)&/.exec(dest);
      check(
        `${guide.slug}/#${pick.rank} ASIN-less buy path must resolve to Amazon search results`,
        !!k,
        dest,
      );
      check(
        `${guide.slug}/#${pick.rank} search buy path must carry a real search term`,
        !!k && decodeURIComponent(k[1]).trim().length > 2,
        dest,
      );
    }
    check(
      `${guide.slug}/#${pick.rank} buy path must carry this guide's own tracking tag (P5)`,
      dest.includes(`tag=${tag}`) && !!tag,
      dest,
    );
    check(
      `${guide.slug}/#${pick.rank} buy path must never leak the CLL position params to Amazon`,
      !/[?&](s|p)=/.test(dest),
      dest,
    );
  }
}

for (const [slug, rows] of linklessByGuide) {
  for (const row of rows) {
    check(
      `${slug} ${row} renders as a card with NO buy path — every card, in every state, carries a ` +
        `cookie-setting link (owner 2026-09-09 ~8:40am PT)`,
      false,
    );
  }
}

// --- job 5: vacuity -------------------------------------------------------
check('the corpus must actually contain cards', cards > 0, String(cards));
check('at least one ASIN buy path must be exercised', asinPaths > 0, String(asinPaths));

const linklessCards = [...linklessByGuide.values()].reduce((n, r) => n + r.length, 0);
console.log(
  `buy-path-floor census: ${linklessCards} link-less card(s) on ${linklessByGuide.size} guide(s); ` +
    `${cards} cards read (${asinPaths} exact /dp/, ${searchPaths} /s?k= search).`,
);
if (searchRows.length) {
  console.log('  search-link cards (the bridge until §8qq rule 3 replaces the slot):');
  for (const r of searchRows) console.log(`    ${r}`);
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('buy-path-floor: PASS');
