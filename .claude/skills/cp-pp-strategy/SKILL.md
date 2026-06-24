---
name: cp-pp-strategy
description: Block 1 of the PetPalHQ content pipeline. Gap-fill check, hub assignment, slug + title decision. Outputs strategy decisions to _relay-state.json and pauses for owner approval.
triggers:
  - "cp-pp-strategy"
---

# Block 1: Strategy

**Pipeline position**: 1 of 6 — runs before Research.

See also: `docs/GUIDE_CREATION_PROCESS.md` §"High-level flow" step 1.

## Purpose

Anchor the new guide to the site's content architecture before any writing happens. Wrong hub assignment or scope mismatch is expensive to fix later. This block produces a signed-off decision document (written to `_relay-state.json`) that every downstream block trusts.

## Inputs

- `slug` — from `_relay-state.json` (set by pipeline dispatcher)
- Site state file: `~/.claude/projects/-Users-mm2-sites-petpalhq-next/memory/project_petpal_v2.md`
- Roadmap file: `~/.claude/plans/yes-can-you-research-functional-whale.md`

## Steps

### 1. Read site state

Read `~/.claude/projects/-Users-mm2-sites-petpalhq-next/memory/project_petpal_v2.md` to understand:
- How many guides are currently live
- Which hubs exist and their spoke counts
- Which verticals are thin (use this as the gap signal)

### 2. Check the roadmap

Read `~/.claude/plans/yes-can-you-research-functional-whale.md`. Find the row in the topic table matching the slug (or nearest match). Extract:
- `hub` — the hub slug this topic belongs to
- `vertical` — Cats & Dogs / Aquarium / Reptile / Birds / Playground
- AOV tier
- Any notes about the topic

If the slug is not in the roadmap, note that explicitly and ask the owner to confirm hub + vertical before proceeding.

### 3. Verify the gap is real (anti-cannibalization)

A demand-doc / gap-analysis can be **stale**. Before spending research budget, confirm the gap still exists against **current** inventory — don't trust the roadmap row alone.

How:

1. `ls src/content/guides/` and grep the topic keywords across guides to find overlapping existing pages.
2. Extract every `related:` slug across all guides and diff against the actual files to find phantom links (referenced-but-missing). **But** a recent internal-link-graph repair may have already closed those gaps, so a "phantom link / broken related-link" rationale can be **moot** — verify it still holds before relying on it.
3. Read the nearest overlapping guide's `picks` + `shortAnswer` to judge whether the proposed guide is genuinely differentiated.

Decision rule:

- A broad roundup **plus** a deeper TYPE-spoke or SPECIES-spoke is **legitimate** — the site already does this (e.g. the canister-filters spoke sits under the filters-and-media roundup; a cat-specific food guide under a dog-only LID guide). If you proceed, cross-link the spoke to its roundup.
- A **second broad roundup on the same topic = cannibalization**. Drop it. Instead, **optimize the existing guide** for those keywords (a Tier-2 move, not a new page).

Precedent: in the 2026-06-23 Tier-1 batch, 2 of 8 proposed guides (a dog hypoallergenic-food and a frequent-bath-shampoo) were near-duplicates of existing guides and were dropped; the aquarium "phantom-link" rationale was already moot because the link graph had been repaired. Building them would have cannibalized existing pages.

If the gap fails this check, stop and tell the owner — do not lock a slug/title or advance to Research.

### 4. Confirm or revise decisions

Present a decision summary to the owner:

```
Proposed strategy for: <slug>
─────────────────────────────────────
Hub:        <hub-slug>
Vertical:   <vertical>
Category:   <category> (e.g. "Smart Tech", "Enclosures", "Nutrition")
Guide type: spoke (default) | hub (rare — confirm explicitly)
Pillar:     <pillar> (e.g. "summer-2026", "core", "holiday-2026")
Scope:      <N> picks at <AOV range>
─────────────────────────────────────
Does this look right? Confirm or revise each field.
```

Wait for owner confirmation. Do not proceed to writing the state file until owner says "yes" or provides corrections.

### 5. Write _relay-state.json

After approval, update `_relay-state.json` with:

```json
{
  "hub": "<confirmed-hub-slug>",
  "vertical": "<confirmed-vertical>",
  "category": "<category>",
  "guideType": "spoke",
  "pillar": "<pillar>",
  "scope": "<N picks at $X-Y AOV>",
  "currentBlock": "research"
}
```

## Exit condition

`_relay-state.json` contains confirmed hub, vertical, category, guideType, pillar, and scope — AND owner has explicitly approved. Only then set `currentBlock: "research"`.

## Hard rules

- Must end with explicit hub + scope decision before any downstream block can run.
- Do not guess hub assignment — surface ambiguity and ask.
- Do not start writing frontmatter or picks in this block.

## Handoff

Tell the owner: "Strategy locked. Run `/content-pipeline-petpal <slug>` to advance to Research, or pause here."
