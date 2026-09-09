/**
 * MUTATION SPEC for the §8rr.2 held-row carve-out in resolveDarkCardFigure.
 *
 * Incident C2 (2026-09-08): AI Nero 3 B08KZT7SMQ printed $189.99 from a snapshot
 * row last confirmed 2026-09-03 whose unbuyable flip was being HELD, while a
 * same-day live page read of $179.99 New sat unused in
 * data/live-read-overrides.json. Rule 0 returned "buyable" for the held row
 * before precedence looked at the override.
 *
 * A gate is only worth its runtime if it FAILS on the defect it claims to catch,
 * and the fix here is two clauses on one boolean — each of which can be deleted
 * without the other's tests noticing. So both are mutated, against the REAL
 * source file (copied out and rewritten, never edited in place):
 *
 *   M1  drop `&& !overrideSupersedesHold` from rule 0
 *       -> the incident comes back: the held row prints its stale API figure.
 *          Proves the carve-out is what re-lights the card.
 *
 *   M2  drop `isHeldSnapshotRow(snapshotRow) &&` from the boolean
 *       -> scope breaks the other way: a plainly-buyable card is re-derived
 *          from an override. Proves the HELD condition is what keeps owner
 *          rule 5 ("cards that work today are untouched") true.
 *
 * Both mutants must also still COMPILE and run — a mutant that merely crashes
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
    fs.writeFileSync(file, mutated.replace("from './price-cache'", `from '${rel}'`));
    const mod = await import(pathToFileURL(file).href);
    return mod.resolveDarkCardFigure as Resolver;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const M1_NEEDLE = ' && !overrideSupersedesHold';
const M2_NEEDLE = 'isHeldSnapshotRow(snapshotRow) && ';

check(`M1 needle present in ${path.relative(REPO_ROOT, SOURCE)}`, source.includes(M1_NEEDLE));
check(`M2 needle present in ${path.relative(REPO_ROOT, SOURCE)}`, source.includes(M2_NEEDLE));

// --- Control: the real module gets both cases right.
const { resolveDarkCardFigure } = await import('../../src/lib/dark-card');
check(
  'control: the shipped code re-lights the held row with the live figure',
  resolveDarkCardFigure(pick, heldRow, liveOverride, NOW).price === '$179.99',
  JSON.stringify(resolveDarkCardFigure(pick, heldRow, liveOverride, NOW)),
);
check(
  'control: the shipped code leaves a NOT-held buyable card alone',
  resolveDarkCardFigure(pick, notHeldRow, liveOverride, NOW).mode === 'buyable',
);

// --- M1: rule 0 no longer yields to a fresher live read.
{
  const mutant = await loadMutant('m1', source.replace(M1_NEEDLE, ''));
  const r = mutant(pick, heldRow, liveOverride, NOW);
  check(
    'M1 (carve-out removed): the held row falls back to "buyable" — the case (l1) ' +
      'assertion FAILS, so the carve-out is load-bearing',
    r.mode === 'buyable' && r.price === undefined,
    JSON.stringify(r),
  );
  check(
    'M1: …and it is the incident exactly — no live figure reaches the reader',
    r.price !== '$179.99',
  );
}

// --- M2: the HELD condition no longer scopes the carve-out.
{
  const mutant = await loadMutant('m2', source.replace(M2_NEEDLE, ''));
  const r = mutant(pick, notHeldRow, liveOverride, NOW);
  check(
    'M2 (HELD condition removed): a plainly-buyable card is re-derived from an ' +
      'override — the case (l2) assertion FAILS, so the HELD condition is load-bearing',
    r.mode === 'override',
    JSON.stringify(r),
  );
  check(
    'M2: …and the held case still passes, which is why M1 cannot catch this one',
    mutant(pick, heldRow, liveOverride, NOW).mode === 'override',
  );
}

console.log('');
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('dark-card-held-override.mutation: PASS');
