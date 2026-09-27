/**
 * NO TIMER; NEWEST DATED READ WINS — owner rulings 2026-09-26.
 *
 *   - A live read (data/live-read-overrides.json, one row per ASIN, written by
 *     scripts/record-live-read.ts) never expires by age. The §8rr.3 7-day
 *     window is retired.
 *   - FIGURE + STAMP: the live-New read's readAt vs the snapshot row's
 *     lastChecked — the NEWER one decides (tie -> the live read). An API row
 *     only wins when it is buyable and priced.
 *   - DARK: only a live read (or a dead-asins entry, which is live-read-derived)
 *     can darken; the API only HOLDs. Between a dark signal and a live-New read
 *     the NEWER wins. A live-dark card stays dark until a NEWER LIVE-New read —
 *     no API row can relight it.
 *
 * Cases (each FAILS on origin/main 052c4f9, where live reads expired at 7
 * days, a live-New read could not touch a not-held buyable row, and a live
 * unavailable read could not darken a card on its own):
 *   (a) a 60-day-old live-New read still renders its price + date when it is
 *       the newest read (no row / older row / unbuyable row);
 *   (b) a NEWER live read beats an older, differing API price — and an OLDER
 *       live read does NOT beat a newer API price (tie -> live);
 *   (c) a live unavailable / used-only / not-found read darkens a card whose
 *       snapshot row is buyable (no dead-asins entry), and a NEWER buyable API
 *       row cannot relight it;
 *   (d) dead-asins vs live-New: the newer wins;
 *   (e) a newer live read of the same ASIN replaces an older one
 *       (record-live-read's applyLiveRead); an older backfill is refused.
 * Plus a corpus sweep over the real data.
 *
 * Run: npx tsx scripts/test/live-read-no-expiry.test.ts
 */
