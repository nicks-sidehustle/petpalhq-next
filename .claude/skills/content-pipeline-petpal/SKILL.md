---
name: content-pipeline-petpal
description: 6-block pipeline for new petpalhq buying guides (Strategy → Research → Skeleton → Polish → Review → Ship). Run as /content-pipeline-petpal <slug>. Resumes from last completed block via _relay-state.json.
triggers:
  - "content pipeline petpal"
  - "new guide pipeline"
  - "start guide pipeline"
  - "run pipeline"
---

# PetPalHQ Content Pipeline

Orchestrates new buying-guide creation through 6 sequential blocks. Each block has a clear input, a clear exit condition, and an owner approval gate before advancing.

See also: `docs/GUIDE_CREATION_PROCESS.md` — the human-readable spec this skill orchestrates.

## Usage

```
/content-pipeline-petpal <slug>
```

Examples:
```
/content-pipeline-petpal best-dog-gps-trackers-smart-collars-2026
/content-pipeline-petpal best-pvc-reptile-enclosures-bioactive-2026
```

## What this skill does

1. Checks for `_relay-state.json` in the repo root (`/Users/mm2/sites/petpalhq-next/`).
   - If found: reads `currentBlock` and resumes from there. Prints the current state summary.
   - If not found: creates a new state file with `{ slug, currentBlock: "strategy", startedAt: <iso> }`.
2. Routes to the sub-skill for the current block.
3. After each block exits: updates `currentBlock` in state, prints a summary, and pauses for owner to confirm before advancing.

## Dispatch instructions

Read `_relay-state.json` if it exists at `/Users/mm2/sites/petpalhq-next/_relay-state.json`.

If resuming, announce: "Resuming pipeline for `<slug>` at block: `<currentBlock>`" and show the state fields that are already populated.

Then invoke the sub-skill for the current block:

| currentBlock | Sub-skill to invoke |
|---|---|
| `strategy` | `/cp-pp-strategy` |
| `research` | `/cp-pp-research` |
| `skeleton` | `/cp-pp-skeleton` |
| `polish` | `/cp-pp-polish` |
| `review` | `/cp-pp-review` |
| `ship` | `/cp-pp-ship` |

## Block sequence

```
strategy → research → skeleton → polish → review → ship
```

Review (block 5) is an adversarial triple-lens review + fix→verify gate: Ship is GATED on a clean review verdict (no unresolved blocking/major issues).

Each block exits by updating `_relay-state.json` with its outputs and setting `currentBlock` to the next block. The pipeline does NOT auto-advance — it pauses and asks: "Block complete. Advance to <next-block>? (yes / pause)"

## State file schema

`/Users/mm2/sites/petpalhq-next/_relay-state.json`:

```json
{
  "slug": "best-dog-gps-trackers-smart-collars-2026",
  "currentBlock": "strategy",
  "startedAt": "2026-05-09T10:00:00Z",

  // Populated by Strategy:
  "hub": "pet-home-systems-cleanup-travel",
  "vertical": "Cats & Dogs",
  "category": "Smart Tech",
  "guideType": "spoke",
  "pillar": "summer-2026",
  "scope": "7 picks at $150-300 AOV",

  // Populated by Research:
  "expertSources": [],
  "communityForums": [],
  "expectedBrands": [],

  // Populated by Skeleton:
  "skeletonComplete": false,
  "fileSize": 0,

  // Populated by Polish:
  "picksComplete": 0,
  "polishedAt": null,

  // Populated by Review:
  "reviewVerdict": null,  // "clean" | "needs_fix" | "fail"
  "reviewedAt": null,

  // Populated by Ship:
  "deployedAt": null,
  "deploymentId": null
}
```

## Abort / restart

- To pause: just stop. State is preserved in `_relay-state.json`.
- To restart from scratch: delete `_relay-state.json` and re-run the command.
- To jump to a specific block: edit `currentBlock` in `_relay-state.json` manually.

## Hard rules (enforced across all blocks)

1. Never auto-run `vercel --prod` — owner must type it explicitly.
2. Never fabricate ownerVoice quotes — verbatim Reddit only via `fetch-reddit-quotes.ts`.
3. Never use placeholder ASINs in a pick — amazon-lookup.cjs must return real data.
4. Every pick must have ≥ 3 cons.
5. Capsule paragraphs and FAQ sections stay link-free.
6. Guide body markdown between H2s does not render — all editorial lives in frontmatter.
