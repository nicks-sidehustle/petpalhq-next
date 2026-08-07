#!/usr/bin/env npx tsx
/**
 * price-drift-detector — port of smarthome-explorer-blog's scripts/audit/
 * price-drift-detector.ts (SHE issue #446 / PR #454), adapted to
 * petpalhq-next's actual data shapes. Mechanical audit: the price a guide
 * states in its own frontmatter vs the price the site actually renders from
 * the amazon-prices.json snapshot. REPORT-ONLY — no writes, no auto-fixing,
 * no network calls.
 *
 * WHY THIS EXISTS (SHE #446): the SHE pool-lane arc (#439/#444) found four
 * products in ONE guide whose editorial price was stale while the price
 * snapshot was current in every case. The snapshot layer updates mechanically
 * (weekly-price-sync.yml → sync-amazon-prices.ts); the editorial layer never
 * reconciles against it. On SHE the editorial layer is consensus-data.ts
 * rows; here it is guide frontmatter `picks[]`. Same bug, different container.
 *
 * WHY THIS MATTERS MORE HERE THAN THE CARD PRICE SUGGESTS. src/lib/guides.ts:
 * 534-538 resolves `getCachedPrice(asin)?.price || frontmatterPrice`, so when
 * a snapshot entry EXISTS the rendered card price is already correct and the
 * stale frontmatter number is invisible on the card. It is NOT invisible
 * everywhere: the pick's `body`, `verdict`, and comparison prose are written
 * around the frontmatter number and are NOT overridden by anything. A pick
 * whose card says $62.99 while its own paragraph argues "at $105 this is a
 * lot of topper for the money" is the comparative-prose price-rot class. This
 * report is therefore the scoping tool for prose sweeps, exactly as on SHE:
 * a large delta here means the prose around that pick needs reading.
 *
 * ── PORT DELTAS vs the SHE original (petpalhq-next is NOT SHE) ──
 *
 * 1. THE EDITORIAL SIDE IS GUIDE FRONTMATTER, NOT consensus-data.ts.
 *    src/lib/content/consensus-data.ts exists here but `consensusReviews` is
 *    literally `[]` (v2 scaffold, never populated). The real product corpus is
 *    1,257 `picks[]` entries across 244 markdown guides in src/content/guides,
 *    each carrying `price`, `asin`, `name`, `rank` and `label`. Porting against
 *    consensus-data.ts would have produced a clean, meaningless "0 compared".
 *
 * 2. FRONTMATTER IS READ RAW, DELIBERATELY NOT VIA getAllGuides(). parsePicks
 *    in guides.ts already merges the snapshot price OVER the frontmatter price
 *    (line 535). Comparing getAllGuides() output against the snapshot would
 *    compare the snapshot with itself and report a permanent, reassuring 0%
 *    drift. This script parses the .md frontmatter directly with gray-matter
 *    so it sees the un-merged editorial number — the whole point of the audit.
 *
 * 3. NO LAST-WINS COLLAPSE. SHE groups consensus rows by product id and treats
 *    the last array entry as canonical, because only one row can render. Here
 *    the same ASIN legitimately appears in several guides (a product featured
 *    in multiple roundups) and EACH guide renders its OWN frontmatter price
 *    independently. So every pick is compared on its own; nothing is collapsed.
 *    The unit of comparison is a pick (`{guide-slug}#rank{N}`), not a product.
 *
 * 4. THE "key-conflict" CLASS IS STRUCTURALLY IMPOSSIBLE IN THIS STORE, and is
 *    reported as such rather than as a reassuring zero. SHE's key conflicts are
 *    the same ASIN reachable under two different snapshot KEYS (a productId
 *    slug key and a raw ASIN key) with two different prices. data/amazon-prices
 *    .json here is keyed by ASIN and nothing else, so one ASIN is one key by
 *    construction. The script proves that rather than assuming it: every key is
 *    tested against /^[A-Z0-9]{10}$/ and any non-ASIN key is reported as a real
 *    finding (it would mean the store's key contract has broken).
 *
 * 5. THE "dup-row" CLASS BECOMES CROSS-GUIDE ASIN DISAGREEMENT — the same bug,
 *    relocated. SHE flags one product id carrying two different `priceRange`
 *    values in consensus-data.ts. Here the equivalent is one ASIN carrying two
 *    different frontmatter prices across two picks: the site is quoting two
 *    different prices for the identical product. As in the original, this is an
 *    editorial-hygiene bug independent of whether the ASIN currently has
 *    comparable live pricing, so it is computed ONCE up front over EVERY pick,
 *    before any comparability gate, and never recomputed inside the main loop.
 *
 * 6. TWO EXTRA EXCLUSION REASONS THAT SHE HAS NO EQUIVALENT FOR:
 *    - `no-asin`: getCachedPrice(undefined) returns null (price-cache.ts:55),
 *      so an ASIN-less pick never reads the snapshot and renders its
 *      frontmatter price. Nothing to drift against.
 *    - `dead-asin-gated`: data/dead-asins.json hard-gates DEAD / NO-OFFER ASINs
 *      (§8m guard, guides.ts:550). Production forces those picks unavailable
 *      and replaces the CTA regardless of frontmatter, so a price delta on them
 *      is drift against a number no buyer can act on. USED-BUYBOX is NOT gated
 *      (those ASINs are genuinely purchasable) and stays in the comparison.
 *
 * 7. REVENUE LANES ARE PET LANES, not SHE's pool/security/hubs. See
 *    REVENUE_LANES for the selection rationale.
 *
 * 8. CATEGORY VALUES ARE UNNORMALIZED IN THIS CORPUS ("Cats & Dogs" 126 guides
 *    but also stray "Dog" / "Dogs" / "Cat" singletons). Lane matching and the
 *    roll-up normalize separators so a lane is not silently split into
 *    half-rows that each look half as bad as the lane really is.
 *
 * PRESERVED UNCHANGED from the original: the >5%/>15%/>25% bands, midpoint
 * parsing of price ranges, `/mo` subscription-string handling, the
 * unavailable-with-stale-nonzero-price exclusion, and per-id exclusion
 * reporting instead of a silent aggregate count.
 *
 * Usage:
 *   npm run audit:price-drift                      # human report
 *   npm run audit:price-drift -- --json            # machine-readable (always includes `excluded[]`)
 *   npm run audit:price-drift -- --top=50          # override top-N (default 20)
 *   npm run audit:price-drift -- --show-excluded   # human report: also print the excluded-id table
 * Exit 0 always (report-only).
 */
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { isPlaceholderPrice } from '../../src/lib/guides';
import { getDeadAsinEntry, isHardGateStatus } from '../../src/lib/dead-asin-guard';

