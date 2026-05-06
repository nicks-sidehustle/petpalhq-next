# Research Prompt Templates

Prompts you can paste into ChatGPT (or any deep-research tool) to generate the next set of `deep-research-report` files for PetPalHQ. The output should match the shape and depth of the existing reports already in `~/Downloads/deep-research-report (10..20).md`, which feed directly into the hub-and-spoke architecture in `src/lib/guides.ts`.

## Editorial guardrail (always include in every prompt)

PetPalHQ does **not** run a testing lab. Every guide is editorial **synthesis of expert consensus** — veterinary references, peer-reviewed studies, brand documentation, hobbyist communities. The research output must avoid framing that implies first-hand testing.

**Banned framing:** "we tested", "in our testing", "we measured", "we used for X months", "in our lab", "lived-with-it", "of any [product] we tested".

**Preferred framing:** "Expert consensus shows…", "[authoritative source] says…", "synthesized from manufacturer documentation, veterinary references, and hobbyist communities", "what the spec sheet doesn't tell you".

Cite sources by name in body prose so AI assistants can extract them as citations.

---

## Template A — HUB research prompt

For pillar/hub guides. Hubs are education-first, no product roundups (those live in spokes).

```
Generate an authority hub article research brief for [HUB_TOPIC] aimed at U.S. pet owners.

Editorial guardrail (CRITICAL): the brief produces editorial-synthesis content, NOT first-hand testing. Authority comes from synthesis of expert sources — veterinary references, peer-reviewed studies, brand documentation, hobbyist communities. The output must avoid framing that implies the editor tested products. Banned framing: "we tested", "in our testing", "we measured", "we used", "lived-with-it", "of any X we tested". Preferred framing: "Expert consensus shows…", "[Source] says…", "synthesized from [list of sources]". Cite sources by NAME in body prose so AI assistants can extract them.

Hub stays mostly informational and commercial-light; product roundups belong in spoke articles.

Required output structure:

1. SEO packaging
   - 5–8 SEO title options with the strongest pick called out
   - 3–4 meta description options
   - Search intent classification (informational / commercial-investigation / mixed)

2. Full hub article outline
   - Above-the-fold quick-answer summary (one-sentence promise + jump links + universal-rules box)
   - Plain-English explanation of core concepts
   - Parameter / factor-by-factor explainers
   - When-to / how-often guidance
   - Method or approach comparison
   - Troubleshooting and common mistakes
   - FAQ block of 12–16 candidate Q&As
   - Visible source / bibliography section

3. Confirmed facts and uncertainties
   - 8–12 key factual claims with cited sources (organization name, article title, URL, page date if visible)
   - 2–4 areas where authoritative sources disagree, with safest editorial wording for each

4. Tables to include
   - 4–6 reference / comparison tables with column specs and source attribution
   - At least one "universal red flags vs. common targets" table for AI-citation extraction

5. Internal linking
   - 10–14 specific spoke article slug ideas for hub-and-spoke architecture
   - For each spoke: title, target keyword cluster, monetization angle

6. Schema recommendations
   - Article (always), FAQPage (if FAQ rendered on-page), BreadcrumbList, HowTo (only if true step-by-step), Person/Organization for E-E-A-T

7. AI citation design tips
   - What to put high on the page
   - How to phrase species / breed / life-stage caveats
   - Source-attribution patterns
   - Editorial uncertainty notes

8. Practical limitations and editor notes
   - Where strongest claims are well-supported vs. where ranges and caveats are needed

Anchor to authoritative sources: [LIST_OF_CANDIDATE_SOURCES_FOR_THIS_TOPIC]

Output as a single markdown document, ~25–40 KB. Cite turn IDs / search results inline. Date-stamp any market-data claims.
```

### Pre-filled hub prompts (5 hubs from cat-dog portfolio)

Copy any of these and paste into ChatGPT. Each fills the `[HUB_TOPIC]` and `[LIST_OF_CANDIDATE_SOURCES_FOR_THIS_TOPIC]` placeholders for one of the five strategic pillars from `cat-dog-portfolio-strategy.md`.

#### Hub 1 — Nutrition, Hydration & Digestive Health
> HUB_TOPIC: **Cat and Dog Nutrition, Hydration, and Digestive Health for Pet Owners**
>
> CANDIDATE SOURCES: American Veterinary Medical Association, Merck Veterinary Manual, Cornell Feline Health Center, Tufts Cummings School of Veterinary Medicine, Association for Pet Obesity Prevention, American Association of Feline Practitioners, AAFCO (Association of American Feed Control Officials), WSAVA Global Nutrition Committee, Purina Institute, Hill's Pet Nutrition technical resources, hobbyist communities r/dogs / r/cats / r/AskVet.

