# Network Editorial Directives

**Applies to:** All sites in the affiliate network
**Last updated:** 2026-04-08
**Decision maker:** Nick (site owner)

---

## 1. E-E-A-T Posture: "Expert Verification"

### The Model

Our authors do not claim hands-on product testing. Instead, they **verify expert claims against the data**. This means:

- Aggregating what multiple expert sources (publications, YouTube reviewers, professional testers) say about a product
- Cross-referencing those claims against owner data (Amazon reviews, Reddit threads, forum posts, return rate signals)
- Identifying where expert consensus holds and where it breaks down
- Surfacing insights that no single reviewer provides because they only tested one product in isolation

### Approved Language

| Use this | Not this |
|---|---|
| "I verified expert claims against owner data" | "I tested this for 6 weeks" |
| "I cross-referenced 12 expert reviews" | "In my hands-on testing" |
| "I analyzed 500+ owner reviews to check if..." | "After personally using 20+ products" |
| "Experts at [Publication] found X — owner data confirms this" | "We found in our lab testing" |
| "The data shows X, which aligns with [Expert]'s findings" | "Our testing methodology yielded" |
| "When I dug into the owner complaints, a pattern emerged" | "When I used this product, I noticed" |
| "I evaluated the evidence across 50+ sources" | "I evaluated 50+ products" |

### First-Person Voice Rules

- **First person IS permitted** — authors say "I" when describing their analytical process
- "I" refers to the act of research, verification, and editorial judgment — not physical product interaction
- Example: "I spent three days cross-referencing durability claims across Consumer Reports, Wirecutter, and 400+ Amazon reviews. Here's what actually holds up."
- This creates a compelling narrative voice without fabricating testing claims

### Author Credential Usage

- Author credentials (Rachel's vet tech background, Alex's design background, James's gardening knowledge, Sarah's holiday decor expertise) inform **curation judgment** and **what to look for**
- Credentials are never used to imply hands-on clinical or lab testing
- Example: "As a former vet tech, I know what to look for in harness fit data — and the owner complaints about shoulder restriction on this model are a red flag most reviewers miss"
- The credential makes the author a better *analyst*, not a better *tester*

### About Page / Methodology Template

Every site's About page should include a version of:

> We don't test products in a lab — and we think that's a strength, not a weakness. Instead, we do something no single reviewer can: we aggregate and verify. We cross-reference expert reviews from [site-specific sources] against real owner data from thousands of buyers. When experts agree, we report the consensus. When the data contradicts the experts, we tell you that too.

### Per-Site Adaptations

- **SmartHomeExplorer**: Nicholas Miles verifies smart home expert claims against owner satisfaction data and compatibility reports
- **DeskGearHQ**: Alex Chen's industrial design background informs what ergonomic and build quality claims to scrutinize
- **GardenGearHQ**: James Everett verifies gardening expert recommendations against owner data across climate zones and soil types
- **ChristmasGearHQ**: Sarah Mitchell verifies seasonal product claims against multi-year owner durability data and value assessments
- **PetPalHQ**: Rachel Cooper's vet tech background informs which safety and health claims to verify against veterinary literature and owner incident reports
- **FoodsInMovies**: Maya Torres curates culinary cinema connections — verification model less applicable here (editorial/cultural content)

---

## 2. Affiliate Tag Registry

Each site has one canonical Amazon Associates tag. No exceptions.

| Site | Canonical Tag | Status |
|---|---|---|
| SmartHomeExplorer | `nsh069-20` | Hub site, original tag |
| DeskGearHQ | `deskgearhq02-20` | Verified clean in all content |
| GardenGearHQ | `gardenghq-20` | Verified clean in all content |
| ChristmasGearHQ | `xmasgearhq-20` | Verified clean in all content |
| PetPalHQ | `petpalhq-20` | Verified clean in all content |
| FoodsInMovies | `foodsinmovies-20` | Verified clean in all content |

**Note:** Legacy references to `nsh069-20` exist in documentation files (READMEs, pipeline docs) on spoke sites. These are stale and should be updated to site-specific tags during next doc refresh. No revenue leakage — all actual Amazon URLs in content use the correct tags.

---

## 3. Cross-Link Rules (Network-Wide)

- Maximum 1-2 cross-site links per article, inline editorial only
- Never in footer/sidebar/navigation (PBN signal)
- Only between topically relevant pairs (see EDITORIAL-IDENTITY.md per site for affinity map)
- Standard dofollow, descriptive anchor text
- No reciprocal links on same topics
- Transparent about shared ownership via /our-network page on every site

---

## 4. Content Quality Gates (Network-Wide)

- No AI slop vocabulary: comprehensive, delve, game-changer, revolutionary, seamless, leverage, cutting-edge, elevate
- No unverifiable claims ("100+ expert sources" must be backed by actual source count)
- No hardcoded stats on homepages — compute guide count, product count, and source count dynamically at build time
- All Amazon URLs must use the site's canonical tag
- Every guide must have an updatedDate that reflects the last substantive refresh
- Price data must be verified within 90 days (30 days during peak season)