const ROOT = path.join(import.meta.dirname, '..', '..');
const GUIDES_DIR = path.join(ROOT, 'src/content/guides');
const SNAPSHOT_PATH = path.join(ROOT, 'data/amazon-prices.json');

/** Mirrors CachedPriceEntry in src/lib/price-cache.ts. Note `price` is a
 *  formatted STRING here ("$1,027.94"), not a number as it is on SHE. */
interface SnapshotEntry {
  price: string;
  lastChecked: string;
  availability?: string | null;
}

/** Report-only drift bands (abs % delta). */
const DRIFT_BANDS = [5, 15, 25] as const;

/** A snapshot key must be a bare ASIN — see port delta 4. */
const ASIN_RE = /^[A-Z0-9]{10}$/;

/**
 * Availability markers that mean "not a comparable live price". UNAVAILABLE is
 * self-explanatory; AVAILABLE_DATE is a preorder/backorder marker whose price
 * is a placeholder for a product you cannot buy today. IN_STOCK and
 * IN_STOCK_SCARCE are both genuinely purchasable and stay in the comparison.
 */
const UNAVAILABLE_STATES = new Set(['UNAVAILABLE', 'OUT_OF_STOCK', 'AVAILABLE_DATE']);

/**
 * Revenue-weighted lanes for THIS site, pinned ahead of the general category
 * roll-up so a regression in a money lane is visible immediately rather than
 * buried in a long-tail table. Selected from the live corpus by roster size ×
 * average ticket (measured, not guessed):
 *   - cats-dogs   625 picks, avg $141 — dominant volume
 *   - aquarium    217 picks, avg $158 — canister filters/tanks, high ticket
 *   - playground  139 picks, avg $164 — the highest average ticket on the site
 * Matched against a separator-normalized `category` so the stray singleton
 * spellings ("Dog", "Dogs", "Cat") land in the right lane (port delta 8).
 */