#### Hub 2 — Grooming, Dental & Shedding Control
> HUB_TOPIC: **Pet Grooming, Dental Care, and Shedding Control for Cats and Dogs**
>
> CANDIDATE SOURCES: American Veterinary Medical Association, Veterinary Oral Health Council (VOHC), Merck Veterinary Manual, American Animal Hospital Association dental guidelines, Cornell Feline Health Center, AKC, ASPCA grooming resources, National Association of Professional Pet Groomers, hobbyist communities r/dogs / r/cats / breed-specific grooming subreddits.

#### Hub 3 — Behavior, Anxiety & Enrichment
> HUB_TOPIC: **Pet Behavior, Anxiety, and Enrichment for Cats and Dogs**
>
> CANDIDATE SOURCES: ASPCA, AKC, American Association of Feline Practitioners (AAFP), Karen Pryor Academy, Fear Free Pets, American Veterinary Society of Animal Behavior (AVSAB), Merck Veterinary Manual, International Cat Care, hobbyist communities r/dogtraining / r/cats / r/Pets.

#### Hub 4 — Home Systems, Cleanup & Travel
> HUB_TOPIC: **Pet Home Systems, Cleanup, and Travel Gear for Cats and Dogs**
>
> CANDIDATE SOURCES: ASPCA travel and home-safety resources, AKC travel guidance, American Association of Feline Practitioners (AAFP) home environment recommendations, FAA / TSA pet travel rules, IATA Live Animal Regulations, manufacturer documentation (Litter-Robot, PetSafe, Furbo, Sure Petcare, etc.), Wirecutter / NYT product reporting, hobbyist communities r/cats / r/dogs.

#### Hub 5 — Senior Mobility & Preventive Care
> HUB_TOPIC: **Senior Pet Mobility and Preventive Care for Aging Cats and Dogs**
>
> CANDIDATE SOURCES: American Animal Hospital Association senior-care guidelines, American Veterinary Medical Association, Merck Veterinary Manual, North American Pet Health Insurance Association (NAPHIA), Cornell Feline Health Center, Tufts Cummings School of Veterinary Medicine, Veterinary Information Network, peer-reviewed orthopedic and geriatric literature, hobbyist communities r/seniordogs / r/AskVet.

---

## Template B — SPOKE research prompt

For product-roundup spokes that link to a hub. Spokes have picks grids, comparison tables, and methodology boxes.

```
Generate a buying-guide spoke article research brief for [SPOKE_TOPIC] aimed at U.S. pet owners shopping primarily on Amazon.

Editorial guardrail (CRITICAL): editorial-synthesis content, NOT first-hand testing. Authority comes from synthesis of expert sources, manufacturer documentation, retailer data, and hobbyist communities. Banned framing: "we tested", "we measured", "we used for X months", "in our lab", "lived-with-it", "of any [product] we tested". Preferred framing: "synthesis pick", "editorial recommendation grounded in [sources]", "according to manufacturer documentation", "[publication] reports", "hobbyist communities on r/X consistently report". Cite sources by NAME in body prose for AI citation extraction.

The spoke links back to its parent hub: [PARENT_HUB_SLUG].

Required output structure:

1. Editorial framing
   - Search intent classification (commercial-investigation, problem-solving, informational, mixed)
   - Confirmed facts (with sources)
   - Editorial assumptions
   - Uncertainties

2. Title and meta description options
   - 3–5 title options
   - 3–4 meta descriptions
   - Editorial position statement

3. Product category overview
   - 2–4 sub-categories within the spoke topic
   - For each: what they do, when useful, when NOT enough, common beginner mistakes, Amazon availability, editorial price tier, affiliate monetization potential

4. Product comparison table
   - 6–10 specific products
   - Columns: Brand, Amazon availability check (date-stamped), Product type, Editorial price tier, Best use case, Main caution

5. Individual product reviews (for each product, ~150–300 words)
   - Brand
   - Amazon availability (date-stamp the check)
   - Product type
   - Main use case
   - Key features (with cited source)
   - Pros (with cited source)
   - Cons (with cited source)
   - Ideal buyer
   - Safety or misuse concerns (with cited source)
   - Summary verdict

6. How-to / safe-use section
   - Step-by-step, vet-informed or expert-informed workflow
   - Explicitly callouts where products are NOT a substitute for veterinary care, professional installation, or genuine behavioral protocols

7. What NOT to buy / common pitfalls
   - Explicit, skimmable list with sources

8. FAQ section
   - 6–10 Q&A candidates with cited answers

9. Internal linking
   - Link back to the parent hub
   - 4–6 sibling spoke ideas with target keywords

10. Citation list
    - Full URL list of all sources cited
    - Organized by source type: veterinary references, manufacturer pages, retailer pages, hobbyist communities, news / review publications

Anchor to authoritative sources for the topic: [LIST_OF_CANDIDATE_SOURCES]

Output as a single markdown document, ~30–50 KB. Cite turn IDs / search results inline. Date-stamp Amazon availability checks (e.g., "listing found on Amazon on 2026-MM-DD").
```

