/**
 * MUTATION SPEC for the §8rr.2 held-row carve-out in resolveDarkCardFigure.
 *
 * Incident C2 (2026-09-08): AI Nero 3 B08KZT7SMQ printed $189.99 from a snapshot
 * row last confirmed 2026-09-03 whose unbuyable flip was being HELD, while a
 * same-day live page read of $179.99 New sat unused in
 * data/live-read-overrides.json. Rule 0 returned "buyable" for the held row
 * before precedence looked at the override.
 *
 * OWNER RULING 2026-09-26 (live reads primary, no expiry) replaced the held-row
 * carve-out: a live-New read of any age now wins over EVERY snapshot row (rule
 * 1 runs before rule 0), and a live dark read darkens a card on its own (rule
 * 1b). A gate is only worth its runtime if it FAILS on the defect it claims to
 * catch, so each clause is mutated against the REAL source file (copied out
 * and rewritten, never edited in place):
 *
 *   M1  drop rule 1 (the live-New early return)
 *       -> the incident comes back: the held row prints its stale API figure.
 *   M2  re-add the retired 7-day ceiling to isRenderableLiveNewOverride
 *       -> a 50-day-old live read stops printing.
 *   M3  drop rule 1b (the live dark early return)
 *       -> a live unavailable read no longer darkens a buyable row (#193 gap).
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

// Owner ruling 2026-09-26 replaced the §8rr.2 held-row carve-out (rule 0's
// `&& !overrideSupersedesHold`, scoped by `isHeldSnapshotRow(snapshotRow) &&`)
// with LIVE READ PRIMARY, NO EXPIRY: rule 1 runs before rule 0 for every row,
// a live dark read darkens on its own (rule 1b), and no age ceiling exists.
// Each clause is mutated against the REAL source; every mutant must compile,
// run, and bring back a defect the shipped code does not have.
const RULE1_NEEDLE = '  if (isRenderableLiveNewOverride(override, now) && override) return overrideFigure(override);\n';
const RULE1B_NEEDLE = "  if (isLiveDarkOverride(override, now)) return { mode: 'suppressed', currency: 'USD' };\n";
const AGE_NEEDLE = '  return age !== null && age >= 0;\n';
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

check(`rule-1 needle present once in ${path.relative(REPO_ROOT, SOURCE)}`, count(source, RULE1_NEEDLE) === 1);
check(`rule-1b needle present once in ${path.relative(REPO_ROOT, SOURCE)}`, count(source, RULE1B_NEEDLE) === 1);
check(`age needle present (live-New predicate first) in ${path.relative(REPO_ROOT, SOURCE)}`, count(source, AGE_NEEDLE) === 2);

const staleOverride: LiveReadOverride = { ...liveOverride, readAt: '2026-07-20T00:00:00.000Z' }; // 50 days before NOW
const darkOverride: LiveReadOverride = { ...liveOverride, price: null, condition: 'unavailable', availability: 'OUT_OF_STOCK' };

// --- Control: the real module.
const { resolveDarkCardFigure } = await import('../../src/lib/dark-card');
const shipped = resolveDarkCardFigure as unknown as Resolver;
check(
  'control: the shipped code re-lights the held row with the live figure',
  shipped(pick, heldRow, liveOverride, NOW).price === '$179.99',
  JSON.stringify(shipped(pick, heldRow, liveOverride, NOW)),
);
check(
  'control: the shipped code prints the live figure over a NOT-held buyable row too (live read primary)',
  shipped(pick, notHeldRow, liveOverride, NOW).price === '$179.99',
);
check('control: a 50-day-old live read still prints', shipped(pick, heldRow, staleOverride, NOW).price === '$179.99');
check('control: a live unavailable read darkens a buyable row', shipped(pick, notHeldRow, darkOverride, NOW).mode === 'suppressed');

// --- M1: rule 1 removed -> the incident comes back on the held row, and the
// buyable row prints its API figure over the live read.
{
  const mutant = await loadMutant('m1', source.replace(RULE1_NEEDLE, ''));
  const held = mutant(pick, heldRow, liveOverride, NOW);
  check('M1 (rule 1 removed): the held row falls back to "buyable" — incident C2 returns', held.mode === 'buyable' && held.price === undefined, JSON.stringify(held));
  check('M1: …and the not-held buyable row loses its live figure too', mutant(pick, notHeldRow, liveOverride, NOW).mode === 'buyable');
}

// --- M2: re-add the retired 7-day ceiling to the live-New predicate.
{
  const mutant = await loadMutant('m2', source.replace(AGE_NEEDLE, '  return age !== null && age >= 0 && age <= 7;\n'));
  const r = mutant(pick, heldRow, staleOverride, NOW);
  check('M2 (7-day ceiling re-added): a 50-day-old live read stops printing — the ruling is load-bearing', r.mode === 'buyable' && r.price === undefined, JSON.stringify(r));
  check('M2: …while a same-day read still prints, which is why the 50-day case is the one that catches it', mutant(pick, heldRow, liveOverride, NOW).price === '$179.99');
}

// --- M3: rule 1b removed -> a live unavailable read no longer darkens a
// buyable row (the PR #193 gap comes back).
{
  const mutant = await loadMutant('m3', source.replace(RULE1B_NEEDLE, ''));
  const r = mutant(pick, notHeldRow, darkOverride, NOW);
  check('M3 (rule 1b removed): a live unavailable read leaves a buyable row "buyable" — the #193 gap returns', r.mode === 'buyable', JSON.stringify(r));
}

console.log('');
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('dark-card-held-override.mutation: PASS');
