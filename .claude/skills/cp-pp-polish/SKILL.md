---
name: cp-pp-polish
description: Block 4 of the PetPalHQ content pipeline. ASIN verification via amazon-lookup.cjs, pick body writing, ownerVoice integration, methodology completion. Updates _relay-state.json with picksComplete.
triggers:
  - "cp-pp-polish"
---

# Block 4: Polish

**Pipeline position**: 4 of 6 — runs after Skeleton, before Review.

See also: `docs/GUIDE_CREATION_PROCESS.md` §"High-level flow" steps 3, 4, 5, 6, 7.

> **Dispatch note — model=opus (mandatory).** This Polish pass writes the guide's editorial prose (`picks[].body`, `verdict`), so it runs on **Opus**, never Sonnet. WAVE-PLAYBOOK law (locked owner rule): *guide prose is NEVER below Opus.* When `content-pipeline` / a wave lead dispatches this block, set `model: "opus"`. Sonnet's mechanics-only register does not carry the consultative voice + craft constraints below.

## Purpose

Fill the skeleton with real product data and editorial content. Every pick gets a verified ASIN, a real price, a real image URL, and a complete editorial body. ownerVoice quotes (from Reddit fetcher) are integrated here.

**Critical**: Every pick MUST have ASIN-verified product data. If `amazon-lookup.cjs` returns null for a product, do not create the pick — either find an alternate product or flag to owner before proceeding.

## Inputs

- `_relay-state.json` — must contain `skeletonComplete: true`, `expectedBrands`, `scope`
- Skeleton file at `src/content/guides/<slug>.md`
- Owner-provided ownerVoice quotes (verbatim from `fetch-reddit-quotes.ts` output — NOT AI-generated)
- Active promos: none yet — check brand sites via WebFetch for any active discount codes

## Steps

### 1. ASIN verification for each pick (run per pick)

Use petpal's OWN self-contained lookup script (NEVER shell into gardengearhq or any sister repo — that cross-repo dependency was severed 2026-06-23). Run from petpal:

```bash
cd /Users/Nick/petpalhq-next && node scripts/automation/amazon-lookup.cjs --product="<Product Name>"
```

Returns: `{ asin, title, price, imageUrl, affiliateLink, brand, features }` (`features` = listing bullets — ground claims against them first).

**Affiliate tag**: the script defaults to `petpalhq08-20`. `buildAmazonUrl()` in `src/lib/guides.ts` applies the tag at render time, so store the raw `asin` (+ price/imageUrl) in frontmatter. Requires `AMAZON_CLIENT_ID`/`AMAZON_CLIENT_SECRET` in `petpalhq-next/.env.local`.

If a product search returns null:
1. Try alternate search terms (brand + model number, brand + shortened name)
2. If still null after 2 attempts: flag to owner with "ASIN not found for: <product> — please confirm the product name or provide ASIN manually"
3. Do not fill the pick slot with a placeholder ASIN

For each successful lookup, record:
```yaml
- asin: "B0XXXXXXXXX"
  name: "<Product Name>"
  price: <N>  # in dollars, as integer
  imageUrl: "https://m.media-amazon.com/images/I/..."
```

**Batch discipline** (carried over from Research → applied here):

- **Over-provide candidates.** Research 6-9 candidates per guide, not exactly 4-6. Lookups will drop non-Amazon, prescription-gated, and wrong-match candidates — over-providing means you still land 4-6 solid picks after the attrition.
- **Dedup picks by ASIN.** The lookup returns a *best-match*, so different brand queries can resolve to the SAME ASIN — that's a wrong-match fallback the API serves when the exact product isn't cleanly listed. Never ship two picks with the same ASIN: it reads as padding and sends buyers in circles. Dedup by ASIN **after** lookup — keep the best-tier pick, drop/replace the others. (The `validate-guide-integrity` gate also flags duplicate ASINs within a guide, so a slip here fails Review.)
  - Precedent (2026-06-23): 3 shampoo "brands" — Pet MD, Curaseb, Pet Honesty — all resolved to ASIN `B07K6JSBRB`. Dedup caught it before drafting.
