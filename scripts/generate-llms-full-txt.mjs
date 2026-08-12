#!/usr/bin/env node
/**
 * Generates public/llms-full.txt — the extended-content variant of llms.txt
 * for AI crawlers that prefer fetching one consolidated full-content file
 * instead of crawling each guide individually.
 *
 * Per guide, includes: title, URL, dates, excerpt, shortAnswer, top picks
 * (1-3 winners), methodology formula, all product picks (rank/name/brand/
 * score/price/asin/verdict + ownerVoice community quotes when present),
 * and bottom-line summary.
 *
 * Usage: npm run generate:llms-full-txt
 *
 * Output is grouped by vertical → hub → spoke, mirroring llms.txt's
 * navigation order so an LLM that ingested both files sees consistent
 * structure.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GUIDES_DIR = path.join(ROOT, "src/content/guides");
const OUT_PATH = path.join(ROOT, "public/llms-full.txt");
const GUARD_PATH = path.join(ROOT, "data/dead-asins.json");

// §8m dead-ASIN guard / AI-surface parity (repo CLAUDE.md non-negotiable):
// this generator reads guide frontmatter directly via gray-matter — it does
// NOT go through parsePicks() in src/lib/guides.ts, so the runtime guard that
// forces `available: false` never touches it. Read data/dead-asins.json
// directly here so llms-full.txt can't emit a guarded ASIN in a buyable role
// while the live site correctly gates it. See src/lib/dead-asin-guard.ts for
// the same lookup used by the render path.
const DEAD_ASINS = fs.existsSync(GUARD_PATH)
  ? JSON.parse(fs.readFileSync(GUARD_PATH, "utf8"))
  : {};

/**
 * Owner ruling 2026-08-12: a hard-gated pick is SUPPRESSED, not labelled — on
 * every surface, this one included. Emitting "Availability: currently
 * unavailable" into the AI-crawler feed is the same defect the site render just
 * stopped committing, aimed at the readers who cite us most.
 *
 * Keyed by ASIN, and by PICK REFERENCE ("<slug>#<rank>") for picks that have no
 * resolvable ASIN — mirrors getPickGuardEntry() in src/lib/dead-asin-guard.ts.
 */
function isSuppressedPick(asin, slug, rank) {
  const entry =
    (asin ? DEAD_ASINS[asin] : undefined) ??
    (typeof rank === "number" ? DEAD_ASINS[`${slug}#${rank}`] : undefined);
  return !!entry && (entry.status === "dead" || entry.status === "no_offer" || entry.status === "no_listing");
}

/** USED-BUYBOX -> ASIN kept + condition disclosure. undefined -> clean, unchanged output. */
function guardNoteFor(asin) {
  if (!asin) return undefined;
  const entry = DEAD_ASINS[asin];
  if (!entry) return undefined;
  if (entry.status === "used_buybox") {
    return {
      omitAsin: false,
      note: `Availability note: may ship from a used-condition listing — verify condition before buying (checked ${entry.lastVerified})`,
    };
  }
  const label =
    entry.status === "dead"
      ? `no longer available — delisted (checked ${entry.lastVerified})`
      : `currently unavailable (checked ${entry.lastVerified})`;
  return { omitAsin: true, note: `Availability: ${label}` };
}

const SITE_URL = "https://petpalhq.com";
const SITE_NAME = "PetPalHQ";
const CONTACT_EMAIL = "editor@petpalhq.com";

// Mirror llms.txt navigation order so AI crawlers see consistent structure.
const HUB_META = {
  "aquarium-water-quality-cycling-testing-beginners": { label: "Aquarium Water Quality, Cycling & Testing", vertical: "Aquarium" },
  "aquarium-filtration-maintenance-systems": { label: "Aquarium Filtration & Maintenance", vertical: "Aquarium" },
  "reptile-habitat-environmental-control": { label: "Reptile Habitat & Environmental Control", vertical: "Reptile" },
  "reptile-uvb-lighting-basking": { label: "Reptile UVB Lighting & Basking", vertical: "Reptile" },
  "smart-bird-feeders-backyard-birdwatching": { label: "Smart Bird Feeders & Backyard Birdwatching", vertical: "Birds" },
  "cat-dog-nutrition-hydration-digestive-health": { label: "Cat & Dog Nutrition, Hydration & Digestive Health", vertical: "Cats & Dogs" },
  "cat-dog-grooming-dental-shedding": { label: "Cat & Dog Grooming, Dental & Shedding", vertical: "Cats & Dogs" },
  "cat-dog-behavior-anxiety-enrichment": { label: "Cat & Dog Behavior, Anxiety & Enrichment", vertical: "Cats & Dogs" },
  "pet-home-systems-cleanup-travel": { label: "Pet Home Systems, Cleanup & Travel", vertical: "Cats & Dogs" },
  "senior-pet-mobility-preventive-care": { label: "Senior Pet Mobility & Preventive Care", vertical: "Cats & Dogs" },
};
const HUB_ORDER = Object.keys(HUB_META);
const VERTICAL_ORDER = ["Aquarium", "Reptile", "Birds", "Cats & Dogs"];

