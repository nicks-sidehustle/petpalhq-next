/**
 * #109 — UNBUYABLE-PROSE GATE.
 *
 * Closes the gap the W4 on PR #106 found by mutation test: planting a full
 * suppressed product name into a rendered `bottomLine` passed ALL FOUR repo
 * gates green (validate:content, dead-asin-guard, Vale, tsc). Nothing in CI
 * looked at whether rendered prose steers a reader at a product they cannot
 * buy. The only instrument that ever did was session tooling — a scratch
 * script that matched name PREFIXES and reported one snippet per field, which
 * is precisely how the `"…Swamp Cooler Vest or Zip"` ghost hid inside a
 * prefix collision with a surviving pick.
 *
 * WHAT "UNBUYABLE" MEANS HERE — deliberately mechanism-agnostic:
 *   suppressedPicks[]            snapshot gate: renders nowhere
 *   picks[] where available===false   dead-asins hard gate / hand-set:
 *                                renders with an honest label and NO CTA
 * Both are unbuyable to a reader, so both are in scope. This union is also why
 * the gate survives the in-flight ruling that moves dead-asins picks from the
 * second bucket into the first: a pick that changes buckets stays in the union,
 * and no assertion here reads the mechanism that put it there.
 *
 * FOUR DETECTORS, each aimed at a class this corpus actually shipped:
 *   D1 NAME/PHRASE  a distinctive multi-token phrase from the pick's name or
 *                   aliases, absent from every surviving pick in that guide.
 *   D2 NEAR-TWIN    the bare-suffix class. When an unbuyable pick and a
 *                   surviving pick share a >=2-token stem, the tokens that
 *                   differ ARE the discriminator, and a lone discriminator
 *                   next to the shared stem is a ghost reference
 *                   ("The Ruffwear Swamp Cooler Vest or Zip"). A prefix
 *                   matcher cannot see this; that is the #109 headline.
 *   D3 LABEL        a pointer at the pick's LABEL rather than its name
 *                   ("the premium pick"), where no surviving pick holds that
 *                   label — found by #107's W4.
 *   D4 PRICE        the pick's rendered price asserted in the same sentence as
 *                   one of its identities.
 *
 * WHY TOKENS ARE SCORED FOR GENERICNESS. A first cut flagged 2,395 occurrences
 * because "skimmer", "cage" and "substrate" are distinguishing tokens of some
 * unbuyable pick somewhere. Genericness is therefore DERIVED from the corpus —
 * a token used in pick names across >= GENERIC_TOKEN_GUIDES distinct guides is
 * category vocabulary, not product identity — rather than hand-listed, so it
 * re-calibrates as the roster changes instead of rotting.
 *
 * REPORTING IS PER-OCCURRENCE, not per-field: the #106 ghost survived a field
 * that had already matched on a different snippet.
 *
 * BASELINE. main carries pre-existing debt this gate did not create (picks with
 * no live offer that prose still sells — the §6.4 "unresolvable picks" class).
 * A gate that lands red gates nothing, so known occurrences live in
 * data/unbuyable-prose-baseline.json. The gate fails on anything NOT in it, so
 * new defects are blocked from day one. Entries are keyed guide+detector+field
 * +phrase, so a NEW defect in an already-baselined field still fails. Stale
 * entries also fail, so the ledger cannot quietly rot as debt is paid down.
 *
 * Run: npx tsx scripts/test/unbuyable-prose-gate.test.ts
 * Mutation spec: npx tsx scripts/test/unbuyable-prose-gate.mutation.test.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllGuides } from '../../src/lib/guides';

export const GENERIC_TOKEN_GUIDES = 8;
/** A SINGLE token is admitted as an identity only when it is MODEL-SHAPED
 *  (carries a digit: "150sss", "wf115") or is the pick's own BRAND token.
 *
 *  Rarity in pick names was tried first and is the wrong proxy: "clay" and
 *  "hardness" are rare in pick names but ordinary in prose, so that bar
 *  produced 507 occurrences dominated by category nouns. Model codes and brand
 *  names are what actually identify a product in a sentence that omits its full
 *  name — which is the whole of the "the 150SSS is the one to buy" evasion. */
