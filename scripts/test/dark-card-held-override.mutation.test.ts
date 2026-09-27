/**
 * MUTATION SPEC for the §8rr.2 held-row carve-out in resolveDarkCardFigure.
 *
 * Incident C2 (2026-09-08): AI Nero 3 B08KZT7SMQ printed $189.99 from a snapshot
 * row last confirmed 2026-09-03 whose unbuyable flip was being HELD, while a
 * same-day live page read of $179.99 New sat unused in
 * data/live-read-overrides.json. Rule 0 returned "buyable" for the held row
 * before precedence looked at the override.
 *
 * OWNER RULINGS 2026-09-26 (no timer; newest dated read wins) replaced the
 * held-row carve-out: the newer of the live-New read and the snapshot row's
 * lastChecked sets the figure; only live reads / dead-asins entries darken,
 * the newer of a dark signal and a live-New read wins, and no API row relights
 * a live-dark card. A gate is only worth its runtime if it FAILS on the defect
 * it claims to catch, so each clause is mutated against the REAL source file
 * (copied out and rewritten, never edited in place):
 *
 *   M1  disable the live-New rule      -> incident C2 returns (held row stale).
 *   M2  re-add a 7-day cap             -> a 50-day-old newest read stops printing.
 *   M3  drop the newer-API comparison  -> an OLDER live read beats a NEWER API price.
 *   M4  drop the live-dark rule        -> a newer API row relights a live-dark card.
 *   M5  dead-asins always wins         -> a newer live-New read cannot relight it.
 *
 * Every mutant must also still COMPILE and run — a mutant that merely crashes
 * proves nothing about the assertion.
 *
 * Run: npx tsx scripts/test/dark-card-held-override.mutation.test.ts
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import type { DarkCardFigure, LiveReadOverride } from '../../src/lib/dark-card';
import type { SnapshotEntry } from '../../src/lib/price-cache';

let failures = 0;
const check = (label: string, ok: boolean, extra = '') => {
  if (ok) console.log(`  ok   ${label}`);
  else {
    failures++;
    console.error(`  FAIL ${label}${extra ? `\n         ${extra}` : ''}`);
  }
};

const REPO_ROOT = path.join(import.meta.dirname, '..', '..');
const SOURCE = path.join(REPO_ROOT, 'src', 'lib', 'dark-card.ts');
const PRICE_CACHE = path.join(REPO_ROOT, 'src', 'lib', 'price-cache');
const PRICE_STAMP = path.join(REPO_ROOT, 'src', 'lib', 'price-stamp');
const source = fs.readFileSync(SOURCE, 'utf8');

// The incident's own inputs.
const heldRow: SnapshotEntry = {
  price: '$189.99',
  lastChecked: '2026-09-03T00:55:01.267Z',
  availability: 'IN_STOCK',
  merchantId: 'A3CC7LJAEVAF74',
  merchantName: 'Leap Habitats',
  pendingUnbuyableSince: '2026-09-08T18:45:18.657Z',
  lastReadAt: '2026-09-08T18:45:18.657Z',
};
const notHeldRow: SnapshotEntry = { ...heldRow };
delete notHeldRow.pendingUnbuyableSince;
delete notHeldRow.lastReadAt;
const NOW = new Date('2026-09-08T23:00:00Z');
const liveOverride: LiveReadOverride = {
  price: 179.99,
  currency: 'USD',
  availability: 'IN_STOCK',
  merchant: 'unknown',
  condition: 'New',
  readAt: '2026-09-08T18:22:07.000Z',
  source: 'https://www.amazon.com/dp/B08KZT7SMQ',
};
const pick = { asin: 'B08KZT7SMQ', price: '$189.99', guideDate: '2026-09-03' };

type Resolver = (
  p: typeof pick,
  row: SnapshotEntry | null,
  o: LiveReadOverride | null,
  now: Date,
) => DarkCardFigure;

/**
 * Write `mutated` to a scratch copy of dark-card.ts and import it. The
 * `./price-cache` specifier is rewritten to a path relative to the scratch
 * directory so the mutant type-checks and runs against the REAL price-cache —
 * nothing is written inside src/, so a crash cannot leave a mutant in the tree
 * for the next build to compile.
 */
