# Spoke Research Prompts — Cat & Dog Portfolio (Pending)

Each block below is a complete, self-contained ChatGPT prompt for one missing spoke. Copy a whole block, paste into ChatGPT, save the result to `~/Downloads/`, then tell Claude which topic landed.

## Status snapshot (updated)

| Hub | Built | Pending |
|---|---|---|
| Hub 1 — Nutrition | 7 ✓ all done | 0 |
| Hub 2 — Grooming | 8 ✓ all done | 0 |
| Hub 3 — Behavior | 1 (Puzzle Toys) | 5 (below) |
| Hub 4 — Home/Travel | 6 ✓ all done | 0 |
| Hub 5 — Senior Mobility | 1 (Ramps/Stairs) | 5 (below) |

**Total pending: 10 spoke prompts.**

Spoke list realigned to match the hero-image batch in `pphq_additional_hub_spokes_16x9.zip` (your evolved spoke plan). Heroes are pre-positioned in `public/images/guides/` — they'll auto-link the moment a spoke ships with the matching slug.

---

# Hub 3 — Behavior, Anxiety & Enrichment spokes (5 pending)

Parent hub slug: `cat-dog-behavior-anxiety-enrichment`

## 3.1 — Best Cat Enrichment Toys & Scratching Posts

```
Generate a buying-guide spoke article research brief for "Best Cat Enrichment Toys and Scratching Posts" aimed at U.S. cat owners shopping primarily on Amazon. Target slug: best-cat-enrichment-toys-scratchers-2026.

EDITORIAL GUARDRAIL (critical): editorial synthesis, NOT first-hand testing. Banned framing: "we tested", "we measured", "we used for X months", "in our lab", "lived-with-it", "of any [product] we tested" — and any close paraphrase. Preferred framing: "AAFP/ISFM environmental-needs framework lists scratching as…", "International Cat Care recommends…", "synthesized from veterinary references and manufacturer documentation". Cite sources by NAME for AI/LLM citation extraction.

PARENT HUB: this spoke links back to /cat-dog-behavior-anxiety-enrichment/.

Frame declawing as actively opposed by AAFP, ASPCA, AVMA — that anchor is non-negotiable.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent, confirmed facts (scratching is normal/necessary; enrichment satisfies hunting/foraging instincts), uncertainties (cat preference varies)
2. Title + meta description options (3–5 each)
3. Product category overview — vertical sisal posts (height matters), horizontal cardboard scratchers, angled scratchers, wall-mount scratchers, multi-level cat trees, prey-mimicking interactive toys, puzzle feeders for cats, wand toys, food-puzzle balls
4. Product comparison table — 6–10 products: brand, Amazon availability check (date-stamped), product type, price tier, best use case, main caution
5. Individual product reviews (~200 words each) — brand, Amazon availability, type, main use, key features (cited), pros (cited), cons (cited), ideal buyer, safety concerns (cited), summary verdict
6. How-to / safe-use section — placement (near sleeping area, near scratched furniture), height + stability requirements, surface preference testing, multi-cat household guidance, toy rotation cadence per Fear Free
7. What NOT to buy — flimsy posts, nail caps as long-term solution, anti-scratch punishment devices, breakable wand-toy tips
8. FAQ (6–10 Q&A — including declawing alternatives, training to use posts, multi-cat strategy, indoor enrichment cadence)
9. Internal linking — parent hub + 4–6 sibling spokes
10. Citation list with URLs

ANCHOR SOURCES: American Association of Feline Practitioners (AAFP) position on scratching/declawing, International Cat Care, ASPCA declawing position, AVMA declawing position, Feline Veterinary Medical Association environmental-needs framework, peer-reviewed scratching-substrate studies, Fear Free Pets, manufacturer pages (SmartCat Ultimate Scratching Post, PetFusion 3-Sided Vertical Scratcher, Frisco/Petique cat trees, 4Claws, Catit Senses, Da Bird wand toy), hobbyist communities (r/cats, Cats.com).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

## 3.2 — Best Cat Pheromone Diffusers & Calming Aids

```
Generate a buying-guide spoke article research brief for "Best Cat Pheromone Diffusers and Calming Aids: Multi-Cat Tension, Vet Visits, Moving, Fireworks, and Introductions" aimed at U.S. cat owners shopping primarily on Amazon. Target slug: best-cat-pheromone-diffusers-calming-2026.

