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
import { getAllGuides } from '../../src/lib/guides';

export const GENERIC_TOKEN_GUIDES = 8;
const STOP = new Set(['the','a','an','and','or','for','with','of','in','to','by','on','at','up','x','from','your','all']);

export type Finding = {
  guide: string; detector: 'D1' | 'D2' | 'D3' | 'D4';
  field: string; phrase: string; pick: string; context: string;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s: string) => norm(s).split(' ').filter((t) => t && !STOP.has(t));
const sentences = (t: string) => t.split(/(?<=[.!?])\s+|\n+/);
const rx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every reader-visible prose surface, minus each unbuyable pick's OWN entry
 *  and its own comparison column — a card describing itself is not a steer. */
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
  (g.methodology?.factors ?? []).forEach((f: any, i: number) => push(`methodology.factors[${i}].definition`, f?.definition));
  (g.picks ?? []).forEach((p: any, i: number) => {
    if (p.available === false) return;
    ['body', 'verdict', 'pros', 'cons', 'keyFeatures'].forEach((k) => push(`picks[${i}].${k}`, p[k]));
  });
  (g.comparison?.rows ?? []).forEach((r: any, i: number) =>
    (r?.values ?? []).forEach((v: unknown, c: number) => { if (!gatedCols.has(c)) push(`comparison.rows[${i}].values[${c}]`, v); }));
  return out;
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
      for (const [field, value] of surfaces) {
        const nv = norm(value);
        for (const p of maximal) {
          let idx = nv.indexOf(p);
          while (idx >= 0) { // per-OCCURRENCE, not per-field
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
            if (maximal.some((p) => ns.includes(p)))
              findings.push({ guide: g.slug, detector: 'D4', field, phrase: `price:${pr}`, pick: pickName, context: sent.replace(/\s+/g, ' ').trim().slice(0, 170) });
          }
      }
    }
  }
  return findings;
}

export const keyOf = (f: Finding) => `${f.guide}|${f.detector}|${f.field}|${f.phrase}`;
export const BASELINE_PATH = path.join(process.cwd(), 'data', 'unbuyable-prose-baseline.json');

function main() {
  const findings = scanCorpus();
  // `--write-baseline` re-seeds the ledger. Use it when ADOPTING the gate or
  // after a deliberate debt paydown — never to silence a fresh finding, which
  // is what the reviewer on any PR touching this file should be checking.
  if (process.argv.includes('--write-baseline')) {
    const counts = new Map<string, { key: string; count: number; note: string }>();
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
  const guides = getAllGuides();

  let failures = 0;
  const fail = (m: string) => { failures++; console.error(`  FAIL: ${m}`); };

  // VACUITY. If the corpus stops carrying unbuyable picks, or the surfaces stop
  // yielding prose, every assertion below passes trivially. Assert the gate
  // still has something to look at before trusting a green run.
  const unbuyableTotal = guides.reduce((n, g: any) => n + ((g.suppressedPicks?.length ?? 0) + (g.picks ?? []).filter((p: any) => p.available === false).length), 0);
  if (unbuyableTotal === 0) fail('VACUITY: corpus reports zero unbuyable picks — the gate cannot detect anything');
  const proseChars = guides.reduce((n, g: any) => n + (g.shortAnswer?.length ?? 0) + (g.content?.length ?? 0), 0);
  if (proseChars < 100_000) fail(`VACUITY: only ${proseChars} chars of prose surfaced — parseGuide output looks empty`);

  const baseline: Array<{ key: string; count?: number; note?: string }> = fs.existsSync(BASELINE_PATH)
    ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')).accepted ?? []
    : [];
  // COUNT-AWARE. 186 occurrences collapse into 155 keys, so a key-only ledger
  // would let a SECOND defect hide behind an accepted first one in the same
  // field. Each row carries the occurrence count it was seeded with; anything
  // above that is a new defect even when the key is already known.
  const allowed = new Map(baseline.map((b) => [b.key, b.count ?? 1]));
  const observed = new Map<string, Finding[]>();
  for (const f of findings) { const k = keyOf(f); (observed.get(k) ?? observed.set(k, []).get(k)!).push(f); }

  let fresh = 0;
  for (const [k, hits] of observed) {
    const budget = allowed.get(k) ?? 0;
    for (const f of hits.slice(budget)) {
      fresh++;
      fail(`${f.guide} [${f.field}] ${f.detector} steers at UNBUYABLE "${f.pick.slice(0, 52)}" via ${JSON.stringify(f.phrase)}\n         …${f.context}…`);
    }
  }

  // Stale-entry pruning: a fully paid-down row must be deleted, not left to rot.
  const stale = [...allowed.keys()].filter((k) => !observed.has(k));
  for (const k of stale) fail(`STALE baseline entry no longer matches — delete it from data/unbuyable-prose-baseline.json: ${k}`);
  // Partial paydown is progress, not a failure — but say so, so the ledger gets re-seeded.
  const shrunk = [...observed.entries()].filter(([k, h]) => allowed.has(k) && h.length < allowed.get(k)!);
  for (const [k, h] of shrunk) console.log(`  debt reduced (re-seed when convenient): ${k} ${allowed.get(k)} -> ${h.length}`);

  const byDetector = findings.reduce<Record<string, number>>((a, f) => ((a[f.detector] = (a[f.detector] || 0) + 1), a), {});
  console.log(`unbuyable picks in corpus: ${unbuyableTotal} · occurrences: ${findings.length} ${JSON.stringify(byDetector)}`);
  console.log(`baseline rows: ${allowed.size} (${[...allowed.values()].reduce((a,b)=>a+b,0)} occurrences) · new: ${fresh} · stale: ${stale.length}`);

  if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
  console.log('unbuyable-prose-gate: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