const isModelToken = (t: string) => /\d/.test(t) && t.length > 2;
/** Purchase cues. Used to decide whether an unbuyable card's SELF-reference is
 *  a steer ("buy this at $X" on a card with no CTA) or ordinary description. */
const PURCHASE_CUE = /\b(buy|get|order|purchase|pick up|grab|choose|opt for|go with|spring for|upgrade to|add to cart|worth buying|the one to buy)\b/i;
/** Broader recommendation cue. Required wherever the IDENTITY is weak (a lone
 *  token) or the SURFACE is provenance-shaped (`reviewMethod` exists to list
 *  what was consulted, so a bare brand name there is expected and benign — the
 *  §7.6 "manufacturer documentation from …" class the content wave adjudicated).
 *  Without this, single tokens plus reviewMethod produced 1,574 occurrences,
 *  almost all of them source lists. */
const STEER_CUE = new RegExp(
  `${PURCHASE_CUE.source}|\\b(is|are|remains?) the (best|top|one|pick|answer|default|value|winner)\\b` +
  `|\\brecommend(s|ed|ation)?\\b|\\bworth (it|the|paying|every)\\b|\\bwe'd (buy|pick|choose)\\b|\\bour (top|default|value) pick\\b`,
  'i');
/** Surfaces that exist to CITE rather than to sell. */
const PROVENANCE_FIELD = /^reviewMethod$/;
const STOP = new Set(['the','a','an','and','or','for','with','of','in','to','by','on','at','up','x','from','your','all']);

export type Finding = {
  guide: string; detector: 'D1' | 'D2' | 'D3' | 'D4';
  field: string; phrase: string; pick: string; context: string;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s: string) => norm(s).split(' ').filter((t) => t && !STOP.has(t));
const sentences = (t: string) => t.split(/(?<=[.!?])\s+|\n+/);
const rx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every reader-visible prose surface.
 *
 *  An unbuyable pick's OWN comparison column is skipped (a spec cell describing
 *  itself is not a steer), but its own CARD is NOT: `available === false` picks
 *  still render — PickDeepDive.tsx renders `bodyHtml` under the honest-state
 *  label, with no CTA — so a "buy this at $X" sentence on a dead card is a live
 *  defect, and a dead card steering at ANOTHER dead card doubly so. Those
 *  surfaces are returned tagged with the owning pick index so the caller can
 *  require a purchase cue for SELF-reference while treating cross-reference as
 *  an ordinary steer.
 *
 *  `reviewMethod` renders through MethodologyParagraph.tsx and carries ~147k
 *  chars corpus-wide; the first cut never looked at it. */