EDITORIAL GUARDRAIL: editorial synthesis, NOT first-hand testing. Banned framing as in prior prompts. Preferred: "AAFP/ISFM Intercat Tension Guidelines say…", "International Cat Care recommends…", "Feliway documentation says…". Cite sources by NAME.

PARENT HUB: /cat-dog-behavior-anxiety-enrichment/.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent, confirmed facts (Feliway pheromone analog evidence, environmental enrichment pillars, multi-cat tension framework), uncertainties (calming-treat efficacy varies)
2. Title + meta description options
3. Product category overview — pheromone diffusers (Feliway Classic, MultiCat, Optimum) and refills, calming chews/supplements, covered retreat beds, vertical retreat space, post-stress recovery sprays, travel sprays
4. Product comparison table
5. Individual product reviews (~200 words each)
6. How-to / safe-use — Feliway placement, environmental needs five-pillar framework, transition acclimation, when to escalate to a feline-only vet or veterinary behaviorist
7. What NOT to buy — punishment devices, water-spray bottles (decades of behavior research argue against), unverified CBD claims
8. FAQ (6–10)
9. Internal linking
10. Citation list

ANCHOR SOURCES: AAFP/ISFM 2024 Intercat Tension Guidelines, International Cat Care, Feline Veterinary Medical Association environmental-needs framework, AVSAB, Merck Veterinary Manual, AVMA, peer-reviewed pheromone studies (Frank 2010 review, Mills 2013), Fear Free Pets, manufacturer pages (Ceva Feliway Classic/MultiCat/Optimum, Comfort Zone, NaturVet calming chews, Hauspanther vertical territory, Catit Vesper), hobbyist communities (r/cats, r/CatAdvice).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

## 3.3 — Best Dog Chew Toys for Anxiety & Boredom

```
Generate a buying-guide spoke article research brief for "Best Dog Chew Toys for Anxiety, Decompression, and Boredom" aimed at U.S. dog owners shopping primarily on Amazon. Target slug: best-dog-chew-toys-anxiety-2026.

EDITORIAL GUARDRAIL: editorial synthesis. Banned framing as in prior prompts. **CRITICAL framing:** chew toys support anxiety routines but DO NOT treat clinical separation anxiety. Per AVSAB and Merck, true separation anxiety often requires veterinary behavior modification and may need prescription medication. Preferred: "ASPCA notes chewing/licking can have a calming effect…", "Karen Pryor Academy uses high-value chewing as counter-conditioning…". Cite sources by NAME.

PARENT HUB: /cat-dog-behavior-anxiety-enrichment/.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent, confirmed facts, uncertainties about supplement-style "calming chew" claims
2. Title + meta description options
3. Product category overview — KONG-style stuffable rubber chews, lick mats (suction-cup, freezer-safe), durable chew bones (synthetic), edible long-lasting chews (with vet-grade safety filters), interactive treat-dispensers, snuffle mats
4. Product comparison table
5. Individual product reviews (~200 words each)
6. How-to / safe-use — recipe ideas (xylitol-free), supervision, freeze cycles, replacement when worn, size-matching to avoid choking
7. What NOT to buy — non-food-grade silicone, anything with detachable small parts, peanut butter with xylitol (cite ASPCA poison control), excessively hard chews that risk dental fractures (cite Merck/AVMA)
8. FAQ (6–10 — including xylitol safety, dental-fracture risk on hard chews, when chewing means see a vet)
9. Internal linking
10. Citation list

ANCHOR SOURCES: ASPCA Animal Poison Control xylitol warning, ASPCA general dog care, AVSAB position statements, Merck Veterinary Manual canine separation anxiety + dental fracture sections, AVMA dental statements, AKC behavior articles, Karen Pryor Academy, Fear Free Pets, manufacturer pages (KONG Classic / Wobbler / Extreme, West Paw Toppl, Nylabone, Benebone, LickiMat Buddy/Soother, PetSafe Busy Buddy, Outward Hound puzzle toys, PAW5 Wooly Snuffle Mat), hobbyist communities (r/dogtraining, r/dogs).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

## 3.4 — Best Dog Training Treats & Clickers

```
Generate a buying-guide spoke article research brief for "Best Dog Training Treats and Clickers" aimed at U.S. dog owners shopping primarily on Amazon. Target slug: best-dog-training-treats-clickers-2026.