const REVENUE_LANES: Array<{ label: string; test: (haystack: string) => boolean }> = [
  { label: 'cats-dogs', test: (h) => /\bcats?\b|\bdogs?\b/.test(h) },
  { label: 'aquarium', test: (h) => /\baquarium\b|\bfish\b/.test(h) },
  { label: 'playground', test: (h) => /\bplayground\b/.test(h) },
];

/** Lowercases and collapses `-`/`&`/`_`/whitespace so "Cats & Dogs",
 *  "cats-dogs" and "Cats  Dogs" all normalize to the same token stream. */
function normalizeCategory(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-_&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses a price string ("$259.99", "$249-$280", "$1,027.94", "discontinued")
 * into a representative number. Plain ranges resolve to their midpoint (we
 * compare against a single live price, not a sort key). Returns null for
 * anything without a parseable dollar amount.
 *
 * Subscription-style strings ("$0 device + $44.95/month") mix a one-time
 * hardware cost with a recurring fee; naively averaging every `$N` would blend
 * the two into a number that means nothing. Amounts immediately followed by
 * `/mo` or `/month` are treated as recurring and excluded whenever at least one
 * non-recurring amount exists, since the snapshot always prices the hardware
 * ASIN, not a subscription.
 *
 * Used for BOTH sides here, unlike SHE where the snapshot side was already a
 * number — data/amazon-prices.json stores formatted strings (port delta note).
 */
function parsePriceToNumber(price: string | undefined | null): number | null {
  if (!price) return null;
  const re = /\$([\d,]+(?:\.\d+)?)(\s*\/\s*mo(?:nth)?)?/g;
  const oneTime: number[] = [];
  const recurring: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(price))) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    if (m[2]) recurring.push(n);
    else oneTime.push(n);
  }
  const pool = oneTime.length ? oneTime : recurring;
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => a + b, 0) / pool.length;
}

type ExcludeReason =
  | 'unparseable'
  | 'subscription-string'
  | 'zero-editorial'
  | 'no-asin'
  | 'dead-asin-gated'
  | 'no-snapshot'
  | 'unavailable';

interface ExcludedRow {
  id: string;
  category: string;
  reason: ExcludeReason;
  frontmatterPrice?: string;
  snapshotPrice?: string;
  availability?: string | null;
  asin?: string;
  // Carried through even for excluded rows — cross-guide ASIN disagreement is
  // an editorial-hygiene bug independent of price comparability.
  asinDisagreement?: boolean;
}

interface DriftRow {
  id: string;
  guideSlug: string;
  productName: string;
  category: string;
  rank: number;
  asin: string;
  editorialPrice: number;
  snapshotPrice: number;
  deltaPct: number;
  lastChecked: string;
  availability: string;
  asinDisagreement: boolean;
}

/** One frontmatter pick, flattened with the guide context it came from. */
interface RawPick {
  id: string;
  guideSlug: string;
  category: string;
  rank: number;
  name: string;
  price: string;
  asin?: string;
}

