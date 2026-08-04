---
name: cp-pp-review
description: Block 5 of the PetPalHQ content pipeline. Triple-lens adversarial review (spec/gate, veterinary-factual, editorial-cannibalization) + fix→independent-verify loop. Updates _relay-state.json with reviewVerdict / reviewComplete. Ship is GATED on a clean verdict.
triggers:
  - "cp-pp-review"
---

# Block 5: Review

**Pipeline position**: 5 of 6 — runs after Polish (block 4), before Ship (block 6). Ship is GATED on a clean verdict.

See also: `docs/GUIDE_CREATION_PROCESS.md` and the spec/gate companion script `scripts/validate-guide-integrity.mjs`.

## Purpose

Catch — before a guide ships — the failure modes that the mechanical gates (`check-content-metrics.ts`, `validate-content.mjs`) cannot: hallucinated product specs, rankings that contradict the guide's own stated criteria, YMYL veterinary errors, AI-slop, and cannibalization of an existing overlapping guide.

This is a **two-tier gate**:
1. **Deterministic** — the spec/gate lens runs `validate-guide-integrity.mjs` and the existing gate scripts for what code can verify.
2. **Judgment** — the veterinary-factual and editorial lenses are LLM review stages no script can do; they re-ground facts against live product data and apply editorial taste.

The block ends only when an **independent** verifier confirms the verdict is `clean`. Ship (block 6) must refuse to commit until then.

## How to run it fast

The triple-lens review + fix + independent-verify is generalized into a reusable workflow. Invoke it in one call instead of hand-authoring the review each session:

```
Workflow({ name: "petpal-content-review", args: ["<slug>", "<slug-2>", ...] })
```

- **By name**: `petpal-content-review`
- **By scriptPath**: `/Users/Nick/sites/petpalhq-next/.claude/workflows/petpal-content-review.js`
- **args**: a list of slugs to review (one or many).

The workflow runs: triple-lens review (this pipeline) → fix → independent verify → returns per-slug verdicts. Use it for batches; use the manual Steps below for a single guide or when you need to inspect the loop.

## Inputs

- `_relay-state.json` — must have `picksComplete > 0` and `polishedAt` set (Polish complete). `reviewVerdict` may be unset, `needs_fix`, or `fail` on entry.
- Guide file at `src/content/guides/<slug>.md` (picks filled with verified ASIN data, hero image generated).
- The verified product data from Polish (the `amazon-lookup.cjs` output used to fill each pick — now includes `brand` and the listing `features[]` bullets for grounding claims).

Read tolerantly: do not assume `currentBlock` is `"review"` — accept entry whenever `polishedAt` and `picksComplete` are present.

## Steps

### 1. Triple-lens adversarial review (run per guide)

Run three **distinct** lenses. Diversity beats redundancy — do not run three copies of the same check. Each lens returns a verdict and a list of issues:

```
{ severity, field, problem, fix }
```

**Severity levels:**
- `blocking` — factually wrong, schema-breaking, or policy-violating. Must be fixed before ship.
- `major` — materially degrades quality/AEO/trust. Must be fixed before ship.
- `minor` — nice-to-have; may ship without if time-constrained, but log it.

#### Lens 1 — Spec / gate (deterministic-leaning)

Run `node scripts/validate-guide-integrity.mjs --slug <slug>` first, then confirm by hand:

- FAQ uses the `**Q:?**` / `A:` format (not legacy `**How…?**`), so the FAQPage schema actually emits.
- Body between H2s is capsule + FAQ only — all editorial lives in frontmatter.
- All required frontmatter present.
- Every pick's `asin` / `price` / `imageUrl` matches the verified Polish data — no invented or duplicate ASINs within the guide.
- Declared `aliases` for a pick actually appear in its body/verdict prose (else inline affiliate auto-link never fires).
- `dissent` ≥ 2.5; top-3 `authoritySources` ≥ 2; `related` slugs are real files.

#### Lens 2 — Veterinary / factual (YMYL — the critical lens)

This is the lens that protects the guide from publishing falsehoods. Be adversarial.

**Root-cause note:** `amazon-lookup.cjs` returns `asin`, `title`, `price`, `imageUrl`, `brand`, and the listing's `features[]` bullets — but NOT full food ingredient panels, exact active-ingredient %s, or any clinical citation. The feature bullets often state actives/specs and are the FIRST place to verify a claim, but they are marketing copy and incomplete, so Draft/Polish agents WILL still hallucinate specs the bullets don't cover. **Verification precedence:** (1) check the claim against the listing `features[]` from the lookup; (2) for anything the bullets don't cover — full ingredient panels, exact %s, dosages, or any cited study — web-confirm against the product detail page, the manufacturer source (e.g. DailyMed), or the clinical source. Treat any spec as unverified until it matches one of these.