EDITORIAL GUARDRAIL: editorial synthesis. Banned framing as in prior prompts. Preferred: "AVSAB recommends reward-based training for all dogs…", "Karen Pryor Academy lists clicker conditioning as…", "AKC training resources advise…". Cite sources by NAME. AVSAB explicitly opposes prong/shock/choke collars — frame those as NOT-RECOMMENDED with sourced rationale.

PARENT HUB: /cat-dog-behavior-anxiety-enrichment/.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent (high-volume commercial + how-to), confirmed facts (reward-based training is the consensus standard; treat motivation is individual)
2. Title + meta description options
3. Product category overview — soft training treats (small, low-cal, broken-into-tiny-pieces), freeze-dried single-protein treats, lickable training treats, training treat pouches, clickers (button vs box-clicker), whistle clickers, treat-launcher tools
4. Product comparison table — 6–10 picks
5. Individual product reviews (~200 words each)
6. How-to / safe-use — calorie math (treats ≤10% of daily calories per Tufts), high-value vs low-value reinforcer hierarchy, clicker-charging protocol, when to involve a CPDT-KA trainer
7. What NOT to buy — high-calorie / fatty treats, products with xylitol or onion/garlic, training tools with aversive design (prong, shock, choke — cite AVSAB)
8. FAQ (6–10)
9. Internal linking
10. Citation list

ANCHOR SOURCES: AVSAB position statements (humane training + aversive equipment), Karen Pryor Academy, AKC, ASPCA, AAHA Behavior Management Guidelines, Tufts Cummings Petfoodology on treat-calorie discipline, peer-reviewed studies (Cooper 2014 e-collar study, Vieira de Castro 2020), manufacturer pages (Zukes Mini Naturals, Stewart Pro-Treat, Wellness Petite Treats, Crazy Dog Train-Me, Vital Essentials freeze-dried, KONG clicker, StarMark clicker, Mighty Paw treat pouch), hobbyist communities (r/dogtraining, r/Dogtraining_help).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

## 3.5 — Best Pet Calming Aids for Anxiety

```
Generate a buying-guide spoke article research brief for "Best Pet Calming Aids for Anxiety: Supplements, Wraps, Music, and Diffusers" aimed at U.S. pet owners shopping primarily on Amazon. Target slug: best-pet-calming-aids-anxiety-2026.

EDITORIAL GUARDRAIL: editorial synthesis. Banned framing as in prior prompts. **CRITICAL framing:** the article must repeatedly emphasize that clinical anxiety often requires veterinary behavior modification and may need prescription medication (per Merck and AVSAB) — these products are SUPPORTIVE, not curative. Preferred: "AVSAB position statements say…", "Merck Veterinary Manual notes…", "Karen Pryor Academy outlines…". Cite sources by NAME.

PARENT HUB: /cat-dog-behavior-anxiety-enrichment/.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent (urgent problem-solving + commercial), confirmed facts (clinical anxiety is a diagnosed condition; products support the plan); uncertainties (limited peer-reviewed support for many "calming" supplement claims)
2. Title + meta description options
3. Product category overview — calming chews/supplements (with caveats), pheromone diffusers (Adaptil for dogs, Feliway for cats), anxiety wraps (ThunderShirt), calming-music streamers / sound-machine devices, white-noise comfort accessories, departure-ritual tools (lick mats, frozen KONGs)
4. Product comparison table — 6–10 picks
5. Individual product reviews (~200 words each)
6. How-to / safe-use — staged departure protocol overview, trigger reduction, vet-behaviorist escalation criteria
7. What NOT to buy — bark collars / shock devices (AVSAB explicitly opposes), unsubstantiated CBD/hemp claims, punishment-based devices
8. FAQ (6–10 — including "are calming supplements proven?", "how do I know if it's clinical?", "do I need a behaviorist?")
9. Internal linking
10. Citation list

ANCHOR SOURCES: AVSAB position statements, Merck Veterinary Manual canine + feline anxiety sections, ASPCA, AKC behavior articles, AAFP/ISFM, International Cat Care, Karen Pryor Academy, Fear Free Pets, peer-reviewed studies (Salonen 2020, Vieira de Castro 2020, Frank 2010 pheromone review), manufacturer pages (Adaptil, Feliway, ThunderShirt, Zesty Paws Calming Bites, NaturVet Quiet Moments, iCalmDog/iCalmCat speakers, KONG Classic, LickiMat), hobbyist communities (r/dogtraining, r/cats, r/Pets).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

---

# Hub 5 — Senior Mobility & Preventive Care spokes (5 pending)

Parent hub slug: `senior-pet-mobility-preventive-care`

## 5.1 — Best Joint Supplements for Dogs & Cats

```
Generate a buying-guide spoke article research brief for "Best Joint Supplements for Aging Dogs and Cats" aimed at U.S. pet owners shopping primarily on Amazon. Target slug: best-joint-supplements-dogs-cats-2026.

