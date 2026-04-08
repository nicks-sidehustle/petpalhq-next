# PetPalHQ Pipeline Configuration

**For use with pipeline-a (parameterized)**

---

## Site Identity

```yaml
siteId: petpalhq
siteName: PetPalHQ.com
siteUrl: https://petpalhq.com
authorName: Rachel Cooper
authorTitle: Senior Pet Editor
authorCredential: former licensed veterinary technician, 10+ years reviewing pet products
affiliateTag: petpalhq-20
amazonSearchTemplate: "https://www.amazon.com/dp/{asin}?tag=petpalhq-20&linkCode=as2"
```

## E-E-A-T Posture (UNIQUE — First Person Allowed)

```yaml
voiceMode: first-person-singular  # Rachel says "I" — UNIQUE in the network
eeatModel: expert-verification
authorVoiceExamples:
  - "I cross-referenced 12 expert reviews against owner data — here's where the consensus holds"
  - "As a former vet tech, I know what to look for in harness fit data"
  - "I analyzed 500+ owner reviews to check if the durability claims hold up"
  - "The data shows X, which aligns with what I saw during my years in veterinary practice"
bannedPhrases:
  - "I tested this for X weeks"  # Cannot claim hands-on product testing
  - "after using this product"
  - "in my testing"
  - "I personally use"
  - comprehensive
  - delve
  - game-changer
  - revolutionary
  - seamless
  - leverage
  - cutting-edge
  - elevate
  - fur babies
  - puppers
allowedFirstPerson:
  - "I recommend"  # Rachel's expert recommendation voice
  - "I analyzed"
  - "I verified"
  - "I cross-referenced"
  - "As a former vet tech, I"
  - "I found that expert claims about X"
```

## Health Claim Tier System (CRITICAL)

```yaml
healthClaimTiers:
  tier1_free:
    description: "Product features, materials, dimensions"
    requirement: none
    examples: ["This fountain holds 95 oz", "Made from 304 stainless steel"]
  tier2_cite:
    description: "Behavioral or efficacy claims"
    requirement: "Name the source or study"
    examples: ["Approved by the American Veterinary Society of Animal Behavior"]
  tier3_disclaim:
    description: "Health outcome claims"
    requirement: "'Consult your veterinarian' within same section"
    examples: ["Chronic dehydration contributes to kidney disease in cats"]
    triggerKeywords: [kidney disease, obesity, anxiety, tracheal damage, joint stress, hip dysplasia, dental disease, urinary tract]
```

## Content Pillars (Phase 0 Topic Selection)

```yaml
pillars:
  - name: Feeding & Nutrition Gear
    keywords: [automatic feeders, slow feeders, puzzle feeders, water fountains, food storage, bowls]
    priority: 1
    species: [dogs, cats]
  - name: Walking, Training & Containment
    keywords: [harnesses, leashes, collars, crates, gates, training tools]
    priority: 2
    species: [dogs]
  - name: Monitoring & Safety Tech
    keywords: [pet cameras, GPS trackers, microchip feeders, smart collars]
    priority: 3
    species: [dogs, cats]
  - name: Enrichment & Wellness
    keywords: [puzzle toys, lick mats, calming products, orthopedic beds, dental chews, grooming]
    priority: 4
    species: [dogs, cats]
  - name: Life Stage & Situation Guides
    keywords: [new puppy checklist, senior dog essentials, apartment cat setup, first-time fish owner]
    priority: 5
    species: [dogs, cats, expansion]
    note: "Multi-product guides, highest conversion intent"
```

## Species Strategy

```yaml
speciesStrategy:
  2026Focus:
    dogs: 60%
    cats: 40%
  expansionSpecies: [small pets, birds, fish]
  expansionTrigger: "Launch when dog+cat guide count exceeds 20"
  rules:
    - "Minimum 3 buying guides before a species tab goes live"
    - "Never launch a species with 'Coming soon' — have content or remove the tab"
    - "Outdoor/Travel is a cross-species pillar, not a pet type"
```

## Audience Segments

