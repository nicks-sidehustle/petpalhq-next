# PetPalHQ Batch-20 Writer Contract (2026-06-10)

Authoritative contract for every guide in this batch. Deviation = defect.

## Ground truth files (READ FIRST, in order)
1. `/Users/Nick/petpalhq-next/src/content/guides/best-dog-backyard-agility-kits-2026.md` — structural exemplar. Mirror its frontmatter shape and body architecture EXACTLY (same keys, same section types). Read it in full before writing a word.
2. `/Users/Nick/petpalhq-next/PIPELINE-CONFIG.md` — voice, banned phrases, content rules, scoring system, citable sources.
3. Your research packet: `/Users/Nick/petpalhq-next/.batch-20/research/{slug}.json` — the ONLY permitted source of product facts.

## Hard rules — product data integrity
- Use ONLY products in your research packet. NEVER invent or substitute an ASIN, price, spec, or review claim.
- `asin:` = bare 10-char ASIN. NEVER put a URL or `tag=` anywhere in the file (links are built at render time with petpalhq08-20).
- `image:` = the exact `imageUrl` from the packet (m.media-amazon.com URL).
- `price:` = the exact price from the packet.
- Product names in `name:` = the packet title (trim to a readable length, keep brand + model).
- Every pick needs `aliases:` — 2–3 short natural names used in body prose (brand, brand+model). Body mentions of these auto-link to Amazon, so use aliases naturally in prose a few times.
- Spec/consensus claims in pick bodies must trace to the packet's `evidence` notes. If the packet doesn't support a claim, write around it — do not fabricate.

## Frontmatter (copy exemplar shape)
Required: title, description, excerpt, category, species, guideType: "spoke", publishDate: "2026-06-10", updatedDate: "2026-06-10", readTime, featured: false, heroImage: "/images/guides/{slug}.png", products: [], reviewMethod, lastProductCheck: "2026-06-10", expertSourceCount, shortAnswer, topPicks (3), picks (4), comparison, methodology, bottomLine, whenNotToBuy, sources, related.
- `category:` exactly one of: "Cats & Dogs", "Playground", "Aquarium", "Reptile", "Birds" (as assigned in your topic).
- `species:` e.g. ["dog"], ["cat"], ["cat","dog"] — for Aquarium use ["fish"], Reptile ["reptile"], Birds ["bird"] (check exemplars in that category first, e.g. best-aquarium-water-test-kits-2026.md, best-reptile-thermostats-2026.md, best-smart-bird-feeders-2026.md).
- `expertSourceCount` must equal the count you state in prose ("We read N expert sources") and be ≥ the number of named sources in `sources.expert` — concrete, never round/inflated.
- `related:` 2–4 EXISTING guide slugs from `ls src/content/guides/` in the same vertical.
- picks: 4 products, ranks 1–4, labels like "BEST OVERALL" / "BEST VALUE" / "BEST FOR …" / "SPECIALIST". Scores 0–10 one decimal, derived from the methodology weights — must be internally consistent (better consensus ⇒ higher score; never all the same).
- Every pick: keyFeatures (5), body (300–400 words editorial synthesis WITH an explicit honest trade-off), pros (4–5), cons (3–4 — batch gate: average ≥2.5 cons/pick, NO pick with 0 cons), verdict (1–2 sentences).

## Body architecture (mirror exemplar)
- Opening narrative paragraph, then H2 sections with substantial prose.
- "What We Passed On" section: 2–3 named products you excluded and why (from packet `passedOn` list).
- "## Frequently Asked Questions" H2 with 4–6 Q/A pairs (this section IS FK-scored).
- Affiliate disclosure paragraph before the first product mention (copy placement from exemplar).
- Animal-safety section REQUIRED for any heat, UV, or chemical product topic.
- Species/tank-type specificity: reptile content names species; aquarium content states freshwater vs reef vs planted.

## Voice
- First-person plural editorial ("we"). NEVER claim hands-on testing ("we tested", "in our testing", "I tested" = forbidden).
- "We read N expert sources for this guide" — concrete N, early in the guide.
- Banned vocabulary (FK gate also rejects): comprehensive, delve, leverage, elevate, seamless, cutting-edge, game-changer, revolutionary, must-have, you'll love.
- Pair every recommendation with an honest trade-off. Concrete numbers over adjectives.

## Gates — iterate until green (max 6 iterations, then report blocked)
If a file already exists at `src/content/guides/{slug}.md`, it is a PARTIAL from an interrupted earlier run — ignore its content entirely and fully overwrite it.

After writing the file at `src/content/guides/{slug}.md`:
1. HERO IMAGES ARE GENERATED CENTRALLY AFTER THE WRITING PHASE (OpenAI API billing is currently capped). Do NOT run gen-hero.mjs or any image generation. Still set `heroImage: "/images/guides/{slug}.png"` in frontmatter.
2. `npm run check:metrics -- --slug {slug}` — must pass EVERY check except hero existence. The hero-existence failure for your slug is EXPECTED and is NOT a blocker — treat the run as green when FK, link density, and dissent all pass and the ONLY error line is the missing hero:
   - FK grade 8.0–12.0 on visible prose (shortAnswer, reviewMethod, whenNotToBuy, pick bodies/verdicts, bottomLine, methodology factor definitions, FAQ). If FK too low (<8), lengthen sentences/use more precise multi-syllable vocabulary; if too high (>12), shorten sentences.
   - Link density ≥50 words/link in eligible body prose.
   - Dissent ≥2.5 cons/pick.
3. `npm run validate:content 2>&1 | grep {slug}` — your slug must produce NO error lines OTHER than the known non-fatal `category "Cats & Dogs"/"Playground" is not defined` warning. (Other agents' in-progress guides may fail this command globally — ignore lines that aren't your slug.)
4. Do NOT run git commands. Do NOT touch any file other than your guide.

## Return (final message, ≤1.5KB)
JSON: { "slug", "status": "green|blocked", "fk": number, "wordsPerLink": number, "consPerPick": number, "heroGenerated": false, "iterations": number, "notes": "anything the orchestrator must know" } — status "green" means all gates pass except the expected missing-hero error.