EDITORIAL GUARDRAIL: editorial synthesis. Banned framing as in prior prompts. **CRITICAL framing:** the article must distinguish supplement-grade vs prescription-grade products and emphasize that supplements support — not replace — veterinary management of osteoarthritis (per Merck and AAHA). Preferred: "Merck Veterinary Manual says weight optimization is primary OA prevention…", "AAHA's Pain Management Guidelines list supplements as part of multimodal care…", "the National Animal Supplement Council (NASC) seal indicates…". Cite sources by NAME.

PARENT HUB: /senior-pet-mobility-preventive-care/.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent, confirmed facts (glucosamine/chondroitin evidence is mixed; omega-3 EPA/DHA has stronger evidence per Merck and Frontiers consensus on canine OA)
2. Title + meta description options
3. Product category overview — multi-ingredient daily chews, EPA/DHA fish oils (TG vs EE form), green-lipped mussel products, prescription joint diets (link to vet), Adequan Canine (Rx only — flag, do not affiliate)
4. Product comparison table — 6–10 picks (NASC seal column, vet-recommended column)
5. Individual product reviews (~200 words each)
6. How-to / safe-use — dosage rationale, expectation-setting (8–12 weeks), vet-overseen integration with NSAIDs, when to escalate
7. What NOT to buy — supplements without strain/concentration disclosure, fish oils without third-party purity testing, "miracle cure" CBD claims without evidence
8. FAQ (6–10 — including "is glucosamine proven?", "fish oil for cats safe?", "what about CBD?")
9. Internal linking — parent hub + 4–6 sibling spokes
10. Citation list

ANCHOR SOURCES: Merck Veterinary Manual osteoarthritis section, AAHA Pain Management Guidelines, AVMA, National Animal Supplement Council (NASC), Frontiers consensus on canine OA, peer-reviewed omega-3 studies (Roush 2010, Bauer 2011), Tufts Cummings Petfoodology, manufacturer pages (Nutramax Cosequin/Dasuquin, Welactin Omega-3, GreenPet Hip & Joint, VetriScience GlycoFlex, Zesty Paws Mobility Bites), hobbyist communities (r/AskVet, r/seniordogs).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

## 5.2 — Best Orthopedic Dog Beds for Senior Pets