- **Keep lookups under the ORCHESTRATOR's control in a multi-guide batch.** Run them between Research and drafting, NOT inside headless subagents. Concurrent agents pile up Amazon API rate, and a subagent `cd`-ing into another dir can stall on a permission prompt.

### 2. Check for active promos (optional)

For each brand in `expectedBrands`, use WebFetch to check the brand's discount/promo page:
```
WebFetch: https://www.<brand>.com/discount  OR  /promo  OR  /deals
```

If a valid promo code is found, add to the pick:
```yaml
activePromo:
  code: "SAVE20"
  discount: "20% off"
  expiry: "2026-06-30"
  verifiedDate: "<today>"
```

If no promo found: omit the `activePromo` field entirely. Do not invent codes.

### 3. Write each pick body

For each of the N picks (N from scope), write the full pick:

```yaml
- asin: "B0XXXXXXXXX"
  name: "<Product Name>"
  brand: "<Brand>"
  price: <N>
  imageUrl: "https://m.media-amazon.com/images/I/..."
  badge: "Best Overall"  # or Best Value, Best Premium, Editor's Pick, etc. — only for topPicks
  verdict: "<1 sentence. What makes this the right pick for the stated use case. Not a superlative.>"
  keyFeatures:
    - "<Feature 1 — specific, measurable where possible>"
    - "<Feature 2>"
    - "<Feature 3>"
    - "<Feature 4>"
    - "<Feature 5>"
  pros:
    - "<Pro 1 — specific benefit>"
    - "<Pro 2>"
    - "<Pro 3>"
    - "<Pro 4>"
    - "<Pro 5>"
  cons:
    - "<Con 1 — real limitation, not a hedge>"
    - "<Con 2>"
    - "<Con 3>"
  body: |
    <300-500 words of editorial on this pick. Covers: what it is, who it's for,
    standout feature, performance context (based on expert consensus + community reports),
    and how it compares to adjacent picks. NO hands-on testing claims. NO "we found" or
    "in our tests". Style: confident synthesis of authoritative sources.>
```

**Cons rule**: Every pick MUST have ≥ 3 cons. Padding with "pricey for some budgets" is acceptable if needed, but the first 2-3 cons must be genuine product limitations.

**Body style constraints** (from `feedback_no_hands_on_testing_claims.md`):
- Banned: "we tested", "in our experience", "hands-on", "we found", "after using"
- Use instead: "expert consensus suggests", "community reports", "according to [Source]", "verified specifications show"