import {
  resolveDarkCardFigure,
  getLiveReadOverride,
  isRenderableLiveNewOverride,
  isSnapshotNewerThanLiveRead,
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

const buyableRow = (ageDays: number, price = '$129.99'): SnapshotEntry => ({
  price,
  lastChecked: daysAgo(ageDays),
  availability: 'IN_STOCK',
  merchantId: 'ATVPDKIKX0DER',
  merchantName: 'Amazon.com',
});
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
// (a) no timer: a 60-day-old live-New read renders when it is the newest read.
// ---------------------------------------------------------------------------
{
  const old = liveNew(99.5, 60);
  check('(a) a 60-day-old live-New read is renderable', isRenderableLiveNewOverride(old, NOW));
  for (const [name, row] of [
    ['no snapshot row', null],
    ['unbuyable snapshot row (the API cannot darken)', { ...buyableRow(1), availability: 'OUT_OF_STOCK' }],
    ['buyable snapshot row read 90 days ago', buyableRow(90)],
  ] as Array<[string, SnapshotEntry | null]>) {
    const r = resolveDarkCardFigure(pick, row, old, NOW);
    check(`(a) ${name}: the 60-day-old live-New read prints its price`, r.mode === 'override' && r.price === '$99.50', JSON.stringify(r));
    check(
      `(a) ${name}: …stamped with the read's own date (${old.readAt!.slice(0, 10)})`,
      r.date === old.readAt!.slice(0, 10) && r.chip === priceStampText('current', old.readAt!.slice(0, 10)),
      JSON.stringify(r),
    );
  }
  const future = resolveDarkCardFigure(pick, buyableRow(90), { ...old, readAt: daysAgo(-2) }, NOW);
  check('(a) only a FUTURE-dated read is ignored (clock skew)', future.mode === 'buyable', JSON.stringify(future));
}

// ---------------------------------------------------------------------------
// (b) newest dated read decides the figure.
// ---------------------------------------------------------------------------
{
  const newer = resolveDarkCardFigure(pick, buyableRow(10), liveNew(119.0, 3), NOW);
  check('(b) live-New $119.00 read 3d ago beats a $129.99 API row read 10d ago', newer.mode === 'override' && newer.price === '$119.00', JSON.stringify(newer));
  const older = resolveDarkCardFigure(pick, buyableRow(1), liveNew(119.0, 30), NOW);
  check('(b) an OLDER live read does NOT beat a NEWER buyable API price -> API figure', older.mode === 'buyable' && older.price === undefined, JSON.stringify(older));
  check('(b) …isSnapshotNewerThanLiveRead agrees', isSnapshotNewerThanLiveRead(buyableRow(1), liveNew(119.0, 30)));
  const tieRead = liveNew(119.0, 5);
  const tie = resolveDarkCardFigure(pick, { ...buyableRow(5), lastChecked: tieRead.readAt! }, tieRead, NOW);
  check('(b) a tie goes to the live read', tie.mode === 'override', JSON.stringify(tie));
  const unpricedNewer = resolveDarkCardFigure(pick, { ...buyableRow(1), price: null }, liveNew(119.0, 30), NOW);
  check('(b) a newer API row with no price cannot take the figure', unpricedNewer.mode === 'override', JSON.stringify(unpricedNewer));
}

// ---------------------------------------------------------------------------
// (c) a live dark read darkens on its own; no API row can relight it.
// ---------------------------------------------------------------------------
{
  check('(c) premise: the snapshot row is BUYABLE to every gate', !isSnapshotUnbuyable(buyableRow(1)));
  for (const state of ['unavailable', 'used-only', 'not-found'] as const) {
    for (const age of [1, 17, 90]) {
      const r = resolveDarkCardFigure({ ...pick, hardGated: false }, buyableRow(age + 5), liveDark(state, age), NOW);
      check(
        `(c) live "${state}" read ${age}d old + buyable snapshot + NO dead-asins entry -> figure-less dark`,
        r.mode === 'suppressed' && r.price === undefined && r.chip === undefined,
        JSON.stringify(r),
      );
    }
  }
  const relight = resolveDarkCardFigure(pick, buyableRow(0.1), liveDark('unavailable', 20), NOW);
  check('(c) a buyable API row NEWER than the live unavailable read does NOT relight it', relight.mode === 'suppressed', JSON.stringify(relight));
}

// ---------------------------------------------------------------------------
// (d) dead-asins entry vs live-New read: the newer wins.
// ---------------------------------------------------------------------------
{
  const gated = { ...pick, hardGated: true, hardGateVerifiedAt: daysAgo(10).slice(0, 10) };
  const relit = resolveDarkCardFigure(gated, null, liveNew(88, 4), NOW);
  check('(d) a live-New read NEWER than the dead-asins entry relights the card', relit.mode === 'override' && relit.price === '$88.00', JSON.stringify(relit));
  const stays = resolveDarkCardFigure(gated, null, liveNew(88, 20), NOW);
  check('(d) a live-New read OLDER than the dead-asins entry leaves it dark', stays.mode === 'suppressed', JSON.stringify(stays));
  const apiOnly = resolveDarkCardFigure(gated, buyableRow(0.1), null, NOW);
  check('(d) a buyable API row cannot relight a dead-asins card', apiOnly.mode === 'suppressed', JSON.stringify(apiOnly));
}

// ---------------------------------------------------------------------------
// (e) a newer live read of the same ASIN replaces an older one.
// ---------------------------------------------------------------------------
{
  let file: Record<string, LiveReadOverride> = {};
  file = applyLiveRead(file, 'B0LIVEREAD', liveNew(50, 20));
  const newer = liveDark('unavailable', 10);
  file = applyLiveRead(file, 'B0LIVEREAD', newer);
  check('(e) the file keeps ONE row per ASIN', Object.keys(file).length === 1);
  check('(e) …and it is the NEWER read', file.B0LIVEREAD === newer, JSON.stringify(file.B0LIVEREAD));
  const r = resolveDarkCardFigure(pick, buyableRow(15), file.B0LIVEREAD, NOW);
  check('(e) the newer (unavailable) read decides the card: dark, no $50 figure', r.mode === 'suppressed' && r.price === undefined, JSON.stringify(r));
  file = applyLiveRead(file, 'B0LIVEREAD', liveNew(61.25, 2));
  const relit = resolveDarkCardFigure(pick, buyableRow(15), file.B0LIVEREAD, NOW);
  check('(e) a newer live-New read replaces the dark one and relights at its price', relit.mode === 'override' && relit.price === '$61.25', JSON.stringify(relit));
  let threw = false;
  try {
    applyLiveRead(file, 'B0LIVEREAD', liveNew(50, 20));
  } catch {
    threw = true;
  }
  check('(e) an OLDER read cannot replace a newer one (refused)', threw);
  check('(e) …and the newer row is untouched', file.B0LIVEREAD?.price === 61.25);
}

// ---------------------------------------------------------------------------
// CORPUS: the newest dated read decides every rendered pick with a live read.
// ---------------------------------------------------------------------------
{
  const now = new Date();
  const offenders: string[] = [];
  let newOldPrinting = 0;
  let apiNewer = 0;
  let darkOnBuyable = 0;
  let darkTotal = 0;
  for (const g of getAllGuides()) {
    for (const p of g.picks ?? []) {
      const ov = p.asin ? getLiveReadOverride(p.asin) : null;
      if (!ov || !p.asin) continue;
      const row = getSnapshotEntry(p.asin);
      const label = `${g.slug}#${p.rank} ${p.asin}`;
      const readDay = String(ov.readAt ?? '').slice(0, 10);
      if (isRenderableLiveNewOverride(ov, now)) {
        if (p.suppressionReason === 'dead-asins' || p.suppressionReason === 'no-listing') continue;
        if (isSnapshotNewerThanLiveRead(row, ov)) {
          apiNewer++;
          if (p.priceSource === 'override') offenders.push(`${label}: API row newer than live ${readDay} but live figure prints`);
          continue;
        }
        if ((now.getTime() - Date.parse(String(ov.readAt))) / DAY > 7) newOldPrinting++;
        const want = formatFigure(ov.price as number, ov.currency || 'USD');
        if (p.price !== want || p.priceCheckedAt !== readDay || p.priceSource !== 'override') {
          offenders.push(`${label}: live-New ${want} @${readDay} is newest but card ${JSON.stringify(p.price)} @${p.priceCheckedAt} (${p.priceSource})`);
        }
      } else if (['unavailable', 'used-only', 'not-found'].includes(String(ov.condition))) {
        darkTotal++;
        if (!row || !isSnapshotUnbuyable(row)) darkOnBuyable++;
        if (!p.suppressionReason || p.price !== '' || p.priceStamp || !p.buyPathId) {
          offenders.push(`${label}: live ${ov.condition} @${readDay} but card price=${JSON.stringify(p.price)} reason=${String(p.suppressionReason)}`);
        }
      }
    }
  }
  check(`corpus: the newest dated read decides every card (${offenders.length} offenders)`, offenders.length === 0, offenders.slice(0, 10).join('\n         '));
  check(`corpus: live-New picks older than 7 days still print when newest (${newOldPrinting}) — not vacuous`, newOldPrinting > 0);
  check(`corpus: cards where a newer API row wins the figure (${apiNewer}) — not vacuous`, apiNewer > 0);
  check(`corpus: live-dark picks with no unbuyable snapshot row are dark (${darkOnBuyable} of ${darkTotal}) — not vacuous`, darkOnBuyable > 0);
}

console.log('');
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('live-read-no-expiry: PASS');
