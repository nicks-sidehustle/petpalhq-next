# PetPalHQ Batch Writer Contract — TEMPLATE

Derived from `.batch-archive/batch-20/CONTRACT.md`. Phase 2 copies this file into
the live batch directory (e.g. `.batch-21/CONTRACT.md`), fills in the
`{placeholders}`, and uses it as the authoritative per-batch contract.
Deviation = defect.

Placeholders to fill when instantiating: `{batchNumber}`, `{batchDir}` (e.g.
`.batch-21`), `{publishDate}` (YYYY-MM-DD), `{lastProductCheck}`.

## Ground truth files (READ FIRST, in order)
1. `/Users/Nick/petpalhq-next/src/content/guides/best-dog-backyard-agility-kits-2026.md` — structural exemplar. Mirror its frontmatter shape and body architecture EXACTLY (same keys, same section types). Read it in full before writing a word.
2. `/Users/Nick/petpalhq-next/PIPELINE-CONFIG.md` — voice, banned phrases, content rules, scoring system, citable sources, and the **Structured Authority Sources** spec.
3. Your research packet: `/Users/Nick/petpalhq-next/{batchDir}/research/{slug}.json` — the ONLY permitted source of product facts AND the seed for `authoritySources`.

## Hard rules — product data integrity
- Use ONLY products in your research packet. NEVER invent or substitute an ASIN, price, spec, or review claim.
- `asin:` = bare 10-char ASIN. NEVER put a URL or `tag=` anywhere in the file (links are built at render time with petpalhq08-20).
- `image:` = the exact `imageUrl` from the packet (m.media-amazon.com URL).
- `price:` = the exact price from the packet.
- Product names in `name:` = the packet title (trim to a readable length, keep brand + model).
- Every pick needs `aliases:` — 2–3 short natural names used in body prose (brand, brand+model). Body mentions of these auto-link to Amazon, so use aliases naturally in prose a few times.
- Spec/consensus claims in pick bodies must trace to the packet's `evidence` notes. If the packet doesn't support a claim, write around it — do not fabricate.

## Hard rules — structured authority sources (REQUIRED)
Every pick MUST carry an `authoritySources:` array on the product record (next to
`price` + `asin`), seeded from that pick's research-packet `evidence[]`. Canonical
shape and full rules: PIPELINE-CONFIG.md → "Structured Authority Sources". Summary:
- Parse each evidence string `"Outlet: stat"` → `{ outlet, stat }` (split on the FIRST ": "; outlet keeps any parenthetical qualifier, stat keeps later colons).
- `supports`: one of `recommendation|spec|comparison|durability|safety|value|test-result|general`, chosen by context (head-to-head/test → `comparison`/`test-result`; price/value → `value`; numeric spec → `spec`; "best overall"/endorsement → `recommendation`; heat/UV/chemical safety → `safety`; warranty/longevity → `durability`; else `general`).
- `url`: the real source URL when the research recorded one; for `"Amazon listing"` evidence use `https://www.amazon.com/dp/{asin}?tag=petpalhq08-20`; otherwise `url: ""`. **Never fabricate an outlet URL.**
- `accessed`: the packet `researchDate`.
- Copyright: short stats/figures verbatim in `stat`; do NOT store long verbatim quotes — paraphrase into the optional `claim` and keep the URL.
- Coverage target: ≥2 `authoritySources` per top-3 pick, each ideally with a `url`. WARN-gated this sprint (`npm run validate:content` runs `validate-authority-sources.ts`) — a missing URL never blocks a ship.