```
Generate a buying-guide spoke article research brief for "Best Orthopedic Dog Beds for Aging and Senior Dogs and Cats" aimed at U.S. pet owners shopping primarily on Amazon. Target slug: best-orthopedic-dog-beds-senior-pets-2026.

EDITORIAL GUARDRAIL: editorial synthesis. Banned framing as in prior prompts. Preferred: "AAHA's senior-care framework includes environmental modification such as pressure-relieving beds…", "Merck Veterinary Manual notes pain-related rest disturbance…". Cite sources by NAME.

PARENT HUB: /senior-pet-mobility-preventive-care/.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent (commercial), confirmed facts (memory foam vs egg-crate vs gel, removable washable covers, weight ratings)
2. Title + meta description options
3. Product category overview — solid memory foam beds, bolster beds with foam base, cooling-gel beds, raised cot/elevated beds (joint-friendly), multi-pet large-format beds, washability tiers
4. Product comparison table — 6–10 picks
5. Individual product reviews (~200 words each)
6. How-to / safe-use — sizing rules (length nose-to-tail), placement (drafts, traction surface), introducing a senior pet to a new bed, washing cadence
7. What NOT to buy — flat foam too thin for arthritic joints, beds with non-removable covers, ultra-soft beds that fail to support older joints
8. FAQ (6–10)
9. Internal linking
10. Citation list

ANCHOR SOURCES: AAHA Senior Care Guidelines, Merck Veterinary Manual on osteoarthritis, AKC arthritis articles, AVMA, Cornell Feline Health Center, peer-reviewed orthopedic literature, manufacturer pages (Big Barker, PetFusion Ultimate, Friends Forever Orthopedic Sofa Bed, FurHaven Plush, K&H Pet Products Original), Wirecutter, hobbyist communities (r/seniordogs, r/dogs).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

## 5.3 — Best Lift Harnesses for Senior Dogs

```
Generate a buying-guide spoke article research brief for "Best Lift Harnesses and Mobility Slings for Senior Dogs" aimed at U.S. dog owners shopping primarily on Amazon. Target slug: best-lift-harnesses-senior-dogs-2026.

EDITORIAL GUARDRAIL: editorial synthesis. Banned framing as in prior prompts. Preferred: "AAHA's pain-management guidelines on home mobility support…", "Merck Veterinary Manual on adjunctive mobility care…". Cite sources by NAME. Lift harnesses are vet-supervised adjuncts — frame accordingly.

PARENT HUB: /senior-pet-mobility-preventive-care/.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent (urgent problem-solving + commercial), confirmed facts (lift harnesses support post-op + degenerative-joint mobility), vet-collaboration emphasis
2. Title + meta description options
3. Product category overview — rear-only support slings, full-body lift harnesses, dual-handle Help 'Em Up–style harnesses for daily use, wash-and-wear soft slings, recovery slings for post-op, harness + ramp combo workflows
4. Product comparison table — 6–10 picks
5. Individual product reviews (~200 words each)
6. How-to / safe-use — sizing, gait support, lifting technique, surface friction (avoid hardwood transitions), when to call the surgeon, adverse signs (pain on lift, refusal to move, vocalization)
7. What NOT to buy — generic "lift" wraps without proper support points, harnesses without weight ratings, anything with sharp buckles near pressure points
8. FAQ (6–10)
9. Internal linking
10. Citation list