function readPicks(): RawPick[] {
  const out: RawPick[] = [];
  for (const file of fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md')).sort()) {
    const slug = file.replace(/\.md$/, '');
    const data = matter(fs.readFileSync(path.join(GUIDES_DIR, file), 'utf-8')).data as Record<
      string,
      unknown
    >;
    const picks = Array.isArray(data.picks) ? (data.picks as Array<Record<string, unknown>>) : [];
    picks.forEach((p, i) => {
      const rank = typeof p.rank === 'number' ? p.rank : i + 1;
      out.push({
        id: `${slug}#rank${rank}`,
        guideSlug: slug,
        category: String(data.category ?? ''),
        rank,
        name: String(p.name ?? ''),
        price: p.price == null ? '' : String(p.price),
        asin: typeof p.asin === 'string' && p.asin ? p.asin : undefined,
      });
    });
  }
  return out;
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const showExcluded = args.includes('--show-excluded');
  const topArg = args.find((a) => a.startsWith('--top='));
  const topN = topArg ? parseInt(topArg.split('=')[1], 10) : 20;

  const snapshot: Record<string, SnapshotEntry> = fs.existsSync(SNAPSHOT_PATH)
    ? (JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8')) as Record<string, SnapshotEntry>)
    : {};
  const picks = readPicks();

  // ── Port delta 4: prove the ASIN-keyed contract instead of assuming it.
  // A non-ASIN key would mean the store can address one product two ways,
  // which is precisely the precondition for SHE's key-conflict class.
  const malformedKeys = Object.keys(snapshot).filter((k) => !ASIN_RE.test(k));

  // ── Port delta 5: cross-guide ASIN disagreement, computed ONCE up front over
  // EVERY pick, BEFORE any comparability gate. Computing this inside the main
  // loop would silently drop the flag for any pick diverted into `excluded` via
  // an early `continue` — the "silent exclusion drops a real signal" failure
  // mode the original guards against.
  const byAsin = new Map<string, RawPick[]>();
  for (const p of picks) {
    if (!p.asin) continue;
    if (!byAsin.has(p.asin)) byAsin.set(p.asin, []);
    byAsin.get(p.asin)!.push(p);
  }
  const disagreeingAsins = new Map<string, RawPick[]>();
  for (const [asin, group] of byAsin) {
    if (group.length < 2) continue;
    // Compare parsed numbers, not raw strings: "$99" and "$99.00" are the same
    // price written two ways and are not an editorial disagreement.
    const distinct = new Set(
      group
        .map((p) => parsePriceToNumber(p.price))
        .filter((n): n is number => n !== null)
        .map((n) => Math.round(n * 100))
    );
    if (distinct.size > 1) disagreeingAsins.set(asin, group);
  }
  const disagreementPickIds = new Set(
    [...disagreeingAsins.values()].flat().map((p) => p.id)
  );

  const rows: DriftRow[] = [];
  const excluded: ExcludedRow[] = [];

  for (const pick of picks) {
    const asinDisagreement = disagreementPickIds.has(pick.id);
    const base = { id: pick.id, category: pick.category, asin: pick.asin, asinDisagreement };

    // Placeholder strings ("Check price") are truthy but not a real price —
    // guides.ts:538 blanks them at render, so treat them as absent here too.
    const editorialRaw = isPlaceholderPrice(pick.price) ? '' : pick.price;
    const editorialPrice = parsePriceToNumber(editorialRaw);

    if (editorialPrice === null) {
      excluded.push({ ...base, reason: 'unparseable', frontmatterPrice: pick.price });
      continue;
    }
    if (editorialPrice <= 0) {
      const reason: ExcludeReason = /\/\s*mo(?:nth)?\b/i.test(editorialRaw)
        ? 'subscription-string'
        : 'zero-editorial';
      excluded.push({ ...base, reason, frontmatterPrice: pick.price });
      continue;
    }

    // Port delta 6: price-cache.ts:55 returns null for an absent ASIN, so the
    // snapshot is never consulted and the frontmatter price is what renders.
    if (!pick.asin) {
      excluded.push({ ...base, reason: 'no-asin', frontmatterPrice: pick.price });
      continue;
    }

    // Port delta 6: §8m hard gate. DEAD / NO-OFFER ASINs are forced unavailable
    // and their CTA replaced regardless of frontmatter (guides.ts:550), so a
    // price delta here is drift against a number no buyer can act on.
    // USED-BUYBOX is deliberately NOT gated — those are purchasable.
    const guard = getDeadAsinEntry(pick.asin);
    if (guard && isHardGateStatus(guard.status)) {
      excluded.push({ ...base, reason: 'dead-asin-gated', frontmatterPrice: pick.price });
      continue;
    }

    const entry = snapshot[pick.asin];
    if (!entry) {
      excluded.push({ ...base, reason: 'no-snapshot', frontmatterPrice: pick.price });
      continue;
    }

    const snapshotPrice = parsePriceToNumber(entry.price);
    // A snapshot entry that is unpriced, non-positive, or flagged unavailable
    // is a delisted/preorder marker, not a comparable live price. Gating on
    // price alone would miss unavailable entries carrying a stale nonzero
    // price — those produce fake drift against a number nobody sees.
    if (
      snapshotPrice === null ||
      snapshotPrice <= 0 ||
      UNAVAILABLE_STATES.has(String(entry.availability ?? '').toUpperCase())
    ) {
      excluded.push({
        ...base,
        reason: 'unavailable',
        frontmatterPrice: pick.price,
        snapshotPrice: entry.price,
        availability: entry.availability,
      });
      continue;
    }

    const deltaPct = (Math.abs(snapshotPrice - editorialPrice) / editorialPrice) * 100;
    rows.push({
      id: pick.id,
      guideSlug: pick.guideSlug,
      productName: pick.name,
      category: pick.category,
      rank: pick.rank,
      asin: pick.asin,
      editorialPrice,
      snapshotPrice,
      deltaPct,
      lastChecked: entry.lastChecked,
      availability: String(entry.availability ?? ''),
      asinDisagreement,
    });
  }

  const compared = rows;
  const excludedByReason = (reason: ExcludeReason) => excluded.filter((e) => e.reason === reason).length;
  const driftBandCounts = DRIFT_BANDS.map((band) => ({
    band,
    count: compared.filter((r) => r.deltaPct > band).length,
  }));

  // Built from `disagreeingAsins` (computed over ALL picks) — NOT filtered from
  // `rows`/`excluded` — so the count is correct regardless of which picks
  // happened to be comparable this run.
  const disagreementReport = [...disagreeingAsins.entries()].map(([asin, group]) => ({
    asin,
    picks: group.map((p) => ({
      id: p.id,
      price: p.price,
      excludedReason: excluded.find((e) => e.id === p.id)?.reason ?? null,
    })),
  }));

  const ranked = [...compared].sort((a, b) => b.deltaPct - a.deltaPct);

  const laneStats = REVENUE_LANES.map((lane) => {
    const laneRows = compared.filter((r) => lane.test(normalizeCategory(r.category)));
    const drifted5 = laneRows.filter((r) => r.deltaPct > 5).length;
    const maxDelta = laneRows.reduce((m, r) => Math.max(m, r.deltaPct), 0);
    return { label: lane.label, compared: laneRows.length, drifted5, maxDelta };
  });

  // Category roll-up keyed on the NORMALIZED category (port delta 8) so the
  // singleton spellings merge into their real lane. Raw spellings are carried
  // along so the report still points at real strings in the files.
  const categoryMap = new Map<
    string,
    { compared: number; drifted5: number; sumDelta: number; maxDelta: number; rawSpellings: Set<string> }
  >();
  for (const r of compared) {
    const key = normalizeCategory(r.category);
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { compared: 0, drifted5: 0, sumDelta: 0, maxDelta: 0, rawSpellings: new Set() });
    }
    const c = categoryMap.get(key)!;
    c.compared++;
    if (r.deltaPct > 5) c.drifted5++;
    c.sumDelta += r.deltaPct;
    c.maxDelta = Math.max(c.maxDelta, r.deltaPct);
    c.rawSpellings.add(r.category);
  }
  const categoryRollup = [...categoryMap.entries()]
    .map(([category, c]) => ({
      category,
      compared: c.compared,
      drifted5: c.drifted5,
      maxDelta: c.maxDelta,
      avgDelta: c.sumDelta / c.compared,
      rawSpellings: [...c.rawSpellings].sort(),
    }))
    .sort((a, b) => b.drifted5 - a.drifted5 || b.avgDelta - a.avgDelta);

  // Per-guide roll-up — the unit a refresh pass actually operates on.
  const guideMap = new Map<string, { compared: number; drifted5: number; maxDelta: number }>();
  for (const r of compared) {
    if (!guideMap.has(r.guideSlug)) guideMap.set(r.guideSlug, { compared: 0, drifted5: 0, maxDelta: 0 });
    const g = guideMap.get(r.guideSlug)!;
    g.compared++;
    if (r.deltaPct > 5) g.drifted5++;
    g.maxDelta = Math.max(g.maxDelta, r.deltaPct);
  }
  const guideRollup = [...guideMap.entries()]
    .map(([slug, g]) => ({ slug, ...g }))
    .sort((a, b) => b.drifted5 - a.drifted5 || b.maxDelta - a.maxDelta);

  const summary = {
    totalPicks: picks.length,
    guides: new Set(picks.map((p) => p.guideSlug)).size,
    snapshotEntries: Object.keys(snapshot).length,
    comparedCount: compared.length,
    unparseableCount: excludedByReason('unparseable'),
    subscriptionStringCount: excludedByReason('subscription-string'),
    zeroEditorialCount: excludedByReason('zero-editorial'),
    noAsinCount: excludedByReason('no-asin'),
    deadAsinGatedCount: excludedByReason('dead-asin-gated'),
    noSnapshotCount: excludedByReason('no-snapshot'),
    unavailableCount: excludedByReason('unavailable'),
    excludedTotal: excluded.length,
    driftBandCounts,
    // Structurally impossible in an ASIN-keyed store — see port delta 4. This
    // is null, not 0: "cannot happen here" and "checked, found none" are
    // different statements and conflating them would be the kind of reassuring
    // fake zero this tool exists to eliminate.
    keyConflictCount: null as null,
    malformedSnapshotKeys: malformedKeys,
    asinDisagreementCount: disagreementReport.length,
  };

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          summary,
          revenueLanes: laneStats,
          categoryRollup,
          guideRollup,
          // The dup-row analogue: one ASIN, two+ editorial prices. Covers ALL
          // picks including ones excluded from price comparison —
          // `excludedReason` is null when the pick is comparable.
          asinDisagreements: disagreementReport,
          // Every excluded pick + reason, per-row — never a silent aggregate.
          excluded,
          top: ranked.slice(0, topN),
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  console.log(
    `\nprice-drift-detector (port of SHE #446/#454) — ${summary.totalPicks} frontmatter picks across ` +
      `${summary.guides} guides, ${summary.snapshotEntries} snapshot entries\n`
  );
  console.log(
    `SUMMARY: ${summary.comparedCount} compared, ` +
      `${driftBandCounts[0].count} drifted >5%, ${driftBandCounts[1].count} drifted >15%, ${driftBandCounts[2].count} drifted >25%, ` +
      `${summary.asinDisagreementCount} cross-guide ASIN price disagreements\n` +
      `EXCLUDED: ${summary.excludedTotal} total — ${summary.unparseableCount} unparseable/placeholder price, ` +
      `${summary.subscriptionStringCount} subscription-string, ${summary.zeroEditorialCount} zero-editorial, ` +
      `${summary.noAsinCount} no ASIN (snapshot never consulted — price-cache.ts:55), ` +
      `${summary.deadAsinGatedCount} dead-ASIN hard-gated (§8m), ` +
      `${summary.noSnapshotCount} no snapshot entry, ${summary.unavailableCount} unavailable/preorder` +
      (showExcluded ? '' : ' — pass --show-excluded for the full id list')
  );
  console.log(
    `KEY CONFLICTS: n/a — data/amazon-prices.json is ASIN-keyed, so one ASIN is one key by construction ` +
      `(verified: ${malformedKeys.length} malformed keys${malformedKeys.length ? ' → ' + malformedKeys.join(', ') : ''})`
  );

  console.log(`\n── Revenue-weighted lanes (cats-dogs / aquarium / playground) ──`);
  for (const lane of laneStats) {
    console.log(
      `  ${lane.label.padEnd(12)} compared=${String(lane.compared).padStart(4)}  drifted>5%=${String(lane.drifted5).padStart(3)}  maxDelta=${lane.maxDelta.toFixed(1)}%`
    );
  }

  console.log(`\n── Category roll-up (normalized; sorted by drifted>5% count) ──`);
  for (const c of categoryRollup.slice(0, 15)) {
    const merged = c.rawSpellings.length > 1 ? `  [merged: ${c.rawSpellings.join(' + ')}]` : '';
    console.log(
      `  ${c.category.padEnd(14)} compared=${String(c.compared).padStart(4)}  drifted>5%=${String(c.drifted5).padStart(3)}  avg=${c.avgDelta.toFixed(1)}%  max=${c.maxDelta.toFixed(1)}%${merged}`
    );
  }

  console.log(`\n── Worst guides (sorted by drifted>5% count) — the refresh unit ──`);
  for (const g of guideRollup.slice(0, 15)) {
    console.log(
      `  ${g.slug.padEnd(52)} compared=${String(g.compared).padStart(3)}  drifted>5%=${String(g.drifted5).padStart(3)}  max=${g.maxDelta.toFixed(1)}%`
    );
  }

  if (disagreementReport.length) {
    console.log(
      `\n── Cross-guide ASIN price disagreements (dup-row analogue — one ASIN, two+ editorial ` +
        `prices; covers ALL picks regardless of price-comparison exclusion) ──`
    );
    for (const d of disagreementReport.slice(0, 25)) {
      const parts = d.picks
        .map((p) => `${p.id}=${p.price || '(blank)'}${p.excludedReason ? `[${p.excludedReason}]` : ''}`)
        .join('  vs  ');
      console.log(`  ${d.asin}: ${parts}`);
    }
    if (disagreementReport.length > 25) {
      console.log(`  … ${disagreementReport.length - 25} more — use --json for the full list`);
    }
  }

  if (showExcluded && excluded.length) {
    console.log(`\n── Excluded (${excluded.length} — id + reason, never a silent aggregate) ──`);
    console.log(`  ${'id'.padEnd(56)} ${'reason'.padEnd(18)} disagree detail`);
    for (const e of excluded) {
      const detail =
        e.reason === 'unavailable'
          ? `snapshot=${e.snapshotPrice} availability=${e.availability}`
          : e.frontmatterPrice
          ? `price="${e.frontmatterPrice}"`
          : '';
      console.log(
        `  ${e.id.padEnd(56)} ${e.reason.padEnd(18)} ${(e.asinDisagreement ? 'Y' : '-').padEnd(9)} ${detail}`
      );
    }
  }

  console.log(`\n── Top ${Math.min(topN, ranked.length)} by abs % delta ──`);
  console.log(
    `  ${'pick'.padEnd(56)} ${'editorial'.padStart(10)} ${'snapshot'.padStart(10)} ${'Δ%'.padStart(7)} ${'asin'.padEnd(11)} disagree`
  );
  for (const r of ranked.slice(0, topN)) {
    console.log(
      `  ${r.id.padEnd(56)} ${('$' + r.editorialPrice.toFixed(2)).padStart(10)} ${('$' + r.snapshotPrice.toFixed(2)).padStart(10)} ${r.deltaPct.toFixed(1).padStart(6)}% ${r.asin.padEnd(11)} ${r.asinDisagreement ? 'Y' : '-'}`
    );
  }
  console.log('');
  process.exit(0);
}

main();
