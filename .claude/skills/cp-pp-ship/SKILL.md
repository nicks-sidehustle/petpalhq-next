---
name: cp-pp-ship
description: Block 6 of the PetPalHQ content pipeline. Branch → local build + Vale → llms.txt regen → PR (Justification / BLAST RADIUS) → W4 → owner merges (merge = deploy) → IndexNow changed-set → W5b. Never vercel --prod, never Google push.
triggers:
  - "cp-pp-ship"
---

# Block 6: Ship

**Pipeline position**: 6 of 6. Law: `/Users/Nick/petpalhq-next/CLAUDE.md` §1 (ship recipe), §6 (gates), §7 (pacing).

## Precondition (hard gate)

Read `_relay-state.json`. Proceed only when `reviewVerdict === "clean"` and `reviewComplete === true`. Otherwise print "Ship blocked: review verdict is `<verdict>`, not `clean`. Run `/cp-pp-review` first." and stop.

## Owner-only controls

Merging, credentials, and any deploy beyond the merge. The session never merges, never runs `vercel --prod` or `npm run deploy`.

## Steps

### 1. Branch

```bash
cd /Users/Nick/petpalhq-next && git fetch origin && git switch -c content/<slug> origin/main
```

Use `fix/<topic>` for a repair. Never stage another lane's untracked drafts, `_relay-state.json`, or `GOAL.md`.

### 2. Local build + Vale

```bash
cd /Users/Nick/petpalhq-next && npm run build 2>&1 | tail -40
cd /Users/Nick/petpalhq-next && /opt/homebrew/bin/vale src/content/guides/<slug>.md
cd /Users/Nick/petpalhq-next && npx tsx scripts/check-content-metrics.ts --slug <slug>
```

- `npm run build` runs `validate:content` (prebuild) and the product-schema + buy-path-floor tests (postbuild). Must exit 0. Fix the guide, never the gate.
- `check-content-metrics.ts` is not part of the build. Its dissent-ratio check (cons/picks ≥ 2.5) predates the data-bounded cons law: a low ratio is reported in the PR, never fixed by padding cons.
- Vale target: 0 alerts at any level. CI under-reports (2026-09-13 flagged 1 of 4 instances of one violation) — sweep the whole class, not the flagged line.

### 3. Regenerate AI surfaces

```bash
cd /Users/Nick/petpalhq-next && npm run generate:llms-txt && npm run generate:llms-full-txt
```

Commit the regenerated `public/llms.txt` and `public/llms-full.txt` in the same PR (as #185 did).

### 4. Commit

Stage exactly the changed set:

```bash
cd /Users/Nick/petpalhq-next && git add src/content/guides/<slug>.md public/images/guides/<slug>.webp public/llms.txt public/llms-full.txt
git status --short   # confirm nothing else is staged
```

```bash
git commit -m "$(cat <<'EOF'
content(petpal): <slug> — <one-line why>

- <N> picks, $<low>-$<high> Amazon list prices (live reads <date>)
- Demand: <trailing-two-week evidence>
- Citations: <N> fetch-resolved

Co-Authored-By: <the model attribution line for this session>
EOF
)"
```

### 5. Push the branch and open the PR

```bash
cd /Users/Nick/petpalhq-next && git push -u origin content/<slug>
gh pr create --base main --title "content(petpal): <title>" --body-file <scratch>/pr-body.md
```

The PR body carries:
- `## Justification` — the demand evidence and the gap it fills.
- `## BLAST RADIUS` — counts: pages added/changed, picks/ASINs, price figures, citations, any render/buy-path code touched (a gate/render change never rides in a content PR).
- Live-read receipts (ASIN → list/current price → read date).
- Any `INSUFFICIENT DATA` outcomes.

### 6. W4 (merge gate)

The orchestrator spawns `w4-verify` against the PR — never the lane that wrote the guide, never self-approved. It re-derives every price (live read), spec, ASIN and citation from scratch. Its verdict is posted as a PR comment ending with the literal line:

```
VERDICT: MERGE | MERGE-WITH-NOTES | HOLD
```

Findings → fix → delta re-verify, max 3 rounds. After round 3, escalate to the owner with the open findings.

### 7. Owner merges (merge = deploy)

Tell the owner the PR is ready with the W4 verdict line. Respect pacing: ≤2 production merges per night; cohorts ≤25 pages. The merge to `main` deploys to Vercel production in ~60s.

### 8. IndexNow — changed set only

After the owner confirms the merge:

```bash
cd /Users/Nick/petpalhq-next && node scripts/search-index/submit-urls.cjs --slug <slug> [--slug <slug2>] --indexnow-only
```

Never the full corpus. Never `--google-only` or a run without `--indexnow-only` — sessions never push Google. The `post-deploy-index.yml` workflow is the safety net, not the load-bearing path (it reported `skipped` on 2026-09-13).

### 9. W5b

Confirm the Post-Deploy workflow's job-summary verdict line: changed-set only, Dropped 0, HTTP 200/202, sitemap/llms parity. Until that summary automation lands, run the `w5b-indexer-audit` skill within ~15 min of the merge. Probe live URLs with `curl -sL` (apex→www 307 otherwise reads as a false alarm):

```bash
curl -sL -o /dev/null -w "%{http_code} %{size_download}\n" https://petpalhq.com/guides/<slug>
curl -sL https://petpalhq.com/llms.txt | grep -c "<slug>"
curl -sL https://petpalhq.com/sitemap.xml | grep -c "<slug>"
```

### 10. Close out

- Record any lesson learned in `CLAUDE.md` in this same session.
- Delete the working state file: `rm /Users/Nick/petpalhq-next/_relay-state.json`.

## Exit condition

PR merged by the owner with a W4 `VERDICT: MERGE` (or `MERGE-WITH-NOTES`) comment, llms.txt/sitemap parity confirmed, changed-set IndexNow submitted, W5b verdict confirmed, state file deleted.

## Completion message

```
Pipeline complete for: <slug>
─────────────────────────────────────────
Guide URL:  https://petpalhq.com/guides/<slug>
Build+Vale: passed (0 alerts)
PR:         <url>   W4: <verdict line>
Merged:     <sha> (owner)
IndexNow:   <slug> — HTTP <code>
W5b:        <verdict line>
─────────────────────────────────────────
```
