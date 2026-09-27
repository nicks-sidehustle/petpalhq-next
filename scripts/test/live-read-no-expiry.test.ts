/**
 * LIVE READS DO NOT EXPIRE — owner ruling 2026-09-26.
 *
 *   "The newest live read (data/live-read-overrides.json, written by
 *    scripts/record-live-read.ts) stays authoritative for its ASIN until a
 *    NEWER live read replaces it; the card's dated 'checked <date>' stamp shows
 *    its age."
 *
 * Retires the §8rr.3 7-day window. Every case below FAILS on the pre-ruling
 * code (origin/main at 052c4f9), where a live read older than 7 days was
 * ignored, a live-New read could not touch a buyable snapshot row, and a live
 * unavailable read could not darken a card on its own:
 *
 *   (a) a 60-day-old live-New read still renders its price, stamped with ITS
 *       readAt date;
 *   (b) a live-New read beats a differing (buyable, not held) snapshot price —
 *       live read primary, the API snapshot is a hint;
 *   (c) a live `unavailable` / `used-only` / `not-found` read darkens a card
 *       whose snapshot row is buyable, with no dead-asins entry — figure-less,
 *       buy path kept (the PR #193 gap);
 *   (d) a newer live read of the same ASIN replaces an older one
 *       (record-live-read's applyLiveRead), an older backfill can never replace
 *       a newer read, and the replacing row is what decides the card.
 *
 * Plus the corpus: every rendered pick with a live read of any age shows what
 * that read says, and at least one of each kind exists today.
 *
 * Run: npx tsx scripts/test/live-read-no-expiry.test.ts
 */
import {
  resolveDarkCardFigure,
  getLiveReadOverride,
  isRenderableLiveNewOverride,
  formatFigure,
  type LiveReadOverride,
} from '../../src/lib/dark-card';
import { priceStampText } from '../../src/lib/price-stamp';
import { getSnapshotEntry, isSnapshotUnbuyable, type SnapshotEntry } from '../../src/lib/price-cache';
import { getAllGuides } from '../../src/lib/guides';
import { applyLiveRead, buildLiveReadRow } from '../record-live-read';

let failures = 0;
function check(label: string, ok: boolean, extra = '') {
  if (ok) console.log(`  ok   ${label}`);
  else {
    failures++;
    console.error(`  FAIL ${label}${extra ? `\n         ${extra}` : ''}`);
  }
}

const NOW = new Date('2026-09-26T12:00:00Z');
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();

const buyableRow: SnapshotEntry = {
  price: '$129.99',
  lastChecked: daysAgo(1),
  availability: 'IN_STOCK',
  merchantId: 'ATVPDKIKX0DER',
  merchantName: 'Amazon.com',
};
const pick = { asin: 'B0LIVEREAD', price: '$129.99', guideDate: '2026-09-01' };
const liveNew = (price: number, ageDays: number): LiveReadOverride =>
  buildLiveReadRow({
    asin: 'B0LIVEREAD',
    state: 'live-new',
    price,
    source: 'https://www.amazon.com/dp/B0LIVEREAD',
    merchant: 'Amazon.com',
    readAt: daysAgo(ageDays),
  });
const liveDark = (state: 'unavailable' | 'used-only' | 'not-found', ageDays: number): LiveReadOverride =>
  buildLiveReadRow({
    asin: 'B0LIVEREAD',
    state,
    source: 'https://www.amazon.com/dp/B0LIVEREAD',
    readAt: daysAgo(ageDays),
  });

// ---------------------------------------------------------------------------
// (a) a 60-day-old live-New read still renders its price with its date.
// ---------------------------------------------------------------------------
{
  const old = liveNew(99.5, 60);
  check('(a) a 60-day-old live-New read is renderable', isRenderableLiveNewOverride(old, NOW));
  for (const [name, row] of [
    ['no snapshot row', null],
    ['unbuyable snapshot row', { ...buyableRow, availability: 'OUT_OF_STOCK' }],
    ['buyable snapshot row', buyableRow],
  ] as Array<[string, SnapshotEntry | null]>) {
    const r = resolveDarkCardFigure(pick, row, old, NOW);
    check(`(a) ${name}: a 60-day-old live-New read prints its price`, r.mode === 'override' && r.price === '$99.50', JSON.stringify(r));
    check(
      `(a) ${name}: …stamped with the read's own date (${old.readAt!.slice(0, 10)})`,
      r.date === old.readAt!.slice(0, 10) && r.chip === priceStampText('current', old.readAt!.slice(0, 10)),
      JSON.stringify(r),
    );
  }
  const future = resolveDarkCardFigure(pick, buyableRow, { ...old, readAt: daysAgo(-2) }, NOW);
  check('(a) only a FUTURE-dated read is ignored (clock skew) -> the snapshot card stays', future.mode === 'buyable', JSON.stringify(future));
}

// ---------------------------------------------------------------------------
// (b) a live read beats a differing snapshot price.
// ---------------------------------------------------------------------------
{
  const live = liveNew(119.0, 3);
  const r = resolveDarkCardFigure(pick, buyableRow, live, NOW);
  check('(b) buyable, NOT-held $129.99 snapshot + live-New $119.00 -> the LIVE figure prints', r.mode === 'override' && r.price === '$119.00', JSON.stringify(r));
  check('(b) …and not the API figure', r.price !== buyableRow.price);
  // Even a snapshot row read AFTER the live read does not outrank it: the API
  // is a hint, never a source.
  const newerApi = { ...buyableRow, lastChecked: daysAgo(0.1) };
  const r2 = resolveDarkCardFigure(pick, newerApi, liveNew(119.0, 30), NOW);
  check('(b) a NEWER API row still does not outrank an older live read', r2.mode === 'override' && r2.price === '$119.00', JSON.stringify(r2));
}