## Frontmatter (copy exemplar shape)
Required: title, description, excerpt, category, species, guideType: "spoke", publishDate: "{publishDate}", updatedDate: "{publishDate}", readTime, featured: false, heroImage: "/images/guides/{slug}.png", products: [], reviewMethod, lastProductCheck: "{lastProductCheck}", expertSourceCount, shortAnswer, topPicks (3), picks (4 — each WITH `authoritySources`), comparison, methodology, bottomLine, whenNotToBuy, sources, related.
- `category:` exactly one of: "Cats & Dogs", "Playground", "Aquarium", "Reptile", "Birds" (as assigned in your topic).
- `species:` e.g. ["dog"], ["cat"], ["cat","dog"] — for Aquarium use ["fish"], Reptile ["reptile"], Birds ["bird"] (check exemplars in that category first, e.g. best-aquarium-water-test-kits-2026.md, best-reptile-thermostats-2026.md, best-smart-bird-feeders-2026.md).
- `expertSourceCount` must equal the count you state in prose ("We read N expert sources") and be ≥ the number of named sources in `sources.expert` — concrete, never round/inflated.
- `related:` 2–4 EXISTING guide slugs from `ls src/content/guides/` in the same vertical.
- picks: 4 products, ranks 1–4, labels like "BEST OVERALL" / "BEST VALUE" / "BEST FOR …" / "SPECIALIST". Scores 0–10 one decimal, derived from the methodology weights — must be internally consistent (better consensus ⇒ higher score; never all the same).
- Every pick: keyFeatures (5), body (300–400 words editorial synthesis WITH an explicit honest trade-off), pros (4–5), cons (3–4 — batch gate: average ≥2.5 cons/pick, NO pick with 0 cons), verdict (1–2 sentences), authoritySources (≥2 for top-3 picks).

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
1. HERO IMAGES ARE GENERATED CENTRALLY AFTER THE WRITING PHASE. Do NOT run gen-hero.mjs or any image generation. Still set `heroImage: "/images/guides/{slug}.png"` in frontmatter.
2. `npm run check:metrics -- --slug {slug}` — must pass EVERY check except hero existence. The hero-existence failure for your slug is EXPECTED and is NOT a blocker — treat the run as green when FK, link density, and dissent all pass and the ONLY error line is the missing hero:
   - FK grade 8.0–12.0 on visible prose (shortAnswer, reviewMethod, whenNotToBuy, pick bodies/verdicts, bottomLine, methodology factor definitions, FAQ).
   - Link density ≥50 words/link in eligible body prose.
   - Dissent ≥2.5 cons/pick.
3. `npm run validate:content 2>&1 | grep {slug}` — your slug must produce NO error lines OTHER than the known non-fatal `category "Cats & Dogs"/"Playground" is not defined` warning. The authority-source step is WARN-only and never fails this command.
4. Do NOT run git commands. Do NOT touch any file other than your guide.

## Return (final message, ≤1.5KB)
JSON: { "slug", "status": "green|blocked", "fk": number, "wordsPerLink": number, "consPerPick": number, "authoritySourcesPerTop3Pick": number, "heroGenerated": false, "iterations": number, "notes": "anything the orchestrator must know" } — status "green" means all gates pass except the expected missing-hero error.

## Ship & index (orchestrator step, NOT the writer)
The writer never ships (see "Do NOT run git commands" above). The batch orchestrator
ships AFTER all writers return green and heroes are generated. Search-index
submission is driven by the **explicit shipped-slug set** — every slug written in
this batch — NOT by the post-deploy workflow's git diff.

Why: `post-deploy-index.yml` builds its URL set from a single-commit diff (deployed
TIP vs `TIP~1`). A batch push of N guides (N commits → ONE production Vercel deploy)
only surfaces the guides touched in the tip commit; the earlier N-1 are silently
skipped (confirmed first-wave gap: pet 0/5). The deterministic fix lives in
`scripts/deploy-production.sh`, which after pushing to `main`:
- waits for production to return 200, then
- calls `node scripts/search-index/submit-urls.cjs --slug <each shipped slug>`
  (IndexNow + Google, one call covering the whole batch).

Orchestrator ship invocation:
```bash
# explicit (preferred for batches — pass every shipped slug):
bash scripts/deploy-production.sh --yes --slug slug-a --slug slug-b --slug slug-c
# or auto-detect shipped slugs from the origin/main..HEAD diff (full range):
bash scripts/deploy-production.sh --yes
```
The `post-deploy-index.yml` workflow remains as a safety net (now diffs the full
pushed range, still SHA-debounced); double-submit of a URL is an idempotent
re-notify, so the explicit submit + safety net do not conflict.