function readAllGuides() {
  if (!fs.existsSync(GUIDES_DIR)) throw new Error(`Guides directory not found: ${GUIDES_DIR}`);
  return fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const fileContents = fs.readFileSync(path.join(GUIDES_DIR, filename), "utf8");
      const { data } = matter(fileContents);
      return { slug, data };
    });
}

function s(v, fallback = "") {
  if (v === undefined || v === null) return fallback;
  if (v instanceof Date) return v.toISOString().split("T")[0];
  return String(v).trim();
}

function arr(v) {
  return Array.isArray(v) ? v : [];
}

function renderGuide(g) {
  const { slug, data } = g;
  const title = s(data.title, slug);
  const url = `${SITE_URL}/guides/${slug}`;
  const lines = [];

  lines.push(`## ${title}`);
  lines.push("");
  lines.push(`URL: ${url}`);
  if (s(data.publishDate)) lines.push(`Published: ${s(data.publishDate)}${s(data.updatedDate) ? `  |  Updated: ${s(data.updatedDate)}` : ""}`);
  if (s(data.category)) lines.push(`Category: ${s(data.category)}${s(data.hub) ? `  |  Hub: ${s(data.hub)}` : ""}`);
  lines.push("");

  if (s(data.excerpt)) {
    lines.push(`> ${s(data.excerpt)}`);
    lines.push("");
  }

  if (s(data.shortAnswer)) {
    lines.push("### Quick answer");
    lines.push(s(data.shortAnswer));
    lines.push("");
  }

  if (s(data.reviewMethod)) {
    lines.push("### Review method");
    lines.push(s(data.reviewMethod));
    lines.push("");
  }

  // "Top picks (winners)" is a SECOND recommendation surface authored separately
  // from `picks`, so the roster filter above does not cover it — and its entries
  // are routinely ABBREVIATED forms of the pick name, which is why an equality
  // join leaks. Same best-affinity join parseGuide() uses (guides.ts topPicks
  // filter): resolve each entry across the whole roster and drop it only when
  // its best match is a suppressed pick.
  const suppressedNames = arr(data.picks)
    .filter((p) => isSuppressedPick(s(p?.asin), slug, typeof p?.rank === "number" ? p.rank : undefined))
    .map((p) => s(p?.name));
  const topPicks = arr(data.topPicks).filter((tp) => {
    if (!suppressedNames.length) return true;
    const norm = (v) => v.toLowerCase().replace(/\s+/g, " ").trim();
    const prefixLen = (x, y) => {
      const n = Math.min(x.length, y.length);
      let i = 0;
      while (i < n && x[i] === y[i]) i++;
      return i;
    };
    const t = norm(s(tp?.name));
    let best = null;
    for (const p of arr(data.picks)) {
      const rn = norm(s(p?.name));
      const contains = t.includes(rn) || rn.includes(t);
      const score = contains ? Math.min(t.length, rn.length) : prefixLen(t, rn);
      if (score < 12) continue;
      if (!best || score > best.score) best = { score, suppressed: suppressedNames.includes(s(p?.name)) };
    }
    return !best?.suppressed;
  });
  if (topPicks.length) {
    lines.push("### Top picks (winners)");
    topPicks.forEach((p, i) => {
      const name = s(p?.name);
      const kf = s(p?.keyFeature);
      if (name) lines.push(`${i + 1}. ${name}${kf ? ` — ${kf}` : ""}`);
    });
    lines.push("");
  }

  const m = data.methodology;
  if (m && typeof m === "object") {
    lines.push("### PetPal Gear Score methodology");
    if (s(m.formula)) lines.push(`Formula: ${s(m.formula)}`);
    const factors = arr(m.factors);
    if (factors.length) {
      factors.forEach((f) => {
        const name = s(f?.name);
        const weight = f?.weight;
        const def = s(f?.definition);
        if (name) lines.push(`- ${name}${typeof weight === "number" ? ` (${weight})` : ""}${def ? `: ${def}` : ""}`);
      });
    }
    lines.push("");
  }

  // Suppressed picks are dropped BEFORE anything is emitted, so no name, price,
  // verdict, ASIN or availability note for an unbuyable pick reaches the feed.
  const picks = arr(data.picks).filter(
    (p) => !isSuppressedPick(s(p?.asin), slug, typeof p?.rank === "number" ? p.rank : undefined),
  );
  if (picks.length) {
    lines.push("### Product picks");
    picks.forEach((p) => {
      const rank = typeof p?.rank === "number" ? p.rank : "?";
      const label = s(p?.label);
      const name = s(p?.name);
      const brand = s(p?.brand);
      const score = typeof p?.score === "number" ? `${p.score}/10` : "";
      const price = s(p?.price);
      const asin = s(p?.asin);
      const guard = guardNoteFor(asin);
      lines.push(`#### Rank ${rank}${label ? ` — ${label}` : ""}: ${name}`);
      const meta = [
        brand && `Brand: ${brand}`,
        score && `Score: ${score}`,
        price && `Price: ${price}`,
        asin && !guard?.omitAsin && `ASIN: ${asin}`,
      ].filter(Boolean);
      if (meta.length) lines.push(meta.join("  |  "));
      if (guard?.note) lines.push(guard.note);

      const keyFeatures = arr(p?.keyFeatures);
      if (keyFeatures.length) {
        lines.push("Key features:");
        keyFeatures.forEach((kf) => lines.push(`- ${s(kf)}`));
      }

      const pros = arr(p?.pros);
      if (pros.length) {
        lines.push("Pros:");
        pros.forEach((pr) => lines.push(`- ${s(pr)}`));
      }

      const cons = arr(p?.cons);
      if (cons.length) {
        lines.push("Cons:");
        cons.forEach((c) => lines.push(`- ${s(c)}`));
      }

      if (s(p?.verdict)) {
        lines.push(`Verdict: ${s(p.verdict)}`);
      }

      // Community quotes (verbatim from forum threads — never AI-generated)
      const ownerVoice = arr(p?.ownerVoice);
      if (ownerVoice.length) {
        lines.push("Community signal (verbatim quotes from public forum threads):");
        ownerVoice.forEach((q) => {
          const quote = s(q?.quote);
          const sourceLabel = s(q?.sourceLabel);
          const author = s(q?.author);
          const date = s(q?.date);
          const sourceUrl = s(q?.sourceUrl);
          if (quote) {
            lines.push(`- "${quote}" — ${author || "community member"}, ${sourceLabel || "forum"}, ${date}${sourceUrl ? ` (${sourceUrl})` : ""}`);
          }
        });
      }

      // Active deals (auto-hidden when expired in the live render — included
      // here as a snapshot at generation time)
      if (p?.promo && typeof p.promo === "object") {
        const promo = p.promo;
        const expiry = s(promo.expiry);
        const today = new Date().toISOString().split("T")[0];
        if (expiry >= today) {
          lines.push(`Active deal: ${s(promo.discount)}${s(promo.code) ? ` (code: ${s(promo.code)})` : ""}, valid through ${expiry} (verified ${s(promo.verifiedDate)})`);
        }
      }

      lines.push("");
    });
  }

  if (Array.isArray(data.bottomLine) && data.bottomLine.length) {
    lines.push("### Bottom line");
    data.bottomLine.forEach((bl) => lines.push(s(bl)));
    lines.push("");
  }

  if (s(data.whenNotToBuy)) {
    lines.push("### When not to buy");
    lines.push(s(data.whenNotToBuy));
    lines.push("");
  }

  const sources = data.sources;
  if (sources && typeof sources === "object") {
    const expert = arr(sources.expert);
    const community = arr(sources.community);
    if (expert.length || community.length) {
      lines.push("### Sources");
      if (expert.length) lines.push(`Expert: ${expert.map(s).join("; ")}`);
      if (community.length) lines.push(`Community: ${community.map(s).join("; ")}`);
      if (s(sources.verifiedDate)) lines.push(`Verified: ${s(sources.verifiedDate)}`);
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  return lines;
}

function buildLlmsFullTxt() {
  const all = readAllGuides();
  // Only the 10 canonical vertical hubs (HUB_ORDER/HUB_META) render in the
  // "Editorial hubs" section. Some standalone guides also carry
  // guideType: "hub" (they have their own `spokes:` frontmatter list for
  // on-page cross-linking) without being one of the 10 site-wide verticals —
  // those must still flow through as regular content pages (spokes/orphans),
  // or they are silently dropped entirely since the hubs loop only iterates
  // HUB_ORDER. (§8m: fixed at the generator, not by hand-editing output.)
  const hubs = all.filter((g) => g.data.guideType === "hub" && HUB_ORDER.includes(g.slug));
  const hubSlugs = new Set(hubs.map((h) => h.slug));
  const spokes = all.filter((g) => !hubSlugs.has(g.slug));

  const out = [];
  out.push(`# ${SITE_NAME} — Full Content Index`);
  out.push("");
  out.push(
    "> Extended content variant of llms.txt for AI crawlers that prefer one consolidated full-content file. Each guide below includes the editorial synthesis (excerpt, methodology, top picks, all product picks with verdicts, community signals, sources)."
  );
  out.push("");
  out.push(`Editorial synthesis of expert consensus for dog, cat, aquarium, reptile, and bird owners. We do not run a testing lab. We cite veterinary references, regulatory guidance, peer-reviewed studies, and manufacturer documentation by name, and date every refresh.`);
  out.push("");
  out.push(`Source stack: Merck Veterinary Manual, AAHA, AVMA, AAFP, ISFM, Cornell Feline Health Center, Tufts Cummings Petfoodology, FDA Center for Veterinary Medicine, EPA, CDC Healthy Pets/Healthy People, AAFCO, FAA/TSA, Center for Pet Safety, AVSAB, USDA APHIS, Lafeber Vet, ASPCA Animal Poison Control, peer-reviewed journals, manufacturer technical pages, and named hobbyist communities (signal, never authority).`);
  out.push("");
  out.push(`Community quotes are verbatim from public forum threads (Reddit primarily). Quotes are sourced via a verbatim-only fetcher script — never paraphrased, summarized, or AI-generated. Each quote includes the source URL, date, and author handle (anonymized to "community member" by default).`);
  out.push("");
  out.push(`Active deals are manually verified against manufacturer/brand sites and auto-hidden after expiry. Snapshot date below reflects the file generation time, not a live state — verify current deals at ${SITE_URL}/deals.`);
  out.push("");
  out.push(`Contact: ${CONTACT_EMAIL}`);
  out.push("");
  out.push(`Generated: ${new Date().toISOString().split("T")[0]}`);
  out.push("");
  out.push("---");
  out.push("");

  // Hubs section
  out.push("# Editorial hubs");
  out.push("");
  for (const slug of HUB_ORDER) {
    const hub = hubs.find((h) => h.slug === slug);
    if (!hub) continue;
    out.push(...renderGuide(hub));
  }

  // Spokes by vertical → hub
  const byHub = new Map();
  for (const slug of HUB_ORDER) byHub.set(slug, []);
  const orphans = [];
  for (const sp of spokes) {
    if (sp.data.hub && byHub.has(s(sp.data.hub))) {
      byHub.get(s(sp.data.hub)).push(sp);
    } else {
      orphans.push(sp);
    }
  }
  for (const slug of HUB_ORDER) {
    byHub.get(slug).sort((a, b) => s(a.data.title).localeCompare(s(b.data.title)));
  }
  orphans.sort((a, b) => s(a.data.title).localeCompare(s(b.data.title)));

  for (const vertical of VERTICAL_ORDER) {
    const verticalHubs = HUB_ORDER.filter((s) => HUB_META[s].vertical === vertical);
    const verticalHasSpokes = verticalHubs.some((s) => byHub.get(s).length > 0);
    if (!verticalHasSpokes) continue;
    out.push(`# ${vertical} buying guides`);
    out.push("");
    for (const hubSlug of verticalHubs) {
      const hubSpokes = byHub.get(hubSlug);
      if (!hubSpokes.length) continue;
      for (const sp of hubSpokes) {
        out.push(...renderGuide(sp));
      }
    }
  }

  const playgroundOrphans = orphans.filter((g) => s(g.data.category).toLowerCase() === "playground");
  const otherOrphans = orphans.filter((g) => s(g.data.category).toLowerCase() !== "playground");

  if (playgroundOrphans.length) {
    out.push("# PetPal Playground");
    out.push("");
    out.push("Novelty picks, costume guides, and pop-culture pet finds. Editorially distinct from the vet-cited buying guides above; safety considerations are still flagged. Different scoring rubric per guide (Pawsome Pop Score, Pool Day Score, Sun-Ready Score, etc.).");
    out.push("");
    for (const g of playgroundOrphans) out.push(...renderGuide(g));
  }

  if (otherOrphans.length) {
    out.push("# Other guides");
    out.push("");
    for (const g of otherOrphans) out.push(...renderGuide(g));
  }

  // Supporting pages
  out.push("# Supporting pages");
  out.push("");
  out.push(`- [PetPal Gear Score methodologies](${SITE_URL}/scores): Aggregator of all PetPal Gear Score formulas across the site, grouped by vertical.`);
  out.push("");

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function main() {
  const out = buildLlmsFullTxt();
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, out, "utf8");
  console.log(`✓ wrote ${OUT_PATH}`);
  console.log(`  ${out.split("\n").length} lines, ${(out.length / 1024).toFixed(1)} KB`);
}

main();