ANCHOR SOURCES: AAHA Pain Management & Anesthesia Guidelines, Merck Veterinary Manual post-op recovery + osteoarthritis sections, AVMA, AKC senior dog resources, peer-reviewed mobility-aid studies, manufacturer pages (GingerLead Sling, Help 'Em Up Harness, Walkabout Harnesses Front + Rear, Solvit Carelift, RuffWear WebMaster, Petlinks Comfort Sling), hobbyist communities (r/seniordogs, r/AskVet).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

## 5.4 — Best Non-Slip Dog Socks & Paw Grips

```
Generate a buying-guide spoke article research brief for "Best Non-Slip Dog Socks and Paw Grips for Senior Dogs" aimed at U.S. dog owners shopping primarily on Amazon. Target slug: best-non-slip-dog-socks-paw-grips-2026.

EDITORIAL GUARDRAIL: editorial synthesis. Banned framing as in prior prompts. Preferred: "AAHA's senior-care guidelines list home traction modifications…", "AKC senior dog mobility advice notes…", "Merck Veterinary Manual on environmental modification for OA…". Cite sources by NAME. Frame non-slip products as part of a multimodal home-traction strategy alongside rugs, ramps, beds.

PARENT HUB: /senior-pet-mobility-preventive-care/.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent, confirmed facts (slick floors are a documented mobility hazard for senior pets per AAHA and AKC; traction reduces falls)
2. Title + meta description options
3. Product category overview — fabric anti-slip socks (4-pack), silicone-grip socks, ToeGrips silicone toenail caps, anti-slip paw wax/balm, grip-coated booties, mobility shoes for indoor traction, area rugs / runners (info-only, link to senior cat access spoke if it exists)
4. Product comparison table — 6–10 picks
5. Individual product reviews (~200 words each)
6. How-to / safe-use — sizing, conditioning to wear, paw-checking cadence, contraindications (open paw wounds, severe arthritis where pressure on paw worsens pain)
7. What NOT to buy — socks without anti-slip soles, anything with rubber bands that cut circulation, products with toxic adhesives
8. FAQ (6–10)
9. Internal linking
10. Citation list

ANCHOR SOURCES: AAHA Senior Care Guidelines, AKC senior-dog mobility resources, Merck Veterinary Manual on OA environmental modification, AVMA, peer-reviewed canine fall-injury studies if available, manufacturer pages (Dr. Buzby's ToeGrips, Pawz dog booties, RC Pet Products socks, GripTrex paw grips, Walkabout traction socks, PadPaws), hobbyist communities (r/seniordogs).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

## 5.5 — Best Dog Wheelchairs & Mobility Carts

```
Generate a buying-guide spoke article research brief for "Best Dog Wheelchairs and Mobility Carts for Senior and Disabled Dogs" aimed at U.S. dog owners shopping primarily on Amazon. Target slug: best-dog-wheelchairs-mobility-carts-2026.

EDITORIAL GUARDRAIL: editorial synthesis. Banned framing as in prior prompts. Preferred: "AAHA's pain-management guidelines on degenerative-disease support…", "Merck Veterinary Manual on canine intervertebral-disc disease and neuromuscular conditions…". Cite sources by NAME. Wheelchairs are vet-supervised mobility aids — emphasize that condition diagnosis (IVDD vs degenerative myelopathy vs post-op) drives device selection, not raw breed/weight.

PARENT HUB: /senior-pet-mobility-preventive-care/.

REQUIRED OUTPUT (single ~30–50 KB markdown doc):
1. Editorial framing — search intent (high-emotion problem-solving), confirmed facts (wheelchairs restore mobility for pets with paresis, IVDD recovery, degenerative myelopathy, amputee fitting), uncertainties (pet acceptance varies, fit issues common)
2. Title + meta description options
3. Product category overview — rear-support wheelchairs, full-support 4-wheel wheelchairs, IVDD-specific recovery carts, custom-fit vs adjustable models, lightweight indoor carts, all-terrain wheelchairs
4. Product comparison table — 6–10 picks (weight class, custom-fit availability, terrain fit, price tier)
5. Individual product reviews (~200 words each)
6. How-to / safe-use — fitting (with vet consult), conditioning to wheelchair, monitoring for pressure sores, supervised use only at first, when to retire/transition (declining condition)
7. What NOT to buy — wheelchairs without weight rating disclosure, generic frames sold without sizing guidance, anything that requires DIY structural modification for fit
8. FAQ (6–10 — including pet acceptance, fit issues, conditions wheelchairs DON'T solve)
9. Internal linking
10. Citation list

ANCHOR SOURCES: AAHA Pain Management Guidelines, Merck Veterinary Manual neurology + post-op sections (IVDD, degenerative myelopathy), AVMA, AKC senior dog and disability resources, manufacturer pages (Walkin' Pets / HandicappedPets.com Walkin' Wheels, K9 Carts, Eddie's Wheels, Best Friend Mobility, DoggOn Wheels, Anything Pawsable), hobbyist communities (r/seniordogs, r/dogswithdisabilities).

Output as a single markdown document. Date-stamp Amazon availability checks.
```

---

## Workflow reminder

1. Pick a prompt
2. Paste into ChatGPT (the same project the other research came from)
3. Save the output to `~/Downloads/`
4. Tell Claude: "build the [topic] guide from `~/Downloads/[filename]`"
5. Claude builds the spoke, wires it to the right hub, takes care of the picks via Amazon Creators API, runs editorial audit
6. Hero images are already pre-positioned at the matching slug in `public/images/guides/` — they auto-display

For Hub 3 + Hub 5 prompts, the slug names in each prompt match a hero image already in `public/images/guides/`, so once a spoke ships, its hero is live immediately.

## Cross-reference

- Strategy source: `./cat-dog-portfolio-strategy.md`
- Generic prompt templates: `./research-prompt-templates.md`
- Existing hub-spoke architecture: `src/lib/guides.ts` (Guide interface fields `hub`, `guideType`, `spokes`)
