---
name: cp-pp-research
description: Block 2 of the PetPalHQ content pipeline. Authority sources, community forums, manufacturer doc identification. Updates _relay-state.json with expertSources, communityForums, expectedBrands.
triggers:
  - "cp-pp-research"
---

# Block 2: Research

**Pipeline position**: 2 of 6 — runs after Strategy, before Skeleton.

See also: `docs/GUIDE_CREATION_PROCESS.md` §"High-level flow" steps 2 and 4.

## Purpose

Build the source layer before any prose is written. Every claim in the final guide must trace back to a real source. This block identifies the sources; it does not yet write the guide.

**Critical**: This block MUST NOT generate ownerVoice quotes. Quotes are verbatim-only from real Reddit threads, fetched via `fetch-reddit-quotes.ts`. AI-generated or paraphrased quotes are a YMYL trust violation.

## Inputs

- `_relay-state.json` — must contain `hub`, `vertical`, `category`, `scope` from Strategy block
- Authority sources: `src/lib/authority-links.ts` (~30 sources)

## Steps

### 1. Read authority-links.ts

Read `/Users/mm2/sites/petpalhq-next/src/lib/authority-links.ts` to see all ~30 available authority sources.

Select 5-12 most-relevant sources for this guide's topic. Prioritize:
- Veterinary / regulatory bodies directly relevant to the species and product category
- For reptile guides: Bowling Green State University Herpetarium, Merck Veterinary Manual, USDA APHIS
- For aquarium guides: EPA, Merck Veterinary Manual, AVMA
- For cat/dog guides: AAHA, AVMA, AAFP (cats), Merck Veterinary Manual, Cornell Feline Health Center, ASPCA
- For bird guides: LafeberVet, AVMA, ASPCA
- For nutrition-adjacent guides: AAFCO, FDA Center for Veterinary Medicine, Tufts Cummings Petfoodology

### 2. Identify community forums

Identify 2-3 relevant subreddits for the guide's topic. Examples:
- r/dogs, r/cats, r/AskVet for cat/dog health/behavior
- r/reptiles, r/geckos, r/BeardedDragons for reptile enclosure topics
- r/Aquariums, r/PlantedTank, r/ReefTank for aquarium topics
- r/parrots, r/budgies, r/cockatiel for bird topics
- r/petadvice for cross-species questions

For each subreddit, suggest 1-2 search phrases the owner can use to find highly-upvoted discussion threads (e.g. "best GPS collar" in r/dogs). These threads become the source for `fetch-reddit-quotes.ts`.

**Do NOT fabricate quotes.** Print the following reminder prominently:

> **Owner action required**: Find 2-4 high-quality Reddit threads for this topic. Then run:
> ```bash
> cd /Users/mm2/sites/petpalhq-next
> npx tsx scripts/fetch-reddit-quotes.ts <thread-url>
> ```
> Run once per thread. The script extracts verbatim community quotes for `ownerVoice[]` in the frontmatter.

### 3. Identify expected brands / manufacturers

Based on scope from Strategy (AOV range + topic), list 5-8 brands likely to be picks. For each brand:
- Name
- Why likely (market position, price tier, feature set)
- Whether they have a dedicated product page / spec doc worth reading

Example format:
```
Expected brands:
- Tractive (GPS dog collars) — market leader, $150 device + subscription
- Fi Series 3 (GPS collars) — premium tier, strong Reddit community
- SpotOn GPS (virtual fence tech) — $150 device, $20/mo
```

Do not look up live prices yet — that is Polish block's job via amazon-lookup.cjs.

### 4. Update _relay-state.json

```json
{
  "expertSources": ["AAHA", "Merck Veterinary Manual", "AVMA", "..."],
  "communityForums": ["r/dogs", "r/AskVet"],
  "expectedBrands": ["Tractive", "Fi Series 3", "SpotOn GPS", "..."],
  "currentBlock": "skeleton"
}
```

## Exit condition

`_relay-state.json` updated with `expertSources` (≥5), `communityForums` (≥2), `expectedBrands` (≥5). Owner has reviewed and confirmed the source set before advancing.

## Hard rules

- DO NOT generate ownerVoice quotes under any circumstances.
- DO NOT run `fetch-reddit-quotes.ts` directly — print the command for the owner to run with their chosen thread URLs.
- DO NOT look up live Amazon data yet — that is Polish block's responsibility.

## Handoff

Print the `fetch-reddit-quotes.ts` command pattern. Tell the owner: "Research complete. Run the Reddit fetcher for your chosen threads, then run `/content-pipeline-petpal <slug>` to advance to Skeleton."
