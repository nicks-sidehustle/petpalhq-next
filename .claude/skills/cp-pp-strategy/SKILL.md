---
name: cp-pp-strategy
description: Block 1 of the PetPalHQ content pipeline. Demand gate, gap/cannibalization check, hub assignment, slug + title decision. Outputs strategy decisions to _relay-state.json and pauses for owner approval.
triggers:
  - "cp-pp-strategy"
---

# Block 1: Strategy

**Pipeline position**: 1 of 6 — runs before Research. Law: `/Users/Nick/petpalhq-next/CLAUDE.md`.

## Purpose

Anchor the new guide to real demand and the site's content architecture before any writing happens. This block produces a signed-off decision (written to `_relay-state.json`) that every downstream block trusts.

## Inputs

- `slug` — from `_relay-state.json`
- Current inventory: `src/content/guides/` (the live corpus is the site state — do not rely on memory files)
- Demand evidence the owner or a research lane supplies (see step 1)

## Steps

### 1. Demand gate (must pass before anything else — pending owner ratification)

A new guide is built only when demand is validated over the **trailing two weeks** — Bing Webmaster Tools AI Performance citations/queries (the citation metric of record) for the topic or its cluster. Record the evidence (source, date range, counts) in `demandEvidence`. Precedent: #183 (a litter cluster drawing 368 citations/week with one unserved slot) and #185 (96 citations/7d at 11.72% share, no cat mobility guide).

If no trailing-two-week evidence exists, stop and tell the owner what is missing. Do not use a stale roadmap row or a gut call as demand.

### 2. Verify the gap is real (anti-cannibalization)

1. `ls src/content/guides/` and grep the topic keywords across guides to find overlapping pages.
2. Extract every `related:` slug across all guides and diff against actual files to find phantom links — but verify a "broken related-link" rationale still holds before relying on it.
3. Read the nearest overlapping guide's `picks` + `shortAnswer` to judge whether the proposed guide is genuinely differentiated.

Decision rule:
- A broad roundup **plus** a deeper TYPE-spoke or SPECIES-spoke is legitimate; cross-link the spoke to its roundup.
- A **second broad roundup on the same topic = cannibalization**. Drop it and optimize the existing guide instead.

Precedent (2026-06-23): 2 of 8 proposed guides were near-duplicates of existing guides and were dropped.

If the gap fails, stop and tell the owner — do not lock a slug/title or advance.

### 3. Confirm decisions with the owner

```
Proposed strategy for: <slug>
─────────────────────────────────────
Demand:     <source, date range, counts>
Overlap:    <closest existing guide + how this differs>
Hub:        <hub-slug>   (match sibling guides' frontmatter)
Vertical:   <vertical>
Category:   <category>
Guide type: spoke (default) | hub (rare — confirm explicitly)
Pillar:     <pillar>
Scope:      up to <N> picks at <AOV range> (final count = what passes live verification)
─────────────────────────────────────
```

Owner questions come after the facts, carry counts, max 3 per decision. Wait for explicit confirmation.

### 4. Write _relay-state.json

```json
{
  "hub": "<hub-slug>", "vertical": "<vertical>", "category": "<category>",
  "guideType": "spoke", "pillar": "<pillar>",
  "scope": "up to <N> picks at $X-Y AOV", "demandEvidence": "<summary>",
  "currentBlock": "research"
}
```

## Exit condition

Demand evidence recorded, gap confirmed, and the owner has explicitly approved hub, vertical, category, guideType, pillar and scope. Only then set `currentBlock: "research"`.

## Hard rules

- No demand evidence from the trailing two weeks → no guide.
- Do not guess hub assignment — surface ambiguity and ask.
- Do not start writing frontmatter or picks in this block.

## Handoff

"Strategy locked. Run `/content-pipeline-petpal <slug>` to advance to Research, or pause here."
