---
name: cp-pp-research
description: Block 2 of the PetPalHQ content pipeline. Fetch-resolved authority citations, candidate brands, optional owner-pasted community quotes. Updates _relay-state.json with expertSources, citations, expectedBrands.
triggers:
  - "cp-pp-research"
---

# Block 2: Research

**Pipeline position**: 2 of 6 — runs after Strategy, before Skeleton. Law: `/Users/Nick/petpalhq-next/CLAUDE.md`.

## Purpose

Build the verified fact layer before any prose is written. Every claim in the final guide must trace to a fetched source. Writers downstream may only reference what this block hands them — they never originate facts.

## Inputs

- `_relay-state.json` — `hub`, `vertical`, `category`, `scope` from Strategy
- Authority source list: `/Users/Nick/petpalhq-next/src/lib/authority-links.ts`

## Steps

### 1. Select and fetch-resolve authority sources

Read `src/lib/authority-links.ts`. Pick the sources relevant to the species and product category (e.g. AAHA, AVMA, AAFP, Merck Veterinary Manual, Cornell Feline Health Center, ASPCA, LafeberVet, AAFCO, FDA CVM, Tufts Petfoodology).

For every source you intend to cite:
- **Fetch the exact URL now** (WebFetch). It must resolve (HTTP 200 after redirects) and actually state the fact you will attribute to it.
- Record a fact row: `{ outlet, url, verbatimSentence, claim, accessed: <YYYY-MM-DD> }`. `verbatimSentence` is copy-pasted from the fetched page — never retyped or tidied.
- A source that will not fetch, or does not say the thing, is **UNVERIFIED** — record it as such. That is a valuable, expected answer; it is cited nowhere.

The guide needs **≥2 fetch-resolved citations**. If fewer than 2 resolve, return `INSUFFICIENT DATA: citations — <what is missing> — <what would close it>`.

Manufacturer spec pages and manuals are allowed as citations for specs. They are never a source for a price figure.

### 2. Community quotes (optional, owner-pasted only)

Reddit is not fetchable from this environment. `ownerVoice` quotes are optional and come only from text the owner copy-pastes into the session, with the thread URL. Store them byte-for-byte. Never generate, paraphrase, or "clean up" a quote. If none are supplied, `ownerVoice: []` ships.

### 3. Identify candidate brands

List brands/models likely to be picks for the scope. For each: name, why likely, and whether a manufacturer spec page exists (fetch it if you will cite it). Over-provide (6–9 candidates) — live verification in Polish will drop some. Do not look up prices here.

### 4. Update _relay-state.json

```json
{
  "expertSources": ["Cornell Feline Health Center", "Merck Veterinary Manual"],
  "citations": [{ "outlet": "...", "url": "...", "verbatimSentence": "...", "claim": "...", "accessed": "YYYY-MM-DD" }],
  "unverified": [{ "outlet": "...", "url": "...", "reason": "404 / does not state X" }],
  "expectedBrands": ["..."],
  "currentBlock": "skeleton"
}
```

## Exit condition

≥2 fetch-resolved citations recorded with verbatim sentences (or an explicit `INSUFFICIENT DATA` returned to the owner), candidate brands listed, owner has reviewed the source set.

## Hard rules

- Never generate or paraphrase a quote. Quotes are copy-paste only.
- Never cite a URL you did not fetch in this block.
- Never attribute a fact to an outlet whose page does not state it.
- No price lookups here — Polish owns prices (live read).

## Handoff

"Research complete: <N> citations fetch-resolved, <M> unverified. Run `/content-pipeline-petpal <slug>` to advance to Skeleton."