async function loadMutant(name: string, mutated: string): Promise<Resolver> {
  // realpath: on macOS os.tmpdir() is the /var symlink to /private/var, and a
  // relative specifier computed from the symlinked path does not resolve.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `dark-card-mutant-${name}-`)));
  try {
    const rel = path.relative(dir, PRICE_CACHE);
    const file = path.join(dir, 'dark-card.ts');
    fs.writeFileSync(
      file,
      mutated
        .replace("from './price-cache'", `from '${rel}'`)
        .replace("from './price-stamp'", `from '${path.relative(dir, PRICE_STAMP)}'`),
    );
    const mod = await import(pathToFileURL(file).href);
    return mod.resolveDarkCardFigure as Resolver;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Owner rulings 2026-09-26 (no timer; newest dated read wins) replaced the
// §8rr.2 held-row carve-out. Each load-bearing clause is mutated against the
// REAL source; every mutant must compile, run, and bring back a defect the
// shipped code does not have.
const RULE_L_NEEDLE = "  if (live === 'dark') return { mode: 'suppressed', currency: 'USD' };\n";
const NEWER_API_NEEDLE = "    if (isSnapshotNewerThanLiveRead(snapshotRow, override)) return { mode: 'buyable', currency: 'USD' };\n";
const RULE_N_NEEDLE = "  if (live === 'new' && override) {\n";
const AGE_NEEDLE = '  return age !== null && age >= 0;\n';
const GATE_NEEDLE = "gateDay > readDay ? 'dark' : 'new'";
const count = (hay: string, needle: string) => hay.split(needle).length - 1;
const rel = path.relative(REPO_ROOT, SOURCE);
check(`rule-L needle present once in ${rel}`, count(source, RULE_L_NEEDLE) === 1);
check(`newer-API needle present once in ${rel}`, count(source, NEWER_API_NEEDLE) === 1);
check(`rule-N needle present once in ${rel}`, count(source, RULE_N_NEEDLE) === 1);
check(`age needle present (live-New predicate first) in ${rel}`, count(source, AGE_NEEDLE) === 2);
check(`dead-asins comparison needle present once in ${rel}`, count(source, GATE_NEEDLE) === 1);

type GateResolver = (
  p: typeof pick & { hardGated?: boolean; hardGateVerifiedAt?: string },
  row: SnapshotEntry | null,
  o: LiveReadOverride | null,
  now: Date,
) => DarkCardFigure;

const oldLive: LiveReadOverride = { ...liveOverride, readAt: '2026-07-20T00:00:00.000Z' }; // 50 days before NOW
const olderThanRow: LiveReadOverride = { ...liveOverride, readAt: '2026-09-01T00:00:00.000Z' }; // before heldRow.lastChecked
const darkOverride: LiveReadOverride = { ...liveOverride, price: null, condition: 'unavailable', availability: 'OUT_OF_STOCK' };
const newerApiRow: SnapshotEntry = { ...notHeldRow, lastChecked: '2026-09-08T22:00:00.000Z' }; // after every live read here
const gatedPick = { ...pick, hardGated: true, hardGateVerifiedAt: '2026-09-05' };

// --- Control: the real module.
const { resolveDarkCardFigure } = await import('../../src/lib/dark-card');
const shipped = resolveDarkCardFigure as unknown as GateResolver;
check('control: a newer live read beats the held row\'s older API figure', shipped(pick, heldRow, liveOverride, NOW).price === '$179.99');
check('control: an OLDER live read does NOT beat a NEWER API row', shipped(pick, heldRow, olderThanRow, NOW).mode === 'buyable');
check('control: a 50-day-old live read prints when it is the newest read', shipped(pick, null, oldLive, NOW).price === '$179.99');
check('control: a newer buyable API row cannot relight a live-dark card', shipped(pick, newerApiRow, darkOverride, NOW).mode === 'suppressed');
check('control: a newer live-New read relights an older dead-asins entry', shipped(gatedPick, null, liveOverride, NOW).mode === 'override');

// --- M1: rule N removed -> incident C2 returns (the held row prints its stale
// API figure over a newer live read).
{
  const mutant = (await loadMutant('m1', source.replace(RULE_N_NEEDLE, "  if (false && override) {\n"))) as unknown as GateResolver;
  const r = mutant(pick, heldRow, liveOverride, NOW);
  check('M1 (live-New rule removed): the held row falls back to "buyable" — incident C2 returns', r.mode === 'buyable' && r.price === undefined, JSON.stringify(r));
}

// --- M2: re-add the retired 7-day cap -> a 50-day-old newest read stops printing.
{
  const mutant = (await loadMutant('m2', source.replace(AGE_NEEDLE, '  return age !== null && age >= 0 && age <= 7;\n'))) as unknown as GateResolver;
  const r = mutant(pick, null, oldLive, NOW);
  check('M2 (7-day cap re-added): a 50-day-old live read stops printing — the no-timer rule is load-bearing', r.mode !== 'override', JSON.stringify(r));
  check('M2: …while a same-day read still prints', mutant(pick, heldRow, liveOverride, NOW).price === '$179.99');
}

// --- M3: newer-API check removed -> an OLDER live read beats a NEWER API price.
{
  const mutant = (await loadMutant('m3', source.replace(NEWER_API_NEEDLE, ''))) as unknown as GateResolver;
  const r = mutant(pick, heldRow, olderThanRow, NOW);
  check('M3 (newer-API check removed): an OLDER live read now beats a NEWER API price — caught', r.mode === 'override', JSON.stringify(r));
}

// --- M4: rule L removed -> a newer API row relights a live-dark card (and the
// #193 gap returns: a live unavailable read no longer darkens a buyable row).
{
  const mutant = (await loadMutant('m4', source.replace(RULE_L_NEEDLE, ''))) as unknown as GateResolver;
  const r = mutant(pick, newerApiRow, darkOverride, NOW);
  check('M4 (live-dark rule removed): a newer buyable API row relights a live-dark card — caught', r.mode === 'buyable', JSON.stringify(r));
}

// --- M5: dead-asins always wins -> a newer live-New read no longer relights it.
{
  const mutant = (await loadMutant('m5', source.replace(GATE_NEEDLE, "true ? 'dark' : 'new'"))) as unknown as GateResolver;
  const r = mutant(gatedPick, null, liveOverride, NOW);
  check('M5 (gate always wins): a newer live-New read no longer relights an older dead-asins entry — caught', r.mode === 'suppressed', JSON.stringify(r));
}

console.log('');
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('dark-card-held-override.mutation: PASS');
