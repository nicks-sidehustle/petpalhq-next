#!/usr/bin/env node
/**
 * Generates public/llms.txt — the AI-crawler discovery file per llmstxt.org.
 *
 * Reads guide frontmatter directly from src/content/guides/ so the output
 * always reflects the live content set. Run after adding/updating guides:
 *
 *   npm run generate:llms-txt
 *
 * The output is grouped:
 *   1. Editorial hubs (the 10 cluster guides)
 *   2. Buying guides, sub-grouped by vertical / hub
 *   3. Optional supporting pages (about, methodology, author, legal)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GUIDES_DIR = path.join(ROOT, "src/content/guides");
const OUT_PATH = path.join(ROOT, "public/llms.txt");

const SITE_URL = "https://petpalhq.com";
const SITE_NAME = "PetPalHQ";
const CONTACT_EMAIL = "editor@petpalhq.com";

/**
 * Hub display labels and their vertical buckets. Mirrors the homepage
 * HUB_DISPLAY map. If a new hub ships, add a row here.
 */
const HUB_META = {
  "aquarium-water-quality-cycling-testing-beginners": {
    label: "Aquarium Water Quality, Cycling & Testing",
    vertical: "Aquarium",
  },
  "aquarium-filtration-maintenance-systems": {
    label: "Aquarium Filtration & Maintenance",
    vertical: "Aquarium",
  },
  "reptile-habitat-environmental-control": {
    label: "Reptile Habitat & Environmental Control",
    vertical: "Reptile",
  },
  "reptile-uvb-lighting-basking": {
    label: "Reptile UVB Lighting & Basking",
    vertical: "Reptile",
  },
  "smart-bird-feeders-backyard-birdwatching": {
    label: "Smart Bird Feeders & Backyard Birdwatching",
    vertical: "Birds",
  },
  "cat-dog-nutrition-hydration-digestive-health": {
    label: "Cat & Dog Nutrition, Hydration & Digestive Health",
    vertical: "Cats & Dogs",
  },
  "cat-dog-grooming-dental-shedding": {
    label: "Cat & Dog Grooming, Dental & Shedding",
    vertical: "Cats & Dogs",
  },
  "cat-dog-behavior-anxiety-enrichment": {
    label: "Cat & Dog Behavior, Anxiety & Enrichment",
    vertical: "Cats & Dogs",
  },
  "pet-home-systems-cleanup-travel": {
    label: "Pet Home Systems, Cleanup & Travel",
    vertical: "Cats & Dogs",
  },
  "senior-pet-mobility-preventive-care": {
    label: "Senior Pet Mobility & Preventive Care",
    vertical: "Cats & Dogs",
  },
};

const HUB_ORDER = Object.keys(HUB_META);

const VERTICAL_ORDER = [
  "Aquarium",
  "Reptile",
  "Birds",
  "Cats & Dogs",
];

function readAllGuides() {
  if (!fs.existsSync(GUIDES_DIR)) {
    throw new Error(`Guides directory not found: ${GUIDES_DIR}`);
  }
  return fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const fileContents = fs.readFileSync(path.join(GUIDES_DIR, filename), "utf8");
      const { data } = matter(fileContents);
      return {
        slug,
        title: String(data.title || slug),
        description: String(data.description || data.excerpt || "").trim(),
        excerpt: String(data.excerpt || data.description || "").trim(),
        hub: data.hub ? String(data.hub) : undefined,
        guideType: data.guideType ? String(data.guideType) : undefined,
        category: String(data.category || ""),
      };
    });
}

function shorten(text, max = 180) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function bullet(title, urlPath, description) {
  const desc = shorten(description);
  return `- [${title}](${SITE_URL}${urlPath})${desc ? `: ${desc}` : ""}`;
}

function renderHubsSection(hubs) {
  const lines = [
    "## Editorial hubs",
    "",
    "Cluster guides that synthesize expert consensus on a topic. Each hub links to the buying guides for that vertical.",
    "",
  ];
  for (const slug of HUB_ORDER) {
    const hub = hubs.find((h) => h.slug === slug);
    if (!hub) continue;
    const meta = HUB_META[slug];
    lines.push(bullet(meta.label, `/guides/${slug}`, hub.excerpt || hub.description));
  }
  lines.push("");
  return lines;
}

