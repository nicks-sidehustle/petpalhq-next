---
name: cp-pp-skeleton
description: Block 3 of the PetPalHQ content pipeline. Generates frontmatter shell + body intro + FAQ placeholders at src/content/guides/<slug>.md. Validates file parses. Updates _relay-state.json.
triggers:
  - "cp-pp-skeleton"
---

# Block 3: Skeleton

**Pipeline position**: 3 of 6 — runs after Research, before Polish.

See also: `docs/GUIDE_CREATION_PROCESS.md` §"High-level flow" step 6.

## Purpose

Create the structural scaffolding of the guide file. No real picks yet — picks are added in Polish when ASINs are verified. The Skeleton block produces a parseable, valid frontmatter shell that Polish can fill in.

**Critical**: Do NOT include picks with placeholder ASINs. The `picks[]` array must be empty in the skeleton — fail closed if you are tempted to add placeholder product data.

## Inputs

- `_relay-state.json` — must contain hub, vertical, category, guideType, pillar, scope, expertSources from previous blocks
- Reference guide shape: `src/content/guides/best-orthopedic-dog-beds-senior-pets-2026.md` (read for field reference, not to copy content)

## Steps

### 1. Determine pick count from scope

Parse `scope` from `_relay-state.json` (e.g. "7 picks at $150-300 AOV") → extract N (number of picks).

### 2. Generate the guide file

Create `/Users/Nick/petpalhq-next/src/content/guides/<slug>.md` with the following structure.

**Architecture constraint**: Body markdown between H2s does NOT render on the page template. All editorial content must live in frontmatter fields. The body section below the frontmatter is only for the intro capsule and FAQ — these are the two body regions the template does render.

#### Frontmatter shell template:

```markdown
---
title: "<Descriptive Title With Year>"
description: "<2-sentence meta description. Lead with the category + animal. End with a benefit statement.>"
excerpt: "<1-sentence excerpt for cards and OG. Under 155 chars.>"
category: "<Category>"
hub: "<hub-slug>"
guideType: "spoke"
pillar: "<pillar>"
publishDate: "<YYYY-MM-DD>"
updatedDate: "<YYYY-MM-DD>"
readTime: <N>
heroImage: "/images/guides/<slug>-hero.jpg"
heroAlt: "<descriptive alt text>"

shortAnswer: |
  <2-3 sentence answer to the primary question this guide answers. Written for AEO/LLM citation. Link-free.>

reviewMethod: "Editorial synthesis of veterinary guidance, manufacturer specifications, and verified community experience. PetPalHQ does not operate a [category] testing lab."

expertSourceCount: <N from Research block>

picks: []

topPicks:
  best_overall: ""
  best_value: ""
  best_premium: ""

methodology:
  intro: "<1-2 sentence framing of how picks were selected.>"
  factors:
    - name: "<Factor 1>"
      weight: <pct>
      description: "<What this measures and why it matters.>"
    - name: "<Factor 2>"
      weight: <pct>
      description: "<What this measures and why it matters.>"
    - name: "<Factor 3>"
      weight: <pct>
      description: "<What this measures and why it matters.>"
    - name: "<Factor 4>"
      weight: <pct>
      description: "<What this measures and why it matters.>"
    - name: "<Factor 5>"
      weight: <pct>
      description: "<What this measures and why it matters.>"
  formula: "<Factor1> × <pct>% + <Factor2> × <pct>% + ... (must sum to 100)"

comparison:
  headers: ["Product", "Price", "Key Feature", "Rating"]
  rows: []

sources:
  - name: "<Source 1 from Research block>"
    url: "<canonical URL from authority-links.ts>"
  - name: "<Source 2>"
    url: "<canonical URL>"

ownerVoice: []

bottomLine:
  - "<Sentence 1 — leading takeaway.>"
  - "<Sentence 2 — who this is for.>"
  - "<Sentence 3 — caveat or when-not-to-buy pointer.>"

whenNotToBuy:
  - "<Situation where the buyer should look elsewhere.>"
  - "<Another situation.>"

related: []
---

<Intro capsule — 200-300 words. States the problem, why product choice matters, and who this guide is for. LINK-FREE — no markdown links, no affiliate links. This is the only body text that renders.>

## Frequently Asked Questions

**<Question 1 — phrased as a natural search query?>**

<Answer — 2-4 sentences. Specific, citable, link-free.>

**<Question 2 — a common comparison or how-to question?>**

<Answer — 2-4 sentences.>

**<Question 3 — a gotcha or common mistake question?>**

<Answer — 2-4 sentences.>

**<Question 4 — a spec/spec-comparison question?>**

<Answer — 2-4 sentences.>

**<Question 5 — a maintenance or long-term cost question?>**

<Answer — 2-4 sentences.>
```

#### Field rules:
- `readTime`: estimate based on scope N. Formula: `5 + (N × 2)` minutes rounded up.
- `methodology.factors`: 4-5 factors; weights must sum to exactly 100.
- `sources`: use the URLs from `authority-links.ts` verbatim (read the file to get canonical URLs, do not guess).
- `ownerVoice: []` — always empty in skeleton; filled in Polish after Reddit fetcher runs.
- `picks: []` — always empty in skeleton. NO placeholder ASINs.
- `comparison.rows: []` — empty; filled in Polish.
- `heroImage`: use the path pattern shown. The file does not exist yet — hero generation is a manual step (owner requests ChatGPT image-gen per the universal style suffix in `project_petpal_image_audit_2026-05-07.md`).
- `publishDate` and `updatedDate`: use today's date.

### 3. Validate the file

Run:
```bash
cd /Users/Nick/petpalhq-next && node scripts/validate-content.mjs 2>&1 | grep -E "ERROR|<slug>"
```

If the validate script does not exist or exits cleanly for this file, confirm: "File parses without errors."

If errors: fix the YAML syntax before advancing.

### 4. Update _relay-state.json

```json
{
  "skeletonComplete": true,
  "fileSize": <bytes>,
  "currentBlock": "polish"
}
```

Report file size: `wc -c src/content/guides/<slug>.md`

## Exit condition

File exists at `src/content/guides/<slug>.md`, parses without errors, `picks: []` (no placeholders), and `_relay-state.json` has `skeletonComplete: true`.

## Hard rules

- `picks[]` MUST be empty — no placeholder ASINs, no made-up image URLs.
- FAQ questions MUST be formatted as H2-level bold questions (`**Question?**`), not H3s. The capsule-discipline injector skips links inside FAQ but only if the H2 is `## Frequently Asked Questions` exactly.
- The intro capsule (first paragraph) must be link-free.
- Do NOT add `species` field unless the guide explicitly targets one species (cats-only or dogs-only spoke). Dual-species guides omit the field.

## Handoff

Tell the owner: "Skeleton saved at `src/content/guides/<slug>.md`. Run `/content-pipeline-petpal <slug>` to advance to Polish (ASIN verification + pick writing)."
