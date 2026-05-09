# PetPalHQ Guide Creation Process

This document captures the operational workflow used to research, write, and ship a buying guide on petpalhq.com. It complements `CONTENT_GUIDE.md` (which covers content style and structure) — this doc covers the steps and tools.

> **Last updated**: 2026-05-08 — synthesized from session memory through the ownerVoice + /deals deploy.

---

## High-level flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TOPIC SELECTION                                              │
│    Gap analysis → roadmap entry → hub assignment                │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 2. SOURCE SET RESEARCH                                          │
│    Authority sources + community forums + manufacturer docs     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 3. PRODUCT & ASIN VERIFICATION (amazon-lookup.cjs)              │
│    Real ASINs, real prices, real CDN image URLs                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 4. COMMUNITY QUOTE SOURCING (fetch-reddit-quotes.ts)            │
│    Verbatim Reddit quotes — fabrication architecturally blocked │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 5. PROMO DISCOVERY (manual + WebFetch brand sites)              │
│    Active codes + expiry + verifiedDate                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 6. FRONTMATTER ASSEMBLY                                         │
│    Picks, methodology, FAQ, sources, ownerVoice, promo          │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 7. AEO COMPLIANCE CHECK                                         │
│    H2 question-format · capsule discipline · no-testing rule    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 8. HERO IMAGE GENERATION                                        │
│    Owner-driven ChatGPT image-gen with universal style suffix   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 9. BUILD & VERIFY                                               │
│    npm run build · grep rendered HTML for invariants            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 10. DEPLOY (owner-typed approval at bash level)                 │
│     git push v2-preview · vercel --prod                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 11. INDEXING (IndexNow + Google Indexing API)                   │
│     Submit refreshed URLs · watch GH Actions auto-trigger       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 12. POST-DEPLOY MEMORY UPDATE                                   │
│     project_petpal_v2.md · MEMORY.md index                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hard rules (non-negotiable)

These apply across every guide and override any phase-level convenience:

1. **No hands-on testing claims.** Every guide is editorial synthesis of expert + community consensus. Banned phrases live in `~/.claude/projects/.../memory/feedback_no_hands_on_testing_claims.md`. Author bio must include "PetPalHQ does not run a [category] testing lab."

2. **No fabricated quotes.** `ownerVoice[]` quotes must be verbatim from real forum threads. The Reddit fetcher script is the **only** sanctioned population path. AI-generated, paraphrased, or summarized quotes are a YMYL trust violation.

3. **No invented ASINs or CDN image URLs.** Every product pick runs through `amazon-lookup.cjs` to get a real ASIN, real price, and real `m.media-amazon.com` image URL. Made-up image URLs 404 on production.

4. **Production deploys require owner-typed approval at the bash level.** Hook intercepts `vercel --prod`. Owner must type the command in their message OR confirm via the explicit prompt. Auto mode does not bypass this.

5. **Capsules and FAQ sections stay link-free.** Algorithmic enforcement is in `splitBodyForInjection()` (src/lib/guides.ts). The first paragraph after every H2 + the entire `## Frequently Asked Questions` section receive zero injected links from any of the 3 injectors (affiliate, internal-guide, authority).

6. **Every spoke keeps its own unique hero image.** Hub heroes are NOT shared across spokes.

7. **Cats and dogs are separate verticals visually**, even when hubs underneath cover both species.

8. **Don't split the 5 dual-species hubs into 10 single-species hubs.** Source literature is dual-species; splitting forces fabrication.

9. **Premium tier rules:**
   - Editorial spokes: $50+ floor, no $49.99 picks
   - Mother's Day / Father's Day pillars: $100+ AOV target
   - Cosplay/impulse Playground tier: $7-50 OK as the explicit exception

10. **GA4 wiring uses literal `arguments` pattern via inline script.** Rest-args wrappers silently break `/collect`. See `feedback_ga4_arguments_pattern.md`.