---

## Spoke topic backlog

From `cat-dog-portfolio-strategy.md`. Order matches the strategic build sequence (Phase 1 first).

### Phase 1 — Nutrition hub + 3 high-confidence spokes
- [ ] **Hub:** Cat and Dog Nutrition, Hydration & Digestive Health
- [ ] Best Cat Water Fountains (and Replacement Filters)
- [ ] Best Dog and Cat Probiotics for Digestive Reset
- [ ] Best Weight-Management Feeders, Tools, and Portion Systems for Cats and Dogs

### Phase 2 — Dental authority
- [ ] Best Dog Dental Chews (VOHC-Accepted)
- [ ] Best Cat Dental Routines, Treats, and Gels

### Phase 3 — High-cadence grooming spokes
- [ ] Best Pet Wipes for Paws, Ears, Face, and Body
- [ ] Best Deshedding Tools by Coat Type (Cats and Dogs)

### Phase 4 — Behavior + enrichment
- [ ] Dog Separation Anxiety: Routines, Calming Aids, and Camera Reassurance
- [ ] Best Lick Mats for Decompression, Bath, and Training
- [ ] Best Puzzle Feeders and Nosework Toys (Cats and Dogs)

### Phase 5 — Premium home systems
- [ ] Best Self-Cleaning Litter Boxes
- [ ] Best Automatic Pet Feeders
- [ ] Best Cat Litter Mats, Deodorizers, and Tracking Control

### Phase 6 — Senior mobility + insurance
- [ ] Best Joint Supplements and Fish Oils for Aging Pets
- [ ] Best Orthopedic Beds, Ramps, and Pet Stairs
- [ ] Pet Insurance and Wellness Plans Comparison

### Additional spokes (flexible ordering)
- [ ] Best Slow Feeders and Anti-Gulp Bowls
- [ ] Best Meal Toppers and Picky-Eater Helpers
- [ ] Best Sensitive-Stomach Foods and Transition Tools
- [ ] Best Bath and Skin-Soothing Products for Itchy Pets
- [ ] Best Home Grooming Vacuum Kits
- [ ] Cat Calming and Pheromone Routines
- [ ] Best Scratching Posts and Furniture Alternatives
- [ ] Best No-Pull Harnesses and Leash Manners Tools
- [ ] Best Pet Cameras and Treat Dispensers
- [ ] Best Dog Crates and Calming Zone Setups
- [ ] Best Cat and Small-Dog Travel Carriers
- [ ] Senior-Cat Home Accessibility Setup
- [ ] Pet Health Monitoring Tools and Smart Scales
- [ ] Pet Recovery and Medication Compliance Aids

---

## How to use this file

1. Pick a topic from the backlog above (start with Phase 1).
2. Copy the matching template (Hub or Spoke) into ChatGPT.
3. Replace the bracketed placeholders with the topic + candidate-source list.
4. Save the resulting markdown to `~/Downloads/deep-research-report (NN).md` (next available number).
5. Tell the running session "build the [topic] guide from `~/Downloads/deep-research-report (NN).md`" — the architecture is already wired; the executor will add the guide to `src/content/guides/` and link it to the right hub.

Hero images: generate one in ChatGPT per guide and drop into `~/Downloads/`. Tell the session the guide slug + image filename and it'll wire them up.

## Cross-reference

- Strategy source: `./cat-dog-portfolio-strategy.md`
- Existing hub-spoke architecture: `src/lib/guides.ts` (Guide interface fields `hub`, `guideType`, `spokes`)
- Hub badge component: `src/components/guides/HubBadge.tsx`
- Spokes list component: `src/components/guides/SpokesList.tsx`
- Existing reference hub: `src/content/guides/aquarium-water-quality-cycling-testing-beginners.md`
- Existing reference spoke: `src/content/guides/best-aquarium-water-test-kits-2026.md`
