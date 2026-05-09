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

  const topPicks = arr(data.topPicks);
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

  const picks = arr(data.picks);
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
      lines.push(`#### Rank ${rank}${label ? ` — ${label}` : ""}: ${name}`);
      const meta = [
        brand && `Brand: ${brand}`,
        score && `Score: ${score}`,
        price && `Price: ${price}`,
        asin && `ASIN: ${asin}`,
      ].filter(Boolean);
      if (meta.length) lines.push(meta.join("  |  "));

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
  const hubs = all.filter((g) => g.data.guideType === "hub");
  const spokes = all.filter((g) => g.data.guideType !== "hub");

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