---

## Phase 1 — Topic selection

**Goal**: Decide what guide to write next.

**Inputs**:
- Existing site state in `project_petpal_v2.md` (hub-spoke taxonomy, what's shipped)
- Approved 10-topic content roadmap at `~/.claude/plans/yes-can-you-research-functional-whale.md`
- Seasonal calendar (Mother's Day, Memorial Day, Father's Day, July 4, Halloween, etc.)
- Gap analysis (which hubs are spoke-thin)

**Outputs**:
- Slug name (kebab-case, ends with `-2026` for AEO year-in-title)
- Hub assignment (10-hub taxonomy)
- Pillar assignment (4 verticals: Cats & Dogs, Aquarium, Reptile, Birds)
- Category: editorial OR `Playground`

**Decisions to make**:
- Hub-thin spoke (fills gap) vs new vertical seed (greenfield)
- Editorial pillar vs Playground (irreverent/seasonal)
- Premium tier ($50+ Amazon) vs gift-tier ($100+ AOV)

---

## Phase 2 — Source set research

**Goal**: Build the authority + community source set the guide will synthesize.

**Inputs**: topic + species/category

**Authority sources** (consult `src/lib/authority-links.ts` for the full 30-source map):
- **Tier 1 — Veterinary**: Merck Vet Manual, AVMA, AAHA, AAFP, LafeberVet, VCA Animal Hospitals, Cornell Feline Health Center, Tufts Petfoodology, ISFM, ASPCA, AVSAB
- **Tier 2 — Regulatory**: FDA CVM, AAFCO, USDA APHIS, CDC Healthy Pets, FAA, TSA, EPA
- **Tier 3 — Welfare**: RSPCA, Center for Pet Safety, VOHC, NASC, WWF
- **Tier 4 — Universities**: NC State CVM, UC Davis CVET, BGSU Herpetarium
- **Tier 5 — Insurance**: NAIC, NAPHIA

**Community sources**:
- Reddit subreddits (r/dogs, r/cats, r/litterrobot, r/reptiles, r/CrestedGecko, r/dartfrogs, r/ballpython, r/aquariums, etc.)
- Manufacturer documentation (always include)
- Pet-care editorial outlets (PetMD, Cornell Feline Health Center articles, etc.)

**Output**: bulleted source list for the guide's `reviewMethod` and `sources.expert[]` + `sources.community[]` frontmatter.

> **Why this matters for AEO**: Authority sources are auto-linked at render time via `injectAuthorityLinks()`. The richer the source set, the more in-body authority links the guide accumulates without manual link insertion.

---

## Phase 3 — Product & ASIN verification

**Goal**: Lock in real Amazon products before writing prose.

**Tool**: `gardengearhq-next/scripts/automation/amazon-lookup.cjs`

```bash
# Run from gardengearhq-next, not petpalhq-next
cd /Users/mm2/sites/gardengearhq-next
node scripts/automation/amazon-lookup.cjs --product="Litter-Robot 4"
```

**Output (per product)**:
```json
{
  "asin": "B0FFDNZSHT",
  "title": "Litter-Robot 4 Supply Bundle by Whisker",
  "price": "$749.00",
  "imageUrl": "https://m.media-amazon.com/images/I/41aFIwIoM-L._SL500_.jpg",
  "affiliateLink": "https://www.amazon.com/dp/B0FFDNZSHT?tag=gardenghq-20"
}
```

**Affiliate tag note**: the script uses `gardenghq-20` from its own `.env.local`. PetPalHQ renders Amazon URLs with `petpalhq08-20` via `buildAmazonUrl(asin)` in `src/lib/guides.ts:612`. **Do NOT override the tag at lookup time** — it's correct as-is; petpal renames at parse time.

**Rate limit**: 1 TPS (script enforces 1100ms sleep between calls). Plan ahead for guides with 8-10 picks.

**Replacements**: if a product isn't on Amazon or has been superseded (e.g. Roomba j7+ → j9+), document the swap during research, not after writing prose.

---

## Phase 4 — Community quote sourcing

**Goal**: Pull verbatim community quotes for selected picks (`ownerVoice` field).

**Tool**: `scripts/fetch-reddit-quotes.ts`

```bash
cd /Users/mm2/sites/petpalhq-next
npx tsx scripts/fetch-reddit-quotes.ts <thread-url>
# or with original Reddit usernames preserved (default = anonymized)
npx tsx scripts/fetch-reddit-quotes.ts <thread-url> --keep-authors
```

**Discovery workflow** (find threads to fetch):
```bash
# Top threads in a sub for a product
curl -s -A "PetPalHQ-research/1.0" \
  "https://www.reddit.com/r/litterrobot/search.json?q=Litter-Robot+4&restrict_sr=1&sort=top&t=year&limit=5" \
  | jq -r '.data.children[] | "\(.data.score)\t\(.data.title)\thttps://reddit.com\(.data.permalink)"'
```

**Filtering rules** (enforced by the script):
- Min comment score: 5
- Excludes deleted/removed comments
- Excludes AutoModerator
- Top 10 by score per thread
- Anonymizes authors by default (`u/username` → `community member`)

**Output**: paste-ready YAML block. Curate down to 1-2 quotes per pick — quality over quantity. Prefer:
- Substantive content (not "amazing!")
- Mixed-signal quotes (real owner experience, not just praise)
- Date within last 18 months

**Bright-line restatement**: do not edit the `quote:` text. Pasting verbatim is the trust commitment. If a quote needs trimming, find a different quote.

---

## Phase 5 — Promo discovery

**Goal**: Find currently-active manufacturer or Amazon promotions per pick.

**Why manual**: the Amazon Creators API exposes only `offersV2.listings.dealDetails` (Lightning Deal flags) — not coupon codes or promotional resources. See the API probe at `gardengearhq-next/scripts/automation/probe-creators-promo.cjs` for the discovery artifact.

**Workflow**:
1. Use WebFetch on each brand's product page or homepage:
   ```
   WebFetch url=https://www.litter-robot.com/litter-robot-4.html
            prompt="List active promo codes, discounts, sales..."
   ```
2. Capture: code (or empty for applied-at-checkout), discount text, expiry, source label, verifiedDate (today)
3. **Conservative expiry**: if no specific expiry shown, pick a date 7-14 days out and let the auto-hide kick in

**Frontmatter shape**:
```yaml
promo:
  code: "TREATMOM"            # or "" for clip-coupons / applied-at-checkout
  discount: "60 days free Furbo Nanny subscription"
  source: "manufacturer"      # or amazon-clip | limited-time-deal | subscribe-save
  expiry: "2026-05-11"
  verifiedDate: "2026-05-08"
  notes: "Mother's Day promo"
```

**Trust line**: `isPromoActive()` (src/lib/guides.ts) auto-hides expired promos at render time. No manual cleanup needed.

---

## Phase 6 — Frontmatter assembly

**Goal**: Compose the markdown frontmatter that drives every component on the guide page.

**Reference shape**: `src/content/guides/best-reptile-thermostats-2026.md` (~310 lines, full frontmatter).

**Required frontmatter keys**:

```yaml
---
title: "Best [Category] (2026)"          # year required for AEO
description: "..."                        # 150-160 chars, ends with year
excerpt: "..."                            # one-paragraph synthesis lead
category: "Reptile"                       # or Cats & Dogs, Aquarium, Birds, Playground
hub: "reptile-habitat-environmental-control"  # taxonomy
guideType: "spoke"                        # or hub
publishDate: "2026-05-08"
updatedDate: "2026-05-08"
readTime: "8 min"
heroImage: "/images/guides/<slug>.png"
shortAnswer: "..."                        # the AEO answer-first capsule (50-100 words)
species: ["dog", "cat"]                   # for cats-and-dogs guides only
speciesPrimary: "dog"                     # the leading species
reviewMethod: "Editorial synthesis of..."  # cite specific authorities + community sources
expertSourceCount: 12                     # how many distinct authorities

topPicks:                                 # 1-3 winners
  - name: "..."
    keyFeature: "..."
    sources: ["..."]

picks:                                    # 4-10 product picks
  - rank: 1
    label: "BEST OVERALL"
    name: "..."
    brand: "..."
    score: 9.4                            # PetPal Score 0-10
    price: "$749.00"
    image: "https://m.media-amazon.com/..."
    asin: "B0..."
    keyFeatures: ["...", "...", "...", "...", "..."]
    body: |
      Multi-paragraph deep-dive. 4-6 paragraphs.
      Authority links auto-inject. Affiliate links auto-inject.
    pros: ["...", "...", "...", "..."]    # 4-5
    cons: ["...", "...", "..."]           # 3-4 (the dissent moat)
    verdict: "Buy this if..."
    ownerVoice:                           # NEW — optional, populated via fetcher
      - quote: "..."                       # verbatim from Reddit
        sourceLabel: "r/..."
        sourceUrl: "https://reddit.com/..."
        author: "community member"
        date: "2025-10-21"
    promo:                                 # NEW — optional, manual curation
      code: ""
      discount: "..."
      source: "manufacturer"
      expiry: "2026-05-15"
      verifiedDate: "2026-05-08"

methodology:                              # category-tailored Score
  formula: "Factor1 (40) + Factor2 (30) + Factor3 (20) + Factor4 (10) = 100"
  factors:
    - name: "Plain-English Factor Name"   # NOT "Use-Case Fit" — be specific
      weight: 40
      definition: "..."

comparison:
  rows:
    - label: "Price"
      values: ["$749", "$399", "..."]

forDogs: |                                # for dual-species guides
  Per-species editorial guidance.
forCats: |
  ...

whenNotToBuy: |                           # honest skip-this-category prose
  ...

bottomLine:                               # 1-3 paragraphs, the verdict synthesis
  - "..."
  - "..."

sources:
  expert: ["Merck Vet Manual", "AVMA Guidelines on...", ...]
  community: ["r/litterrobot", "r/cats", ...]
  verifiedDate: "2026-05-08"
  authorBio: "Editorial synthesis of... PetPalHQ does not run a [category] testing lab."

related:                                  # 3-6 related guide slugs for cross-links
  - best-other-spoke-2026
  - hub-name
---

[Body markdown starts here]

[Intro paragraph — IS the H1 capsule, stays link-free per algorithmic skip]

## H2 question-format heading?

[First paragraph after H2 = capsule, link-free per algorithmic skip]

[Subsequent paragraphs — affiliate + internal-guide + authority links auto-inject]

## Frequently Asked Questions

[Entire section excluded from injection — link-free per algorithmic skip]

**Q:** Question text?
A: Answer text.

**Q:** Another question?
A: Another answer.
```

**Body markdown rules**:
- The intro paragraph (above the first H2) IS the H1 capsule — stays link-free
- Each H2's first paragraph IS that section's capsule — stays link-free
- The `## Frequently Asked Questions` section is link-free entirely
- Everywhere else, the 3 injectors (affiliate → internal-guide → authority) auto-add links
- Use H2 question-format heads ("How does X work?", "Which X is best for Y?") for AEO citation lift

---

## Phase 7 — AEO compliance check

**Goal**: Confirm the guide hits AEO/LLM citation moat invariants before build.

**Checklist** (mostly enforced algorithmically — this is a sanity pass):

| Invariant | Where enforced | How to verify |
|---|---|---|
| Capsules link-free | `splitBodyForInjection()` | Build + grep H2 capsule regions for `<a` |
| FAQ link-free | `splitBodyForInjection()` | Build + grep FAQ section for `<a` |
| H2 question-format ratio | Editorial discipline | Aim for 50%+ of H2s as questions |
| Authority links present | `injectAuthorityLinks()` | Mention authorities by name; auto-links |
| Affiliate links present | `injectAffiliateLinks()` | Mention picks by name in prose; auto-links |
| Internal cross-links | `injectGuideLinks()` | Mention other guides by exact title; auto-links |
| Product+Review schema | `buildPickProductReviewGraph()` | JSON-LD has Product + Offer + Review per pick |
| Community Reviews | `buildPickProductReviewGraph()` | Each `ownerVoice` entry → Review with publisher Reddit |
| Active promo Offer | `isPromoActive()` | Offer node has `priceValidUntil` + `description` |
| No-testing claim | Editorial review | Author bio has "does not run a testing lab" |
| Year in title | Editorial review | Title contains "(2026)" |
| 3+ cons per pick | Editorial discipline | Avg target 3-4 cons per pick |

---

## Phase 8 — Hero image generation

**Goal**: One unique photoreal hero per spoke + one for hubs.

**Style standard** (universal across all heroes):
- Photoreal lifestyle photography (NOT cartoon, NOT illustration)
- Animal breed rotation across the hero set (diversity rule)
- Universal style suffix lives in `~/.claude/projects/.../memory/project_petpal_image_audit_2026-05-07.md`

**Workflow** (owner-driven):
1. Owner generates via ChatGPT image-gen using prompt + universal style suffix
2. Saves to `public/images/guides/<slug>.png` (or `.jpg`)
3. Frontmatter `heroImage: "/images/guides/<slug>.png"`

**Image cost**: ~$0.05/image via ChatGPT image-gen (real OpenAI API cost, not bundled in Max).

**Hard rule**: do NOT share hub heroes across spokes. Each spoke has its own.

---

## Phase 9 — Build & verify

**Goal**: Confirm the guide builds clean and renders correct invariants.

```bash
cd /Users/mm2/sites/petpalhq-next
npm run build
```

**Expected**: 62+ static guide pages, zero TypeScript errors. (Add 1 for `/deals` after the May 8 deploy.)

**Spot-check verifications** on built HTML at `.next/server/app/guides/<slug>.html`:

```bash
SLUG=best-mothers-day-gifts-pet-moms-2026

# Capsule discipline
grep -c "What owners are saying" .next/server/app/guides/$SLUG.html

# Affiliate density
grep -oE "tag=petpalhq08-20" .next/server/app/guides/$SLUG.html | wc -l

# Internal cross-link density
grep -oE 'href="/guides/[a-z0-9-]+"' .next/server/app/guides/$SLUG.html | wc -l

# JSON-LD Review nodes (editorial + community)
grep -oE '"@type":"Review"' .next/server/app/guides/$SLUG.html | wc -l

# Active deal badges
grep -c "Active Deal" .next/server/app/guides/$SLUG.html
```

**Targets** (post May 8 deploy averages):
- Affiliate links: 8.4/guide
- Internal cross-links: 5-15/guide (varies; new pages start lower)
- Authority links: 11.5/guide site-wide

---

## Phase 10 — Deploy

**Goal**: Promote to v2-preview branch + production.

**Deploy gate (HARD RULE)**: production deploys require explicit owner approval at the bash level. The hook intercepts `vercel --prod`. Owner must:
- Type `vercel --prod` in their message, OR
- Confirm via the explicit AskUserQuestion prompt + the bash command runs as a separate (non-chained) call

**Workflow**:
```bash
# Step 1: stage + commit (HEREDOC for clean commit message)
git add <specific files>
git commit -m "$(cat <<'EOF'
feat(...): ...

What changed
- ...

Why
- ...

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

# Step 2: push to v2-preview (Vercel auto-creates a preview deploy)
git push origin v2-preview

# Step 3: production deploy — owner-typed/approved
vercel --prod --yes
```

**Capture the deployment ID** in the session for indexing + memory updates.

**RAM constraint**: 16 GB Mac mini. Kill local `npm run dev` after use; prefer `npm run build` + curl over keeping a dev server hot.

---

## Phase 11 — Indexing

**Goal**: Notify search engines and LLMs about new/updated URLs.

**Two channels** (run both):

1. **IndexNow** — Bing/Yandex/Naver
   - Keyfile at `public/<key>.txt` must be EXACTLY 32 bytes (no trailing newline). See `feedback_indexnow_keyfile_strictness.md`.
   - Bing caches per-host failures aggressively; rotate to a fresh key to bypass.
   - Endpoints: api.indexnow.org, www.bing.com, yandex.com, naver.com

2. **Google Indexing API** — Google
   - Script at `scripts/google-index-submit.ts`
   - Daily quota: 200 URLs
   - Service account auth via 1Password (see `reference_petpal_indexing_pipeline.md`)

**When to skip mass-resubmission**:
- Architecture/style changes affecting all pages → skip; natural recrawl picks it up
- New content (new spokes, new pages) → submit
- Cosmetic refreshes → skip
- Promo expiry rollover → skip; auto-hide handles it

**Watch the GH Actions auto-trigger**: per session memory, the Vercel-GitHub `deployment_status` webhook has missed deploys before (only fires SKIPPED for in-progress, no follow-up SUCCESS). If GH Actions doesn't run after a deploy, submit manually.

---

## Phase 12 — Post-deploy memory update

**Goal**: Future Claude sessions can resume cleanly.

**Update**: `~/.claude/projects/-Users-mm2-sites-petpalhq-next/memory/project_petpal_v2.md`
- Site shape (guide count, hub spoke counts)
- What shipped this session
- Pending backlog
- Resume instructions

**Update**: `~/.claude/projects/-Users-mm2-sites-petpalhq-next/memory/MEMORY.md` (the index)
- One-line entry per memory file with description

**Memory hygiene**:
- Remove memories that turn out to be wrong (e.g., the partially-wrong "body invisible" memory was corrected on 2026-05-08)
- Don't write stale snapshots that conflict with current code — verify before recommending from memory
- Convert relative dates ("Thursday") to absolute ("2026-05-15") at write time

---

## Tool index

| Tool / Script | Purpose | Where |
|---|---|---|
| `amazon-lookup.cjs` | Real ASIN/price/image lookup | `gardengearhq-next/scripts/automation/` |
| `probe-creators-promo.cjs` | Probe Amazon Creators API for promo resources | `gardengearhq-next/scripts/automation/` |
| `fetch-reddit-quotes.ts` | Sanctioned verbatim quote pipeline | `petpalhq-next/scripts/` |
| `google-index-submit.ts` | Google Indexing API submitter | `petpalhq-next/scripts/` |
| `ga4-verify.ts` | GA4 cookie/`/collect` diagnostic | `petpalhq-next/scripts/` |
| `injectAuthorityLinks` | Render-time authority auto-link | `petpalhq-next/src/lib/guides.ts` |
| `injectAffiliateLinks` | Render-time affiliate auto-link | `petpalhq-next/src/lib/guides.ts` |
| `injectGuideLinks` | Render-time internal-guide auto-link | `petpalhq-next/src/lib/guides.ts` |
| `splitBodyForInjection` | Algorithmic capsule + FAQ skip | `petpalhq-next/src/lib/guides.ts` |
| `isPromoActive` | Render-time promo expiry check | `petpalhq-next/src/lib/guides.ts` |
| `buildPickProductReviewGraph` | Product+Review JSON-LD generator | `petpalhq-next/src/lib/schema.ts` |
| `getSiteWideProductMap` | Cross-guide affiliate map | `petpalhq-next/src/lib/guide-links.ts` |
| `buildGuideLinkMap` | Category-aware internal-guide map | `petpalhq-next/src/lib/guide-links.ts` |

---

## File map

```
src/
├── content/guides/<slug>.md          # source markdown (frontmatter + body)
├── lib/
│   ├── guides.ts                     # parseGuide pipeline, injectors, helpers
│   ├── guide-links.ts                # site-wide affiliate + internal-guide maps
│   ├── authority-links.ts            # 30-source authority map
│   └── schema.ts                     # JSON-LD generation
├── components/guides/
│   ├── PickDeepDive.tsx              # per-pick render (pros/cons/verdict/ownerVoice/promo)
│   ├── PickOwnerVoice.tsx            # community quote blockquotes
│   ├── PromoBadge.tsx                # active deal badge
│   └── FeaturedPicksGrid.tsx         # top picks grid with badges
├── app/
│   ├── guides/[slug]/page.tsx        # guide page template
│   ├── deals/page.tsx                # site-wide active deals aggregator
│   └── playground/page.tsx           # Playground category landing
public/
└── images/guides/<slug>.png          # hero images

scripts/
├── fetch-reddit-quotes.ts            # community quote pipeline
├── google-index-submit.ts            # GIA submitter
└── ga4-verify.ts                     # GA4 diagnostic

docs/
├── GUIDE_CREATION_PROCESS.md         # this file
├── CONTENT_GUIDE.md                  # content style/structure (sister-site origin)
└── AUDIENCE.md                       # audience profile
```

---

## Common pitfalls (from session memory)

1. **Don't write picks-related editorial in body markdown.** Pick body, pros/cons, and verdict belong in `picks[]` frontmatter — that's where `PickDeepDive` reads from. Body markdown renders for intro narrative + FAQ only.

2. **Don't fabricate Amazon CDN image URLs.** They 404 on production. Always run `amazon-lookup.cjs` first, integrate real image URLs from the response.

3. **Don't override the affiliate tag at lookup time.** The script uses `gardenghq-20`; petpal renames to `petpalhq08-20` at parse time via `buildAmazonUrl()`. Manual overrides break the rename.

4. **Don't run `vercel --prod` chained with `git push` in one command.** Hook intercepts. Run them as two separate Bash calls so the deploy approval is visible.

5. **Don't put body content between H2s in a hub guide thinking it'll render.** Hub templates may not render body markdown; use frontmatter. Spokes do render body — the FAQ extractor reads body's `## Frequently Asked Questions` section.

6. **Don't trust GH Actions auto-trigger blindly.** It has missed deploys (Vercel-GitHub `deployment_status` webhook fires SKIPPED on in-progress, no SUCCESS follow-up). Verify it ran after every prod deploy; if missed, submit manually.

7. **Don't include the `# score: N` annotations** from the Reddit fetcher output in committed frontmatter. They're reference comments only — strip before commit.

8. **Don't add slug-derived aliases for guide titles.** v1 internal-guide injection uses exact title match. Aliases generate manufactured topical signals that may underperform vs natural editorial linking.

---

## Roadmap deferrals (open work)

Tracked here because they affect future guides:

- **Brand `sameAs` map for Playground brands** (Ruffwear, Hurtta, MistKing, etc.) — `BRAND_SAME_AS_MAP` in `schema.ts` is editorial-only currently
- **Lightning Deal flag detection** via Creators API `offersV2.listings.dealDetails` — probe script in place; not yet wired into build
- **PAAPI auto-coupon detection** — gated on Amazon expanding the API; not currently exposed
- **FB groups + Trustpilot/BBB review-aggregator integration** — Concept 1 v2 territory
- **Multiple coupons per pick** — `promo` is singular for v1
- **Body-markdown internal-guide v2 with slug aliases** — null result on v1 exact-title; revisit if Concept 1+2 don't move citation share enough
- **Speciesprimary ordering in single-species filter views** — Phase L+1 backlog
- **`/search` FlexSearch wire-up** — Phase L+1 backlog
