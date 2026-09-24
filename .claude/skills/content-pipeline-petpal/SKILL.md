---
name: content-pipeline-petpal
description: 6-block pipeline for new petpalhq buying guides (Strategy → Research → Skeleton → Polish → Review → Ship), ending in a PR, W4, owner merge (= deploy) and W5b. Run as /content-pipeline-petpal <slug>. Resumes from last completed block via _relay-state.json.
triggers:
  - "content pipeline petpal"
  - "new guide pipeline"
  - "start guide pipeline"
  - "run pipeline"
---

# PetPalHQ Content Pipeline

Orchestrates new buying-guide creation through 6 sequential blocks. Each block has a clear input, a clear exit condition, and an owner approval gate before advancing.

**Law:** `/Users/Nick/petpalhq-next/CLAUDE.md` governs every block. Where this skill and CLAUDE.md disagree, CLAUDE.md wins.

## Usage

```
/content-pipeline-petpal <slug>
```

## What this skill does

1. Checks for `_relay-state.json` in the repo root (`/Users/Nick/petpalhq-next/_relay-state.json`).
   - If found: reads `currentBlock` and resumes from there. Prints the current state summary.
   - If not found: creates a new state file with `{ slug, currentBlock: "strategy", startedAt: <iso> }`.
   - `_relay-state.json` is a working file — never commit it.
2. Routes to the sub-skill for the current block.
3. After each block exits: updates `currentBlock`, prints a summary, and pauses for the owner to confirm before advancing.

## Dispatch

| currentBlock | Sub-skill |
|---|---|
| `strategy` | `/cp-pp-strategy` |
| `research` | `/cp-pp-research` |
| `skeleton` | `/cp-pp-skeleton` |
| `polish` | `/cp-pp-polish` |
| `review` | `/cp-pp-review` |
| `ship` | `/cp-pp-ship` |

## Block sequence

```
strategy → research → skeleton → polish → review → ship (PR → W4 → owner merge = deploy → llms/sitemap parity → W5b)
```

- **Review** (block 5) is the in-lane triple-lens review + fix→verify loop. It is not the merge gate.
- **W4** (`w4-verify`, orchestrator-spawned, never self-approved) is the merge gate for any guide PR. Max 3 fix→re-verify rounds, then escalate to the owner.
- **Owner merges.** Merge to `main` is the production deploy. No `vercel --prod`.
- **W5b** after the merge: confirm the Post-Deploy workflow's job-summary verdict line (changed-set only, Dropped 0, HTTP 200/202, sitemap/llms parity); the `W5b verdict` step is live (#186); a FAIL is a warning annotation; run `w5b-indexer-audit` when the line is missing or FAIL.

The pipeline does NOT auto-advance — it pauses and asks: "Block complete. Advance to <next-block>? (yes / pause)"

## State file schema

```json
{
  "slug": "best-dog-gps-trackers-smart-collars-2026",
  "currentBlock": "strategy",
  "startedAt": "2026-09-24T10:00:00Z",

  // Strategy:
  "hub": "...", "vertical": "...", "category": "...", "guideType": "spoke",
  "pillar": "...", "scope": "up to 7 picks at $150-300 AOV", "demandEvidence": "...",

  // Research:
  "expertSources": [], "citations": [], "expectedBrands": [],

  // Skeleton:
  "skeletonComplete": false, "fileSize": 0,

  // Polish:
  "picksComplete": 0, "polishedAt": null, "liveReads": [],

  // Review:
  "reviewVerdict": null,  // "clean" | "needs_fix" | "fail"
  "reviewedAt": null,

  // Ship:
  "prUrl": null, "w4Verdict": null, "mergedSha": null, "w5bVerdict": null
}
```

## Abort / restart

- Pause: just stop. State is preserved.
- Restart: delete `_relay-state.json` and re-run.
- Jump: edit `currentBlock` manually.

## Hard rules (all blocks — see CLAUDE.md for dates and sources)

1. Never run `vercel --prod` or `npm run deploy`. The owner's merge is the deploy.
2. Writers never originate facts; quotes are copy-paste only; `INSUFFICIENT DATA` is a successful outcome.
3. No invented ASINs. Every price figure is confirmed by a live Amazon page read; API output is a hint.
4. Cons, picks, sources: data-bounded — never padded to hit a count.
5. ≥2 citations per guide, each fetch-resolved at write time.
6. Amazon-only retail links (`/go/<ASIN>`); no maker/brand-sourced price figures; no availability language.
7. Capsule paragraphs and FAQ answers stay link-free. Body markdown outside the capsule + FAQ does not render — editorial lives in frontmatter.
8. IndexNow changed-set only; Google is never pushed by a session.
