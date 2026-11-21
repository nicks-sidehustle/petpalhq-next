#!/usr/bin/env npx tsx
/**
 * Generates the seasonal rail card map (owner 2026-11-19, Black Friday week).
 * THE GENERATOR IS THE SOURCE: never hand-edit the JSON it writes; change the
 * rule here (or the shared eligibility module) and re-run.
 *
 *   npx tsx scripts/generate-seasonal-rail.ts            # write
 *   npx tsx scripts/generate-seasonal-rail.ts --check    # exit 1 if stale
 *
 * Rule, per guide (sorted by slug):
 *   - Source = the guide itself. Its verdicts are written for its own page
 *     ("the highest maker rating here"), so a verdict sentence is only true
 *     verbatim on that page; borrowing a sibling's pick would put "here" on the
 *     wrong page.
 *   - Skip the guide when its title fails isCleanCardText (the title prints in
 *     the "From our <title> guide" backlink).
 *   - Card = the lowest-rank pick that isEligibleSeasonalPick() and whose
 *     verdict's first sentence passes seasonalNoteFromVerdict(). No eligible
 *     pick → no card. Five honest cards beat eight padded (§5).
 *
 * Output: src/config/seasonal-rail-black-friday-2026.json, { pageSlug: {
 * fromGuide, asin } } sorted by slug. Names, notes and titles are NOT stored —
 * rail-promo.ts reads them from current frontmatter at render.
 */
import fs from "node:fs";
import path from "node:path";
import { getAllGuides } from "../src/lib/guides";
import {
  isCleanCardText,
  isEligibleSeasonalPick,
  seasonalNoteFromVerdict,
} from "../src/lib/content/seasonal-rail-eligibility";

const OUT = path.join(process.cwd(), "src/config/seasonal-rail-black-friday-2026.json");

const map: Record<string, { fromGuide: string; asin: string }> = {};
let skippedTitle = 0;
let noPick = 0;
const guides = getAllGuides().sort((a, b) => a.slug.localeCompare(b.slug));
for (const g of guides) {
  if (!isCleanCardText(g.title)) {
    skippedTitle++;
    continue;
  }
  const picks = [...(g.picks ?? [])].sort((a, b) => a.rank - b.rank);
  const pick = picks.find((p) => isEligibleSeasonalPick(p) && seasonalNoteFromVerdict(p.verdict));
  if (!pick) {
    noPick++;
    continue;
  }
  map[g.slug] = { fromGuide: g.slug, asin: pick.asin! };
}

const json = JSON.stringify(map, null, 2) + "\n";
const asins = new Set(Object.values(map).map((c) => c.asin));
console.log(
  `seasonal rail: ${guides.length} guides → ${Object.keys(map).length} cards, ${asins.size} distinct ASINs ` +
    `(skipped: ${skippedTitle} title, ${noPick} no eligible pick/verdict)`,
);

if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error(`STALE: ${path.relative(process.cwd(), OUT)} differs from generator output; re-run without --check.`);
    process.exit(1);
  }
  console.log("up to date");
} else {
  fs.writeFileSync(OUT, json);
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
}