// ---------------------------------------------------------------------------
// (c) a live dark read darkens a card whose snapshot row is buyable.
// ---------------------------------------------------------------------------
{
  check('(c) premise: the snapshot row is BUYABLE to every gate', !isSnapshotUnbuyable(buyableRow));
  for (const state of ['unavailable', 'used-only', 'not-found'] as const) {
    for (const age of [1, 17, 90]) {
      const r = resolveDarkCardFigure({ ...pick, hardGated: false }, buyableRow, liveDark(state, age), NOW);
      check(
        `(c) live "${state}" read ${age}d old + buyable snapshot + NO dead-asins entry -> figure-less dark`,
        r.mode === 'suppressed' && r.price === undefined && r.chip === undefined,
        JSON.stringify(r),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// (d) a newer live read of the same ASIN replaces an older one.
// ---------------------------------------------------------------------------
{
  const older = liveNew(50, 20);
  const newer = liveDark('unavailable', 10);
  let file: Record<string, LiveReadOverride> = {};
  file = applyLiveRead(file, 'B0LIVEREAD', older);
  file = applyLiveRead(file, 'B0LIVEREAD', newer);
  check('(d) the file keeps ONE row per ASIN', Object.keys(file).length === 1);
  check('(d) …and it is the NEWER read', file.B0LIVEREAD === newer, JSON.stringify(file.B0LIVEREAD));
  const r = resolveDarkCardFigure(pick, buyableRow, file.B0LIVEREAD, NOW);
  check('(d) the newer (10-day-old unavailable) read decides the card: dark, no $50 figure', r.mode === 'suppressed' && r.price === undefined, JSON.stringify(r));

  // And back the other way: a newer live-New read re-lights it.
  file = applyLiveRead(file, 'B0LIVEREAD', liveNew(61.25, 2));
  const relit = resolveDarkCardFigure(pick, buyableRow, file.B0LIVEREAD, NOW);
  check('(d) a newer live-New read replaces the dark one and re-lights the card at its price', relit.mode === 'override' && relit.price === '$61.25', JSON.stringify(relit));

  // An OLDER read (a backfill via --at) must never replace a newer one: with no
  // age limit, nothing would ever retire the stale verdict it put back.
  let threw = false;
  try {
    applyLiveRead(file, 'B0LIVEREAD', liveNew(50, 20));
  } catch {
    threw = true;
  }
  check('(d) an OLDER read cannot replace a newer one (refused)', threw);
  check('(d) …and the newer row is untouched', file.B0LIVEREAD?.price === 61.25);
}

// ---------------------------------------------------------------------------
// CORPUS: every rendered pick with a live read of any age shows what it says.
// ---------------------------------------------------------------------------
{
  const now = new Date();
  const offenders: string[] = [];
  let newOld = 0;
  let newTotal = 0;
  let darkOnBuyable = 0;
  let darkTotal = 0;
  for (const g of getAllGuides()) {
    for (const p of g.picks ?? []) {
      const ov = p.asin ? getLiveReadOverride(p.asin) : null;
      if (!ov || !p.asin) continue;
      const label = `${g.slug}#${p.rank} ${p.asin}`;
      const readDay = String(ov.readAt ?? '').slice(0, 10);
      const ageDays = (now.getTime() - Date.parse(String(ov.readAt))) / DAY;
      if (isRenderableLiveNewOverride(ov, now)) {
        newTotal++;
        if (ageDays > 7) newOld++;
        const want = formatFigure(ov.price as number, ov.currency || 'USD');
        if (p.price !== want || p.priceCheckedAt !== readDay || p.priceSource !== 'override') {
          offenders.push(`${label}: live-New ${want} @${readDay} but card ${JSON.stringify(p.price)} @${p.priceCheckedAt} (${p.priceSource})`);
        }
      } else if (['unavailable', 'used-only', 'not-found'].includes(String(ov.condition))) {
        darkTotal++;
        const row = getSnapshotEntry(p.asin);
        if (!row || !isSnapshotUnbuyable(row)) darkOnBuyable++;
        if (!p.suppressionReason || p.price !== '' || p.priceStamp || !p.buyPathId) {
          offenders.push(`${label}: live ${ov.condition} @${readDay} but card price=${JSON.stringify(p.price)} reason=${String(p.suppressionReason)} buyPath=${p.buyPathId}`);
        }
      }
    }
  }
  check(`corpus: every live read decides its card (${offenders.length} offenders)`, offenders.length === 0, offenders.slice(0, 10).join('\n         '));
  check(`corpus: live-New picks older than 7 days still print (${newOld} of ${newTotal}) — not vacuous`, newOld > 0);
  check(`corpus: live-dark picks with no unbuyable snapshot row are dark (${darkOnBuyable} of ${darkTotal}) — not vacuous`, darkOnBuyable > 0);
}

console.log('');
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('live-read-no-expiry: PASS');