```yaml
audiences:
  - name: First-Time Pet Owners
    priority: primary
    painPoints: [overwhelm, fear of getting it wrong, budget anxiety, information trust]
  - name: Experienced Owners Upgrading
    priority: secondary
    painPoints: [specificity need, feature comparison fatigue, nuance awareness]
  - name: Anxious Pet Parents
    priority: tertiary
    painPoints: [health worry, separation guilt, safety obsession]
  - name: Budget-Conscious Owners
    householdIncome: $50-100K
    painPoints: [value validation, hidden costs, buy-once mentality]
```

## Expert Sources to Cite

```yaml
citableSources:
  - American Veterinary Society of Animal Behavior (AVSAB)
  - American Kennel Club (AKC)
  - Cornell University College of Veterinary Medicine
  - ASPCA
  - Consumer Reports
  - Wirecutter
  - The Spruce Pets
  - PetMD
  - VCA Animal Hospitals
  - Fear Free certified sources
```

## Scoring System

```yaml
scoringSystem:
  name: null  # Uses structured product cards with pros/cons/ourTake
  useProductCard: true
  requiredFields: [price, pros, cons, bestFor, ourTake, asin]
  safetyBadges:
    vetReviewed: "When Rachel has consulted veterinary literature"
    safetyConcern: "When a product has a cons entry flagged as safety issue"
```

## Content Rules

```yaml
contentRules:
  minWordCount: 2000
  maxWordCount: 3500
  minAffiliateLinks: 15
  minProducts: 3
  maxProducts: 7
  requiredSections:
    - "The Bottom Line" (first paragraph — Rachel's pick without scrolling)
    - "Why Trust This Guide" (credential + methodology)
    - Product cards with ASIN for live pricing
    - Comparison table
    - "How to Choose" decision framework
    - FAQ section (H3 subheadings matching search queries)
    - Affiliate disclosure before first CTA
  requiredPerProduct:
    - "Best For" specific situation
    - At least one clinical insight a non-vet reviewer couldn't provide
    - Honest statement of what it's NOT good for
  voiceRules:
    - First-person singular ("I") for analytical process
    - Rachel's credential invoked for health/safety claims ONLY
    - Every sentence must contain information the reader didn't have before
    - No emoji in guide body content (OK in UI)
    - "Your dog" and "your cat" — never "fur babies" or "puppers"
    - Specific measurements always (never "high quality materials")
  healthClaimRules:
    - Tier 1 claims: state freely
    - Tier 2 claims: cite the source in the same paragraph
    - Tier 3 claims: "consult your veterinarian" in the same section
    - Safety warnings appear BEFORE the buy button, never after
```

## File Paths

```yaml
paths:
  contentDir: src/content/guides
  heroImageDir: public/images/guides
  productImageDir: public/images/products
  siteConfig: src/config/site.ts
  guidesData: src/data/guides.ts
  categoriesData: src/data/categories.ts
  creatorsApi: src/lib/creators-api.ts
  contentLib: src/lib/content.ts  # Has live pricing injection
```

## Cross-Link Targets

```yaml
crossLinks:
  strong:
    - site: SmartHomeExplorer.com
      topics: [smart feeders, pet cameras, GPS trackers, smart collars]
    - site: GardenGearHQ.com
      topics: [outdoor pet gear, pet-safe pest control, robot mower safety]
  moderate:
    - site: ChristmasGearHQ.com
      topics: [pet gifts, pet stockings]
      months: [11, 12]
      rule: "Product goes TO the pet → PetPalHQ. Product DECORATES the house → ChristmasGearHQ."
  avoid:
    - site: FoodsInMovies.com
    - site: DeskGearHQ.com  # Minimal overlap
  maxPerGuide: 1  # Strict — 1 network cross-link per guide maximum
```

## Known Content Gaps

```yaml
contentGaps:
  emptyImageFields: "All 5 published guides have image: '' in frontmatter — needs fixing"
  missingCategories: "Birds, Fish, Small Pets, Outdoor tabs show 'Coming soon' — remove tabs or add content"
  newsletterNotConfigured: "brevoListId is empty string in site.ts"
  ga4Missing: "No GA4 property created yet"
```

## Disclosure Template

```yaml
disclosure: "PetPalHQ.com earns affiliate commissions from qualifying purchases. Rachel's recommendations are based on veterinary knowledge and expert consensus — she cross-references professional reviews and clinical literature against real owner data to find products that genuinely serve your pet's wellbeing. Commission rates never influence our editorial recommendations."
```