**Craft constraints** (from `DESIGN-EXPERIENCE-STANDARD.md` §8 — universal writing-craft bar; the `picks[]` bodies are PetPal's parallel blocks, so these apply across the pick set as a whole, not just per pick):
- **Rhythm variation across picks (QB-02).** Across the N `picks[].body` blocks — and their one-line `verdict`s — **no more than half** may share the same opening OR closing construction. Kill the "Compared to X… versus Y…" mold. Vary the **closer move** as you move down the roster, rotating among:
  - **trade-off** — close on what the buyer gives up to get the win;
  - **use-case** — close on the specific pet/owner scenario it's for;
  - **flat verdict** — close on a plain "this is the one if…" call;
  - **comparison** — close by positioning against an adjacent pick.
  Consistency = same *speaker* and same *care* across picks, NOT the same sentence skeleton. Reusing one closer construction down the whole roster is a defect, not consistency.
- **Spec-echo cap (QB-01, prose-only).** A given hard spec string (a weight capacity, dimension, battery figure) appears in `body` prose **at most twice** across the guide. The `keyFeatures`, comparison table, and topPicks cards are structured, designed repetition and are EXEMPT — don't re-recite a number in prose that the table already shows.
- **One governing thesis, stated once (QB-01).** The guide carries one load-bearing frame; state it **once** in the intro/body and build on it — do not re-declare it in every pick.
- **FAQ ≠ body restatement (QB-06).** Each FAQ answer must ADD something the bodies didn't carry (a caveat, an edge case, a boundary condition) or be **cut** — no near-duplicate of a pick body or the intro.
- **Consolidated freshness (QB-07).** State the "verify current price/availability before buying" rule **once, prominently**; cap inline "as of <Month Year>" / "confirm before" hedges at **≤4** across the guide.
- **Guardrail:** these craft rules do NOT relax PetPal's substance rules (proper-noun specificity, honest-sourcing citations, no hands-on claims). The fix for a repeated citation/spec is phrasing variation, never removal.
- **Advisory triage (optional, non-blocking):** `node /Users/Nick/affiliate-site-template/reference/design-system/gates/quality-bar-gate.mjs src/content/guides/<slug>.md --json` flags QB-01…QB-08 offenders to fix before ship. Exit code is NOT gating; a clean run is not a §8 pass on its own (the editorial Review block is the standard).

### 4. Integrate ownerVoice quotes

ownerVoice quotes come from `fetch-reddit-quotes.ts` output that the owner ran during Research block. They are verbatim — do not paraphrase, do not clean up grammar unless the owner explicitly says to.

Format in frontmatter:
```yaml
ownerVoice:
  - quote: "Exact verbatim quote from the Reddit thread."
    source: "u/username"
    context: "r/dogs — discussing GPS collar battery life"
    productSlug: "<pick-slug-if-applicable>"  # optional, omit if general
```

If the owner has not yet run `fetch-reddit-quotes.ts` and provided output, print:
> "ownerVoice quotes are missing. Run `npx tsx scripts/fetch-reddit-quotes.ts <thread-url>` for the threads identified in Research, paste the output here, and I will integrate the quotes."

Do not proceed with empty `ownerVoice[]` unless the owner explicitly says to skip (some guides omit it intentionally).

### 5. Complete methodology

Fill the methodology fields with substantive content. Factor weights must sum to 100.

Example for a GPS collar guide:
```yaml
methodology:
  intro: "Picks were selected based on coverage reliability, subscription cost transparency, battery life, and independent community consensus from r/dogs and r/AskVet threads."
  factors:
    - name: "GPS Coverage & Accuracy"
      weight: 30
      description: "Real-world cellular + GPS accuracy reported by verified purchasers; cellular network footprint."
    - name: "Subscription Cost Transparency"
      weight: 25
      description: "Monthly/annual plan pricing; whether cancellation is penalty-free; what tracking degrades to off-plan."
    - name: "Battery Life"
      weight: 20
      description: "Verified standby hours in tracking mode; charge time; whether battery is replaceable."
    - name: "Durability & Water Resistance"
      weight: 15
      description: "IP rating; owner-reported field durability; collar attachment reliability."
    - name: "App & Alerts Quality"
      weight: 10
      description: "Escape alert latency; geofence reliability; iOS + Android parity."
  formula: "GPS Coverage × 30% + Subscription × 25% + Battery × 20% + Durability × 15% + App × 10%"
```

### 6. Update topPicks

After all picks are written, populate `topPicks`:
```yaml
topPicks:
  best_overall: "<asin of best overall pick>"
  best_value: "<asin of best value pick>"
  best_premium: "<asin of best premium pick>"
```

Use ASIN strings, not product names.

### 7. Update comparison table rows

```yaml
comparison:
  headers: ["Product", "Price", "Key Feature", "Rating"]
  rows:
    - ["<Product Name>", "$<N>", "<Key Feature>", "4.5/5"]
```

### 8. Generate hero image (mandatory — hard gate in Ship)

After picks are finalized, generate the hero image. The Ship-block metrics
gate fails if any guide is missing its hero (see `scripts/check-content-metrics.ts`
hero-image check), so this step is not optional. The hero must land at
`public/images/guides/<slug>.png` before Ship.

**DEFAULT path — ChatGPT-in-Chrome (no metered spend):** Generate the hero via
the global `hero-image-via-chatgpt` skill, which drives the owner's ChatGPT Pro
session in Chrome. This is the default because it costs nothing per image
(bundled in the owner's ChatGPT Pro subscription) — see the
`feedback_hero_images_chatgpt` memory and the sibling cp-pp-ship reminder.

- Keep the prompt SHORT: a natural sentence describing the scene plus the guide
  title. Over-specifying (camera, lens, lighting, anatomy details) breaks
  organic animal anatomy — let ChatGPT compose the scene.
- Native output is ~1672x941, which matches the site's hero convention.
- Save the result to `public/images/guides/<slug>.png`.

**FALLBACK path — `gen-hero.mjs` (paid, ~$0.25/image) — opt-in or headless ONLY:**

```bash
cd /Users/Nick/petpalhq-next && node scripts/image-gen/gen-hero.mjs --slug <slug>
```

Use this ONLY when one of these applies:
1. The owner explicitly opts in to paid generation for this guide, OR
2. Running in the autonomous/headless cron, which cannot drive a browser (this
   is the cron's pre-authorized exception to the no-metered-spend rule).

If neither applies, do NOT run `gen-hero.mjs` — it spends metered $ the owner
forbade by default. Ask the owner first.

Defaults: gpt-image-1, 1536x1024 (16:9), high quality, PNG. Cost: ~$0.25 per
image. Wall-clock: ~60s per image.

What the wrapper does:
- Reads the guide's frontmatter (title, excerpt, category, picks)
- Picks a breed deterministically from the slug (rotation rule from
  `project_petpal_image_audit_2026-05-07` memory)
- Infers a scene template based on slug keywords (BBQ/yard/pool, gifts,
  anxiety, grooming, mobility, nutrition, smart tech, reptile, aquarium,
  bird, default)
- Applies the universal PetPalHQ style suffix
- Saves to `public/images/guides/<slug>.png`

Optional flags:
- `--breed "labrador"` — override breed selection
- `--scene "..."` — override scene template
- `--dry-run` — print prompt without making API call (useful for review)
- `--quality medium` — drop to medium quality (~$0.06/image instead of $0.25)
- `--force` — overwrite existing hero

If the generated image looks off, re-run with `--force --scene "..."` or
`--breed "..."` overrides. The breed picker is deterministic by slug, so
re-running without flags produces the same image.

### 9. Update _relay-state.json

```json
{
  "picksComplete": <N>,
  "polishedAt": "<iso-timestamp>",
  "heroImageGenerated": true,
  "currentBlock": "review"
}
```

## Exit condition

All N pick slots filled with verified ASIN data, each pick has ≥3 cons, ownerVoice is populated or owner has explicitly opted out, methodology factors sum to 100, hero image exists at `public/images/guides/<slug>.png`, and `polishedAt` is set in `_relay-state.json`.

## Hard rules

- Every pick MUST have real ASIN from amazon-lookup.cjs. No placeholders.
- Every pick MUST have ≥ 3 cons.
- ownerVoice quotes MUST be verbatim from a sanctioned source — no AI generation, no paraphrase. (Reddit currently blocked from Claude's environment; see `project_quote_sourcing_blocker.md` memory.)
- No hands-on testing language anywhere in pick bodies.
- `imageUrl` must be the `m.media-amazon.com` URL from the lookup — do not guess or construct CDN URLs.
- **Hero image MUST exist** at `public/images/guides/<slug>.png` before advancing to Ship. The `check-content-metrics.ts` script enforces this and exits 1 if a hero is missing. DEFAULT generation path is ChatGPT-in-Chrome via the `hero-image-via-chatgpt` skill (no metered spend). `gen-hero.mjs` (paid, ~$0.25/image) is a FALLBACK ONLY — use it only when the owner explicitly opts in, or in the headless cron that cannot drive a browser. Otherwise do not spend; ask the owner first.

## Next block

Polish does NOT hand off straight to Ship. The next block is **Review** (`/cp-pp-review`, block 5 of 6) — an adversarial triple-lens review + fix→verify gate that re-grounds product facts against verified data and confirms spec/editorial compliance. Ship is GATED on a clean review verdict.

## Handoff

Tell the owner: "Polish complete. <N> picks verified, hero image generated. Run `/content-pipeline-petpal <slug>` to advance to Review (adversarial triple-lens review + fix→verify before Ship)."
