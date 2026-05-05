# PetPalHQ Pipeline Configuration

**For use with pipeline-a (parameterized) and the network-wide content automation.**

---

## Site Identity

```yaml
siteId: petpalhq
siteName: PetPalHQ.com
siteUrl: https://petpalhq.com
authorName: Nick Miles
authorTitle: Chief Editor
authorCredential: leads a network of expert-review publications synthesizing consensus from veterinarians, aquarists, herpetologists, and ornithologists
affiliateTag: petpalhq-20
amazonSearchTemplate: "https://www.amazon.com/s?k={query}&tag=petpalhq-20"
amazonAsinTemplate: "https://www.amazon.com/dp/{asin}?tag=petpalhq-20&linkCode=as2"
```

---

## E-E-A-T Posture

```yaml
voiceMode: first-person-plural-editorial
eeatModel: expert-synthesis  # NOT testing — synthesis of professional consensus
authorVoiceExamples:
  - "We read 32 expert sources for this guide"
  - "Across the reviews we surveyed, the consensus is..."
  - "Here's the honest trade-off:"
  - "Multi-year owner data shows..."
  - "We'd land on the Sweet Spot pick for most readers, but the Splurge tier earns its premium if..."
bannedPhrases:
  - "I tested"
  - "in my tank"
  - "in my terrarium"
  - "in my home"
  - "my family"
  - "in our testing"
  - "personally tested"
  - "comprehensive"
  - "delve"
  - "game-changer"
  - "revolutionary"
  - "seamless"
  - "leverage"
  - "cutting-edge"
  - "elevate"
  - "must-have"
  - "you'll love"
```

---

## Content Pillars

```yaml
pillars:
  - name: Water Quality & Cycling
    slug: water-quality
    keywords: [aquarium cycling, nitrogen cycle, water test kit, ammonia test, dechlorinator, beneficial bacteria]
    priority: 1
    note: Highest research-readiness; ship hub first

  - name: Aquarium Filtration
    slug: aquarium-filtration
    keywords: [aquarium filter, canister filter, HOB filter, sponge filter, filter media, biological filtration]
    priority: 1

  - name: Aquarium Care & Cleaning
    slug: aquarium-care
    keywords: [gravel vacuum, water changer, aquarium cleaning, algae scraper, magnet cleaner]
    priority: 2

  - name: Reptile Habitat
    slug: reptile-habitat
    keywords: [reptile enclosure, terrarium, vivarium, bearded dragon habitat, leopard gecko setup, ball python tank]
    priority: 2

  - name: Reptile Lighting & Heat
    slug: reptile-lighting
    keywords: [reptile UVB, basking lamp, heat mat, ceramic heat emitter, reptile thermostat, T5 UVB]
    priority: 2

  - name: Bird Feeders & Backyard
    slug: bird-feeders
    keywords: [smart bird feeder, bird feeder camera, backyard birdwatching, hummingbird feeder, suet feeder]
    priority: 3
    note: Research lighter than aquarium/reptile — hub ships, product spokes need additional research

  - name: Expert Care Guides
    slug: expert-care
    keywords: [pet care, exotic pet health, species care guide]
    priority: 4
    note: Cross-vertical educational content; populated as species-specific spokes ship
```

---

## Audience Segments

```yaml
audiences:
  - name: First-Tank Beginners
    ageRange: 18-45
    painPoints: [overwhelm at gear options, fish dying from poor water quality, fear of cycling, budget anxiety]
    intent: Buying first $100-300 setup

  - name: Intermediate Aquarists
    ageRange: 25-55
    painPoints: [upgrading filtration, planted-tank specifics, fishkeeping cost creep, equipment durability]
    intent: Upgrading existing setup or adding tanks

  - name: New Reptile Keepers
    ageRange: 18-45
    painPoints: [animal safety with wrong UVB or heat, complex husbandry requirements, conflicting advice online]
    intent: Buying first species-appropriate enclosure setup ($300-800)

  - name: Experienced Herpetologists
    ageRange: 25-55
    painPoints: [bulb replacement timing, multi-species setups, expanding to new species]
    intent: Replacing/upgrading specific equipment

  - name: Backyard Birders
    ageRange: 35-75
    painPoints: [squirrel-proofing, attracting specific species, identifying visiting birds, photographing visitors]
    intent: Buying smart feeders, birding accessories ($50-400)
```

---

## Expert Sources to Cite

```yaml
citableSources:
  aquarium:
    - University of Florida IFAS Extension
    - Oklahoma State University Extension
    - Seattle Aquarium
    - Tropical Fish Magazine
    - Practical Fishkeeping
    - Tropical Fish Hobbyist Magazine
    - Ornamental Aquatic Trade Association
    - Merck Veterinary Manual (aquatic section)
  reptile:
    - Reptiles Magazine
    - ReptiFiles
    - ARAV (Association of Reptilian and Amphibian Veterinarians)
    - University of Florida WEC herpetology
    - Cornell Veterinary Medicine
    - Merck Veterinary Manual (reptile section)
  birds:
    - Cornell Lab of Ornithology
    - National Audubon Society
    - US Fish and Wildlife Service
    - Birds & Blooms
    - BirdWatching Magazine
    - Bird Watcher's Digest
```

---

## Scoring System

