---
name: cp-pp-polish
description: Block 4 of the PetPalHQ content pipeline. ASIN lookup (API hint) + live Amazon page read for every price, pick writing from verified data only, optional owner-pasted quotes, methodology, hero via chatgpt-image-gen. Updates _relay-state.json with picksComplete.
triggers:
  - "cp-pp-polish"
---

# Block 4: Polish

**Pipeline position**: 4 of 6 — runs after Skeleton, before Review. Law: `/Users/Nick/petpalhq-next/CLAUDE.md` (§3 retail, §4 pricing, §5 writing).

> **Dispatch note — model=opus.** This pass writes the guide's editorial prose (`picks[].body`, `verdict`), so it runs on Opus.

## Purpose

Fill the skeleton with verified product data and editorial content. Every pick gets a real ASIN, a live-read Amazon price, a real image URL, and a body written only from verified facts.

## Inputs

- `_relay-state.json` — `skeletonComplete: true`, `expectedBrands`, `scope`, `citations`
- Skeleton file at `src/content/guides/<slug>.md`
- Owner-pasted community quotes, if any (optional)

## Steps

### 1. ASIN lookup — API is a hint

```bash
cd /Users/Nick/petpalhq-next && node scripts/automation/amazon-lookup.cjs --product="<Product Name>"
cd /Users/Nick/petpalhq-next && node scripts/automation/amazon-lookup.cjs --asin=<ASIN>
```

Returns `{ asin, title, price, imageUrl, affiliateLink, brand, features }`. Requires `AMAZON_CLIENT_ID` / `AMAZON_CLIENT_SECRET` in `.env.local`. Store the raw `asin`; `/go/<ASIN>` and the tag are applied at render time.

- **The API `price` is a hint, never a shipped figure.** Step 2 confirms every figure.
- **Over-provide candidates** (6–9) — attrition from non-Amazon, Rx-gated and wrong-match products is expected.
- **Dedup by ASIN after lookup.** Best-match search can resolve different brands to the same ASIN (2026-06-23: three shampoo brands → `B07K6JSBRB`). Never ship two picks with one ASIN.
- **Keep lookups under the orchestrator** in a multi-guide batch, not inside headless subagents.
- Null after 2 search attempts → flag to the owner. Never a placeholder ASIN.
- **A product not on Amazon comes off the roster.** No other retailer link, ever.
- Before changing any fact about an existing product, grep its name + ASIN across the repo.

### 2. Live Amazon page read — required for every figure

For each surviving pick, open `https://www.amazon.com/dp/<ASIN>` (Claude-in-Chrome or WebFetch) and record:

- **List price** as Amazon shows it (the struck-through "List:" / "List Price:" figure). If Amazon shows no list price, record the **current offer price** and mark it `current`.
- Seller/condition — a "Renewed" title means refurbished and must be said so (§8l).
- Whether the page is buyable. A page that is not buyable or not found → the product is not a pick. (Only a live read can call a product dark/gone; record the verdict with `npx tsx scripts/record-live-read.ts --asin <ASIN> --state <live-new|unavailable|used-only|not-found> --source https://www.amazon.com/dp/<ASIN> [--price N]` when it changes an existing pick's state.)

Append each read to `liveReads` in `_relay-state.json`: `{ asin, listPrice, currentPrice, basis: "list"|"current", readAt, source }`. A figure with no live read does not ship.

Never take a price from a manufacturer or brand site (Associates §2(b)). Never look for promo/discount codes.

### 3. Write each pick

```yaml
- rank: 1
  label: "BEST OVERALL"
  name: "<verified Amazon title, lightly cleaned>"
  brand: "<Brand>"
  score: <n.n>
  price: "$<live-read list price>"   # or the live offer price when Amazon shows no list price
  aliases: ["<short name that appears in body/verdict prose>"]
  image: "https://m.media-amazon.com/images/I/..."   # from the lookup — never constructed
  asin: "B0XXXXXXXX"
  keyFeatures: [...]                  # grounded in listing features[] or a handed citation
  pros: [...]
  cons: [...]                         # data-bounded, see below
  body: |
    <editorial built only from verified data>
  verdict: "<one sentence>"
```

Match the field shapes of the most recent shipped guide (e.g. `best-cat-ramps-steps-senior-mobility-2026.md`, #185) where they differ from this sketch.

**Facts rule.** The writer references verified data — listing `features[]`, live-read fields, and Research `citations` with their verbatim sentences. It does not originate facts. Brief every writer verbatim: *"Do not add any citation you have not been handed."* and:

> If the verified data does not support a requirement, DO NOT invent to satisfy it. Return `INSUFFICIENT DATA: <requirement> — <what is missing> — <what would close it>`. That is a successful outcome and will be treated as one.

**Cons rule.** Cons are grounded in the listing or a source (e.g. "no weight capacity published"). Write as many as the data supports; never pad to a count.

**Price in prose.** Prose may state a figure only if it matches the card's figure exactly. No savings math, no maker "MSRP", no availability wording ("in stock", "low stock", "unavailable") anywhere.

**No hands-on claims.** Banned: "we tested", "in our experience", "hands-on", "we found", "after using". Use "the listing states", "according to <Source>", "published specifications show".

**Craft constraints** (the `picks[]` bodies are parallel blocks, so these apply across the set):
- **Rhythm variation (QB-02).** No more than half of the bodies/verdicts share an opening or closing construction. Rotate closers: trade-off, use-case, flat verdict, comparison.
- **Spec-echo cap (QB-01).** A hard spec string appears in body prose at most twice across the guide. `keyFeatures`, the comparison table and topPicks cards are exempt.
- **One governing thesis, stated once (QB-01).**
- **FAQ ≠ body restatement (QB-06).** Each FAQ answer adds something (caveat, edge case, boundary) or is cut.
- **Consolidated freshness (QB-07).** State the "check the current price on Amazon" note once; cap inline "as of <date>" hedges at ≤4.
- **Guardrail:** craft never relaxes the substance rules. The fix for a repeated citation/spec is phrasing variation, never removal.
- **Advisory triage (optional, non-blocking):** `node /Users/Nick/affiliate-site-template/reference/design-system/gates/quality-bar-gate.mjs src/content/guides/<slug>.md --json`.

### 4. Community quotes (optional)

Only quotes the owner copy-pasted into the session, stored byte-for-byte with their source URL. Never retyped, tidied, trimmed or reordered. None supplied → `ownerVoice: []` ships; do not block on it.

### 5. Methodology

Factors and weights must sum to 100, and the ranking must follow them (a pick cannot be Best Overall if it loses on the factors the guide weights most).

### 6. topPicks

Match the shape in the reference guide (`name`, `pickRef`, `keyFeature`, `sources`, `verifiedDate`). `sources` names only handed, fetch-resolved citations.

### 7. Comparison table

- The price row is labeled `Amazon list price (checked <Month D, YYYY>)` and every cell equals that pick's card figure.
- A pick whose Amazon page shows no list price gets its live offer price with `(current price)` in the cell.
- Every "cheaper than", value-pick or price-gap claim is computed from Amazon list prices.
- No availability words in any cell.
- Set `lastProductCheck` to the live-read date.

Known gap (CLAUDE.md "Known gaps"): the renderer currently prefers the `data/amazon-prices.json` snapshot price for a card when one exists. If a pick's ASIN already has a snapshot row whose price differs from your live-read list price, flag it in the PR's BLAST RADIUS rather than hand-editing the snapshot. Do not add maker `listPrice:` blocks.

### 8. Hero image (required before Ship)

`scripts/check-content-metrics.ts` fails when a guide's hero file is missing.

- Generate via the `chatgpt-image-gen` skill (ChatGPT in Chrome, no metered spend). Keep the prompt short: a natural scene sentence plus the guide title.
- Convert and save as `public/images/guides/<slug>.webp`, e.g. `cwebp -q 82 <downloaded.png> -o /Users/Nick/petpalhq-next/public/images/guides/<slug>.webp`.
- `image` and `heroImage` frontmatter both point at `/images/guides/<slug>.webp`.
- `scripts/image-gen/gen-hero.mjs` spends metered API money (~$0.25/image). Use it only when the owner explicitly opts in for this guide; convert its PNG output to `<slug>.webp` the same way.

### 9. Update _relay-state.json

```json
{ "picksComplete": <N>, "polishedAt": "<iso>", "heroImageGenerated": true, "currentBlock": "review" }
```

## Exit condition

Every pick has a real ASIN and a live-read price receipt in `liveReads`; cons are data-grounded; methodology sums to 100 and matches the ranking; the comparison price row matches the cards; the hero exists at `public/images/guides/<slug>.webp`; `polishedAt` is set. Any unmet requirement is reported as `INSUFFICIENT DATA`, not papered over.

## Hard rules

- No invented ASINs; no constructed image URLs.
- No price figure without a live Amazon read; no maker/brand-sourced figure; no promo codes.
- No availability language; Amazon-only retail links.
- Quotes copy-paste only; writers never originate facts.
- No hands-on testing language.

## Handoff

"Polish complete. <N> picks verified with live reads, hero at `public/images/guides/<slug>.webp`. Run `/content-pipeline-petpal <slug>` to advance to Review."