function renderSpokesByVertical(spokes) {
  const lines = [];
  // Group spokes by their hub, then group hubs by vertical.
  const byHub = new Map();
  for (const slug of HUB_ORDER) byHub.set(slug, []);
  const orphans = [];
  for (const s of spokes) {
    if (s.hub && byHub.has(s.hub)) byHub.get(s.hub).push(s);
    else orphans.push(s);
  }
  for (const slug of HUB_ORDER) {
    byHub.get(slug).sort((a, b) => a.title.localeCompare(b.title));
  }
  orphans.sort((a, b) => a.title.localeCompare(b.title));

  for (const vertical of VERTICAL_ORDER) {
    const verticalHubs = HUB_ORDER.filter((s) => HUB_META[s].vertical === vertical);
    const verticalHasSpokes = verticalHubs.some((s) => byHub.get(s).length > 0);
    if (!verticalHasSpokes) continue;
    lines.push(`## ${vertical} buying guides`);
    lines.push("");
    for (const hubSlug of verticalHubs) {
      const hubSpokes = byHub.get(hubSlug);
      if (!hubSpokes.length) continue;
      lines.push(`### ${HUB_META[hubSlug].label}`);
      lines.push("");
      for (const spoke of hubSpokes) {
        lines.push(bullet(spoke.title, `/guides/${spoke.slug}`, spoke.excerpt || spoke.description));
      }
      lines.push("");
    }
  }

  if (orphans.length) {
    lines.push(`## Other guides`);
    lines.push("");
    for (const orphan of orphans) {
      lines.push(bullet(orphan.title, `/guides/${orphan.slug}`, orphan.excerpt || orphan.description));
    }
    lines.push("");
  }
  return lines;
}

function renderSupporting() {
  return [
    "## Supporting pages",
    "",
    bullet("Methodology", "/methodology", "Source stack, PetPal Gear Score formula (v1.0), refresh policy, and a live data-refresh table for the most-recently-updated guides on the site."),
    bullet("About PetPalHQ", "/about", "Editorial voice, what we cover, why we exist, and how we synthesize expert consensus instead of running a testing lab."),
    bullet("Author — Nick Miles", "/author/nick-miles", "Editor of PetPalHQ and SmartHomeExplorer. Person schema with sameAs cross-domain links."),
    bullet("Affiliate disclosure", "/affiliate-disclosure", `Amazon Associates Program participation, FTC compliance, and the full policy on commissions versus editorial recommendations. Tag: petpalhq08-20.`),
    bullet("Privacy policy", "/privacy-policy", "What we collect, how we use it, third-party processors (Google Analytics, Brevo, ImprovMX, Vercel, Amazon), and CCPA + GDPR rights."),
    bullet("Guides index", "/guides", "Browse all editorial hubs and buying guides."),
    "",
  ];
}

function buildLlmsTxt() {
  const all = readAllGuides();
  const hubs = all.filter((g) => g.guideType === "hub");
  const spokes = all.filter((g) => g.guideType !== "hub");

  const lines = [];
  lines.push(`# ${SITE_NAME}`);
  lines.push("");
  lines.push(
    "> Editorial synthesis of expert consensus for dog, cat, aquarium, reptile, and bird owners. We don't run a testing lab. We cite veterinary references, regulatory guidance, peer-reviewed studies, and manufacturer documentation by name, and date every refresh."
  );
  lines.push("");
  lines.push(
    `${SITE_NAME} groups its content into editorial hubs and buying guides. Hubs synthesize the expert consensus on a topic; buying guides apply that consensus to specific products with the PetPal Gear Score (a transparent, weighted composite of expert opinion). Every claim is attributed to a named source. Every guide carries an updatedDate (editorial freshness) and lastProductCheck (pricing freshness).`
  );
  lines.push("");
  lines.push(
    `Source stack: Merck Veterinary Manual, AAHA, AVMA, AAFP, ISFM, Cornell Feline Health Center, Tufts Cummings Petfoodology, FDA Center for Veterinary Medicine, EPA, CDC Healthy Pets/Healthy People, AAFCO, FAA/TSA, Center for Pet Safety, AVSAB, USDA APHIS, Lafeber Vet, ASPCA Animal Poison Control, peer-reviewed journals, manufacturer technical pages, and named hobbyist communities (signal, never authority).`
  );
  lines.push("");
  lines.push(
    `Cross-domain: ${SITE_NAME} shares editorial direction with the established sister site SmartHomeExplorer (smarthomeexplorer.com); both run the same synthesis discipline applied to different verticals.`
  );
  lines.push("");
  lines.push(`Contact: ${CONTACT_EMAIL}`);
  lines.push("");

  lines.push(...renderHubsSection(hubs));
  lines.push(...renderSpokesByVertical(spokes));
  lines.push(...renderSupporting());

  // Compact trailing blank lines.
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function main() {
  const out = buildLlmsTxt();
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, out, "utf8");
  const guideCount = readAllGuides().length;
  console.log(`✓ wrote ${OUT_PATH}`);
  console.log(`  ${guideCount} guides indexed, ${out.split("\n").length} lines, ${out.length} bytes`);
}

main();