```yaml
scoringSystem:
  name: PetPal Gear Score
  range: 0-10 (one decimal place)
  pillars:
    - { id: expertConsensus, label: "Expert Consensus", weight: 0.30 }
    - { id: effectiveness,   label: "Effectiveness",    weight: 0.25 }
    - { id: animalSafety,    label: "Animal Safety",    weight: 0.20 }
    - { id: durability,      label: "Durability",       weight: 0.15 }
    - { id: value,           label: "Value",            weight: 0.10 }
  verdictThresholds:
    - { gte: 9.0, label: "Must Buy" }
    - { gte: 8.0, label: "Recommended" }
    - { gte: 7.5, label: "Good Value" }
    - { gte: 6.0, label: "Mixed" }
    - { lt:  6.0, label: "Skip" }
  determinismRule: "Same inputs always produce the same output. No randomness. No fabricated subscores. Composite is anchored to editorially-set expertConsensus when present."
  reader-auditable: "https://petpalhq.com/methodology#paw-score"
```

---

## Content Calendar

```yaml
contentCalendar:
  wave1_aquarium:
    target: 6 guides (2 hubs + 4 spokes)
    sequencing: Hubs first per the topical-authority pattern
    timing: First guide live within 5 working days of v2 launch
    research: /Users/mm2/sites/petpalhq-pipeline/research/aquarium/
  wave2_reptile:
    target: 2 hub guides
    sequencing: Habitat hub + UVB lighting hub
    timing: Within 10 working days of v2 launch
    research: /Users/mm2/sites/petpalhq-pipeline/research/reptile/
    blocker: Product spokes need additional research after hubs ship
  wave3_birds:
    target: 1 hub guide
    sequencing: Smart bird feeders hub
    timing: After Wave 2 — research lighter, ships as educational hub
    research: /Users/mm2/sites/petpalhq-pipeline/research/birds/
    note: Product spokes need product-depth research before publishing
  mandatoryRefresh: "Every guide gets a price/availability update every 90 days; sooner during peak buying seasons"
```

---

## Content Rules

```yaml
contentRules:
  minWordCount: 2000
  minAffiliateLinks: 10
  minProducts: 3   # tier-card minimum
  maxProducts: 8   # don't dilute
  requiredSections:
    - "Source count statement (e.g., 'We read 32 expert sources')"
    - "Quick Picks comparison table"
    - "Three-tier product cards (Budget / Sweet Spot / Splurge) — for product roundups only"
    - "Honest trade-off paragraph per pick"
    - "What We Passed On section"
    - "FAQ section"
    - "Affiliate disclosure before first CTA"
  hubRules:
    - "Hub pages don't need the three-tier framework — they're educational, not commercial"
    - "Each hub links down to its spokes; spokes link back up to hub and laterally to siblings"
  voiceRules:
    - "First-person plural ('we') — editorial team, not single reviewer"
    - "Never claim hands-on testing — synthesis only"
    - "Pair every recommendation with an honest trade-off"
    - "Source counts are concrete — '32 expert sources,' not 'many experts'"
  petSpecificRules:
    - "Reptile content must specify species — bearded dragon UVB needs differ from ball python heat needs"
    - "Aquarium content must specify freshwater vs reef vs planted — products vary by tank type"
    - "Bird content is birdwatching/wild-bird unless explicitly noted — pet-bird (parrot/cage) is a separate vertical"
    - "Animal safety section required for any heat, UV, or chemical product"
```

---

## File Paths

```yaml
paths:
  contentDir: src/content/guides
  heroImageDir: public/images/guides
  productImageDir: public/images/products
  authorImageDir: public/images/authors
  siteConfig: src/config/site.ts
  productsData: src/data/products.ts
  consensusData: src/lib/content/consensus-data.ts
  schemaBuilder: src/lib/schema.ts
  creatorsApi: src/lib/creators-api.ts
  research: /Users/mm2/sites/petpalhq-pipeline/research
```

---

## Cross-Link Targets

```yaml
crossLinks:
  strong:
    - site: GardenGearHQ.com
      topics: [bird feeders, garden ponds, outdoor reptile habitats, backyard birding gear]
      direction: reciprocal
    - site: SmartHomeExplorer.com
      topics: [smart pet feeders, smart aquarium controllers, smart cameras for pet monitoring]
      direction: reciprocal
  moderate:
    - site: DeskGearHQ.com
      topics: [office aquariums, workplace fish-tank setups]
      direction: outbound
    - site: ChristmasGearHQ.com
      topics: [pet-themed holiday decor, pet stockings]
      direction: outbound (seasonal only)
  rule: "Pet GEAR → PetPalHQ owns. Pet-themed HOME DECOR → ChristmasGearHQ owns. Backyard/outdoor pet gear can split with GardenGearHQ — coordinate per guide."
  avoid:
    - site: FoodsInMovies.com
```

---

## Disclosure Template

```yaml
disclosure: "PetPalHQ.com earns affiliate commissions from qualifying purchases. Our recommendations are based on expert consensus — we synthesize professional reviews from veterinarians, aquarists, herpetologists, and ornithologists, plus multi-year owner durability data, to find pet gear that's worth your investment. Commission rates never influence our editorial recommendations."
```

---

## Pre-Pipeline Audit (run before each wave)

```yaml
auditCommands:
  - npm run audit:guides     # current guide inventory
  - npm run audit:products   # product data integrity
  - npm run validate:content # schema validation
  - npm run validate:amazon  # ASIN liveness
boundaryTest: "Every new guide must pass: 'Would a person who keeps fish, reptiles, or watches birds in their backyard genuinely find this useful?' If the answer requires a stretch, the guide doesn't belong here."
```