function proseSurfaces(g: any, gatedCols: Set<number>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const push = (k: string, v: unknown) => {
    if (typeof v === 'string') out.push([k, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => push(`${k}[${i}]`, x));
  };
  push('shortAnswer', g.shortAnswer); push('description', g.description); push('excerpt', g.excerpt);
  push('bottomLine', g.bottomLine); push('whenNotToBuy', g.whenNotToBuy);
  push('forDogs', g.forDogs); push('forCats', g.forCats);
  push('BODY', g.content); // FAQs are markdown body, not a frontmatter key
  push('reviewMethod', g.reviewMethod); // renders via MethodologyParagraph.tsx
  (g.methodology?.factors ?? []).forEach((f: any, i: number) => push(`methodology.factors[${i}].definition`, f?.definition));
  (g.picks ?? []).forEach((p: any, i: number) => {
    const own = p.available === false ? 'unbuyableCard' : 'picks';
    ['body', 'bodyHtml', 'verdict', 'pros', 'cons', 'keyFeatures'].forEach((k) => push(`${own}[${i}].${k}`, p[k]));
  });
  (g.comparison?.rows ?? []).forEach((r: any, i: number) =>
    (r?.values ?? []).forEach((v: unknown, c: number) => { if (!gatedCols.has(c)) push(`comparison.rows[${i}].values[${c}]`, v); }));
  return out;
}

/** An unbuyable card describing ITSELF is ordinary copy; the same card telling
 *  the reader to BUY, with no CTA beneath it, is the defect. Cross-references
 *  (any other surface, or one dead card pointing at another) are steers on
 *  sight. */
function steerable(field: string, u: any, g: any, value: string, at: number, weakIdentity = false): boolean {
  const near = value.slice(Math.max(0, at - 160), at + 160);
  // A lone token is weak evidence of identity; require a recommendation cue so
  // the evasion ("the 150SSS is the one to buy") is caught without flagging
  // every incidental brand word.
  if (weakIdentity && !STEER_CUE.test(near)) return false;
  // Provenance surfaces cite by name as their whole purpose.
  if (PROVENANCE_FIELD.test(field) && !STEER_CUE.test(near)) return false;
  const m = /^unbuyableCard\[(\d+)\]/.exec(field);
  if (!m) return true;
  const owner = (g.picks ?? [])[Number(m[1])];
  if (!owner || owner.name !== u.name) return true; // dead card steering at a DIFFERENT dead pick
  return PURCHASE_CUE.test(near);
}

export function scanCorpus(guides = getAllGuides()): Finding[] {
  // Corpus-derived genericness.
  const tokenGuides = new Map<string, Set<string>>();
  for (const g of guides)
    for (const p of [...(g.picks ?? []), ...((g as any).suppressedPicks ?? [])] as any[])
      for (const t of new Set(toks(p.name ?? ''))) {
        if (!tokenGuides.has(t)) tokenGuides.set(t, new Set());
        tokenGuides.get(t)!.add(g.slug);
      }
  const isGeneric = (t: string) => (tokenGuides.get(t)?.size ?? 0) >= GENERIC_TOKEN_GUIDES;
  const identifying = (phrase: string) => phrase.split(' ').some((t) => !isGeneric(t) && t.length > 2);
  /** model-shaped, or the pick's own brand => identifies a product alone */
  const soloIdentifying = (t: string, brand?: string) =>
    t.length > 2 && !isGeneric(t) && (isModelToken(t) || (!!brand && toks(brand).includes(t)));

  const findings: Finding[] = [];
  for (const g of guides as any[]) {
    const unbuyable = [...(g.suppressedPicks ?? []), ...((g.picks ?? []).filter((p: any) => p.available === false))];
    if (!unbuyable.length) continue;
    const surviving = (g.picks ?? []).filter((p: any) => p.available !== false);
    const gatedCols = new Set<number>();
    (g.picks ?? []).forEach((p: any, i: number) => { if (p.available === false) gatedCols.add(i); });

    const survPhrases = new Set<string>();
    const survLabels = new Set<string>();
    for (const p of surviving) {
      for (const nm of [p.name, ...((p.aliases ?? []) as string[])]) {
        const t = toks(nm ?? '');
        for (let n = 1; n <= t.length; n++) for (let i = 0; i + n <= t.length; i++) survPhrases.add(t.slice(i, i + n).join(' '));
      }
      if (p.label) survLabels.add(norm(p.label));
    }
    const surfaces = proseSurfaces(g, gatedCols);

    for (const u of unbuyable as any[]) {
      const pickName: string = u.name ?? '(unnamed)';

      // ---- D1: distinctive multi-token phrases -----------------------------
      const phrases = new Set<string>();
      for (const nm of [u.name, ...((u.aliases ?? []) as string[])]) {
        const t = toks(nm ?? '');
        for (let n = 2; n <= Math.min(4, t.length); n++)
          for (let i = 0; i + n <= t.length; i++) {
            const p = t.slice(i, i + n).join(' ');
            if (!survPhrases.has(p) && identifying(p)) phrases.add(p);
          }
      }
      const maximal = [...phrases].sort((a, b) => b.length - a.length)
        .filter((p, i, arr) => !arr.slice(0, i).some((q) => q.includes(p)));
      // Single-token identities (the "the 150SSS is the one to buy" evasion).
      // NB: a single token is kept even when it also sits inside a maximal
      // phrase. Excluding those was a bug the spec caught — "Quantalux" is a
      // token of "Zephyrine Quantalux 7700", and the bare "the Quantalux is the
      // one to buy" evasion is precisely the case where the phrase is ABSENT.
      // Double-reporting is avoided at match time by position, not by matcher.
      const singles = [...new Set([u.name, ...((u.aliases ?? []) as string[])].flatMap((nm) => toks(nm ?? '')))]
        .filter((t) => !survPhrases.has(t) && soloIdentifying(t, u.brand));
      const identities = [...maximal, ...singles];
      for (const [field, value] of surfaces) {
        const nv = norm(value);
        // Spans already claimed by a longer phrase match, so a single token
        // inside a full-name mention is not reported twice.
        const claimed: Array<[number, number]> = [];
        for (const p of maximal) { let i = nv.indexOf(p); while (i >= 0) { claimed.push([i, i + p.length]); i = nv.indexOf(p, i + 1); } }
        for (const t of singles) {
          const re = new RegExp(`\\b${rx(t)}\\b`, 'g');
          let m: RegExpExecArray | null;
          while ((m = re.exec(nv))) {
            if (claimed.some(([a, b]) => m!.index >= a && m!.index < b)) continue;
            if (!steerable(field, u, g, value, m.index, true)) continue;
            findings.push({ guide: g.slug, detector: 'D1', field, phrase: t, pick: pickName, context: value.replace(/\s+/g, ' ').slice(Math.max(0, m.index - 70), m.index + 100).trim() });
          }
        }
        for (const p of maximal) {
          let idx = nv.indexOf(p);
          while (idx >= 0) { // per-OCCURRENCE, not per-field
            if (steerable(field, u, g, value, idx))
              findings.push({ guide: g.slug, detector: 'D1', field, phrase: p, pick: pickName, context: value.replace(/\s+/g, ' ').slice(Math.max(0, idx - 70), idx + 100).trim() });
            idx = nv.indexOf(p, idx + 1);
          }
        }
      }

      // ---- D2: near-twin discriminator (the bare-suffix class) -------------
      const uT = toks(u.name ?? '');
      for (const p of surviving) {
        const sT = toks(p.name ?? '');
        let k = 0; while (k < uT.length && k < sT.length && uT[k] === sT[k]) k++;
        if (k < 2) continue;
        // Near-twin-ness is measured by what the names SHARE, not by how much
        // they differ. An earlier cut capped the discriminator count at 2 and
        // therefore skipped "Reef Octopus Regal 150SSS Space Saver Protein
        // Skimmer" vs "Reef Octopus OCTO CR220 …" — six differing tokens, but a
        // two-token brand stem that makes "regal" a perfectly good ghost
        // reference. The cap was the wrong control and the mutation spec caught
        // it. Require instead that the shared stem be IDENTIFYING (carries a
        // non-generic token), so "test kit" or "dog bed" cannot act as a stem.
        const stem = uT.slice(0, k).join(' ');
        if (!stem.split(' ').some((t) => !isGeneric(t) && t.length > 2)) continue;
        const disc = uT.slice(k).filter((t) => !sT.includes(t) && !isGeneric(t) && t.length > 2);
        if (!disc.length) continue;
        for (const [field, value] of surfaces)
          for (const sent of sentences(value)) {
            const ns = norm(sent);
            if (!ns.includes(stem)) continue;
            for (const d of disc)
              if (new RegExp(`\\b${rx(d)}\\b`).test(ns))
                findings.push({ guide: g.slug, detector: 'D2', field, phrase: `${stem} … ${d}`, pick: pickName, context: sent.replace(/\s+/g, ' ').trim().slice(0, 170) });
          }
      }

      // ---- D3: label pointer ----------------------------------------------
      if (u.label) {
        const nl = norm(u.label);
        const core = nl.split(' ').filter((t) => t.length > 3 && !isGeneric(t) && !['pick','best','this','that','with','only'].includes(t));
        if (core.length && !survLabels.has(nl))
          for (const [field, value] of surfaces) {
            const nv = norm(value);
            for (const c of core) {
              const re = new RegExp(`\\b(the|our|its|this)\\s+${rx(c)}\\s+(pick|option|choice|one)\\b`, 'g');
              let m: RegExpExecArray | null;
              while ((m = re.exec(nv)))
                findings.push({ guide: g.slug, detector: 'D3', field, phrase: `label:${c}`, pick: pickName, context: value.replace(/\s+/g, ' ').slice(Math.max(0, m.index - 60), m.index + 100).trim() });
            }
          }
      }

      // ---- D4: price claim in the same sentence as an identity -------------
      if (u.price) {
        const pr = String(u.price).trim();
        for (const [field, value] of surfaces)
          for (const sent of sentences(value)) {
            if (!sent.includes(pr)) continue;
            const ns = norm(sent);
            // Un-gated from D1: a price beside ANY identity, phrase or single
            // token. Gating D4 on a D1 phrase is what let the single-token
            // evasion carry a price claim through untouched.
            if (identities.some((p) => (p.includes(' ') ? ns.includes(p) : new RegExp(`\\b${rx(p)}\\b`).test(ns))))
              findings.push({ guide: g.slug, detector: 'D4', field, phrase: `price:${pr}`, pick: pickName, context: sent.replace(/\s+/g, ' ').trim().slice(0, 170) });
          }
      }
    }
  }
  return findings;
}

export const keyOf = (f: Finding) => `${f.guide}|${f.detector}|${f.field}|${f.phrase}`;
export const BASELINE_PATH = path.join(process.cwd(), 'data', 'unbuyable-prose-baseline.json');

export type BaselineRow = { key: string; count?: number; note?: string };
export type GateRun = { failures: number; findings: Finding[]; errors: string[]; info: string[] };

/**
 * The ledger logic, callable without a process. Extracted because the first
 * mutation spec imported scanCorpus and never executed ANY of this — so
 * disabling the stale check, collapsing count-awareness to key-only, stubbing
 * the vacuity guard to `if (false)`, and de-duplicating per-field instead of
 * per-occurrence ALL survived green. Every branch below is now reachable from
 * the spec against fixture corpora.
 *
 * VACUITY defaults are real thresholds, not decoration: a corpus with no
 * unbuyable picks, or one whose parsed prose has collapsed, makes every
 * assertion pass trivially, so both fail loudly instead.
 */
export function runGate(opts: {
  guides?: any[];
  baseline?: BaselineRow[];
  minProseChars?: number;
  minUnbuyablePicks?: number;
} = {}): GateRun {
  const guides = opts.guides ?? getAllGuides();
  const minProse = opts.minProseChars ?? 100_000;
  const minUnbuyable = opts.minUnbuyablePicks ?? 1;
  const errors: string[] = [];
  const info: string[] = [];
  const fail = (m: string) => errors.push(m);

  const findings = scanCorpus(guides as any);

  const unbuyableTotal = guides.reduce(
    (n: number, g: any) => n + ((g.suppressedPicks?.length ?? 0) + (g.picks ?? []).filter((p: any) => p.available === false).length), 0);
  if (unbuyableTotal < minUnbuyable)
    fail(`VACUITY: corpus reports ${unbuyableTotal} unbuyable picks (min ${minUnbuyable}) — the gate cannot detect anything`);
  const proseChars = guides.reduce((n: number, g: any) => n + (g.shortAnswer?.length ?? 0) + (g.content?.length ?? 0), 0);
  if (proseChars < minProse)
    fail(`VACUITY: only ${proseChars} chars of prose surfaced (min ${minProse}) — parseGuide output looks empty`);

  const baseline: BaselineRow[] = opts.baseline
    ?? (fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')).accepted ?? [] : []);

  // COUNT-AWARE, PER-OCCURRENCE. Occurrences collapse into fewer keys, so a
  // key-only ledger would let a SECOND defect hide behind an accepted first one
  // in the same field — the exact mechanism that hid the #106 ghost.
  const allowed = new Map(baseline.map((b) => [b.key, b.count ?? 1]));
  const observed = new Map<string, Finding[]>();
  for (const f of findings) {
    const k = keyOf(f);
    const arr = observed.get(k);
    if (arr) arr.push(f); else observed.set(k, [f]);
  }

  let fresh = 0;
  for (const [k, hits] of observed) {
    const budget = allowed.get(k) ?? 0;
    for (const f of hits.slice(budget)) {
      fresh++;
      fail(`${f.guide} [${f.field}] ${f.detector} steers at UNBUYABLE "${f.pick.slice(0, 52)}" via ${JSON.stringify(f.phrase)}\n         …${f.context}…`);
    }
  }

  const stale = [...allowed.keys()].filter((k) => !observed.has(k));
  for (const k of stale) fail(`STALE baseline entry no longer matches — delete it from data/unbuyable-prose-baseline.json: ${k}`);

  for (const [k, h] of observed)
    if (allowed.has(k) && h.length < allowed.get(k)!) info.push(`debt reduced (re-seed when convenient): ${k} ${allowed.get(k)} -> ${h.length}`);

  const byDetector = findings.reduce<Record<string, number>>((a, f) => ((a[f.detector] = (a[f.detector] || 0) + 1), a), {});
  info.push(`unbuyable picks in corpus: ${unbuyableTotal} · occurrences: ${findings.length} ${JSON.stringify(byDetector)}`);
  info.push(`baseline rows: ${allowed.size} (${[...allowed.values()].reduce((a, b) => a + b, 0)} occurrences) · new: ${fresh} · stale: ${stale.length}`);

  return { failures: errors.length, findings, errors, info };
}

function main() {
  const findings = scanCorpus();
  // `--write-baseline` re-seeds the ledger. Use it when ADOPTING the gate or
  // after a deliberate debt paydown — never to silence a fresh finding, which
  // is what the reviewer on any PR touching this file should be checking.
  if (process.argv.includes('--write-baseline')) {
    const counts = new Map<string, BaselineRow & { count: number }>();
    for (const f of findings) {
      const k = keyOf(f);
      const row = counts.get(k);
      if (row) row.count++;
      else counts.set(k, { key: k, count: 1, note: `${f.detector} · ${f.pick.slice(0, 60)} · ${f.context.slice(0, 110)}` });
    }
    const accepted = [...counts.values()].sort((a, b) => a.key.localeCompare(b.key));
    fs.writeFileSync(BASELINE_PATH, JSON.stringify({
      $comment: 'Pre-existing unbuyable-prose debt accepted when scripts/test/unbuyable-prose-gate.test.ts was adopted (#109). Each row is one occurrence the gate found on main at adoption. Deleting a row is how debt is retired; the gate FAILS on a row that no longer matches, so this file cannot rot. Adding a row silences a real finding — review accordingly.',
      generated: new Date().toISOString().slice(0, 10),
      accepted,
    }, null, 2) + '\n');
    console.log(`wrote ${accepted.length} baseline entries to ${BASELINE_PATH}`);
    return;
  }

  const r = runGate();
  r.errors.forEach((e) => console.error(`  FAIL: ${e}`));
  r.info.forEach((i) => console.log(i));
  if (r.failures) { console.error(`\n${r.failures} failure(s)`); process.exit(1); }
  console.log('unbuyable-prose-gate: PASS');
}

// Entry guard. The first cut used `new URL(import.meta.url).pathname`, which
// percent-encodes spaces: under a checkout path containing a space the compare
// silently failed, main() never ran, and the gate exited 0 having asserted
// NOTHING. fileURLToPath decodes correctly — and if the comparison throws for
// any reason we RUN the gate rather than skip it, so the failure mode is a
// noisy gate rather than a silent pass.
let isEntry = true;
try {
  isEntry = !!process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
} catch {
  isEntry = true; // fail-closed
}
if (isEntry) main();