Checks:
- Verify each ingredient / active-ingredient claim against the lookup's `features[]` bullets first; for full ingredient panels, exact %s, and any cited study (not in the bullets), WebFetch the product detail page / manufacturer source (e.g. DailyMed) / clinical source. Correct or remove anything that does not match.
- Rankings must follow the guide's own stated `methodology` criteria — a pick cannot be "Best Overall" if it loses on the factors the guide says it weights.
- Active-ingredient → condition mappings are correct (e.g. the right antiparasitic for the right parasite).
- Prescription / Rx items are framed as vet-gated context, NOT as a buyable pick.
- No hands-on / testing claims anywhere ("we tested", "in our experience", etc.).

#### Lens 3 — Editorial / cannibalization

- PetPalHQ voice; no AI-slop, no templated sentence scaffolding repeated across pick bodies.
- `shortAnswer` front-loads the named pick (AEO) in the first sentence.
- Genuine differentiation from any overlapping existing guide — not a rehash. If overlap exists, add a markdown cross-link to the sibling guide rather than duplicating its angle.

### 2. Roll up the verdict

Combine the three lenses into one guide-level verdict:

- `clean` — zero unresolved `blocking` or `major` issues across all lenses.
- `needs_fix` — at least one `blocking` or `major` issue, but resolvable.
- `fail` — structurally broken or factually unsalvageable without re-doing Polish (e.g. a pick whose product does not exist, or a YMYL claim that can't be safely corrected). Escalate to owner.

### 3. Fix → independent-verify loop (authoring/review separation)

This loop enforces the CLAUDE.md rule: **never self-approve in the same active context.** Authoring and review are separate passes.

1. **FIX pass** — a fix agent resolves every `blocking` and `major` issue: re-ground facts in verified/web-confirmed data, rewrite slop, fix schema/format, dedup ASINs. Then re-run Lens 1's gate scripts.
2. **INDEPENDENT VERIFY pass** — a SEPARATE verifier (not the fix agent, not this orchestrator self-checking) confirms each issue is genuinely resolved AND that no new error was introduced.
3. Loop steps 1–2 until the verifier returns `clean`.

Do not mark `reviewComplete: true` on the strength of the fix agent's own say-so — only on the independent verifier's confirmation.

### 4. Update _relay-state.json

On a `clean` verdict:

```json
{
  "reviewVerdict": "clean",
  "reviewComplete": true,
  "reviewedAt": "<iso-timestamp>",
  "currentBlock": "ship"
}
```

On `needs_fix` (loop not yet converged) or `fail`:

```json
{
  "reviewVerdict": "needs_fix",
  "reviewComplete": false,
  "currentBlock": "review"
}
```

Write `currentBlock: "ship"` only on `clean`, regardless of what Polish set it to.

## Exit condition

An independent verifier has confirmed the guide verdict is `clean` (no unresolved `blocking` or `major` issues across all three lenses), `reviewComplete: true` and `currentBlock: "ship"` are written to `_relay-state.json`.

## Hard rules

- **SHIP GATE**: cp-pp-ship MUST NOT commit or push until `reviewVerdict === "clean"` and `reviewComplete === true`. A `needs_fix` or `fail` verdict blocks Ship — including in auto/cron mode.
- **Never self-approve in one context.** The fix pass and the verify pass are separate agents/passes (CLAUDE.md authoring/review separation).
- **Re-ground every factual claim.** Check the lookup's `features[]` bullets first; `amazon-lookup.cjs` does not return full ingredient panels or clinical citations — web-confirm those. Assume every spec is unverified until matched to a listing bullet or an authoritative source.
- A `fail` verdict escalates to the owner; do not attempt to ship around it.
- Do not edit the live gate scripts (`check-content-metrics.ts`, `validate-content.mjs`) to make a guide pass — fix the guide.

## Handoff

Tell the owner:
> "Review complete for `<slug>` — verdict: **clean**. <N> issues found and resolved across spec / veterinary-factual / editorial lenses, independently verified. Ship gate is open. Run `/content-pipeline-petpal <slug>` to advance to Ship."

If the verdict is not clean:
> "Review for `<slug>` returned **<needs_fix|fail>**. Unresolved blocking/major issues: <list>. Ship is gated. <Re-running fix→verify loop | Escalating to owner>."
