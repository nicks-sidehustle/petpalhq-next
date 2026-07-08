---
name: cp-pp-ship
description: Block 6 of the PetPalHQ content pipeline. npm run build → git commit → git push → owner-typed vercel --prod → IndexNow + GIA submit → memory update → cleanup.
triggers:
  - "cp-pp-ship"
---

# Block 6: Ship

**Pipeline position**: 6 of 6 — final block. Runs after Review.

See also: `docs/GUIDE_CREATION_PROCESS.md` §"High-level flow" steps 9-12.

## Precondition (HARD GATE — review verdict must be clean)

Ship is GATED on the Review block (`/cp-pp-review`, block 5). Before doing anything else, read `_relay-state.json` and confirm `reviewVerdict === "clean"`.

- If `reviewVerdict` is `"needs_fix"`, `"fail"`, missing, or null: **refuse to commit or push.** Print: "Ship blocked: review verdict is `<verdict>`, not `clean`. Run `/cp-pp-review` and resolve all blocking/major issues (fix→verify loop) before shipping." Then stop.
- Only proceed to the steps below when the review verdict is `clean` (no unresolved blocking/major issues).

## Purpose

Get the guide live, indexed, and documented. Every step has a hard gate — do not skip any gate, even in auto mode.

## Inputs

- `_relay-state.json` — must have `picksComplete > 0`, `polishedAt` set, and `reviewVerdict: "clean"` (see Precondition above)
- Guide file at `src/content/guides/<slug>.md` (complete with verified picks)

## Steps

### 1. Build

```bash
cd /Users/mm2/sites/petpalhq-next && npm run build 2>&1 | tail -30
```

Must exit 0. If build fails:
- Read the error output
- Fix the root cause in the guide file (YAML syntax, missing required field, etc.)
- Re-run build
- Do not proceed until build exits 0

### 2. Spot-check rendered HTML

After a successful build, grep the output for key invariants:

```bash
# Check the guide exists in the sitemap
grep "<slug>" .next/server/app/sitemap.xml 2>/dev/null || grep "<slug>" public/sitemap.xml 2>/dev/null || echo "sitemap check: run after deploy"

# Check capsule discipline — no links in the intro paragraph
# (manual: open .next/server/app/guides/<slug>/page.html and search for <a href in the first 500 chars after the H2)
```

Report what you find. If a link is found inside a capsule paragraph, fix the guide and rebuild.

### 3. Git commit

```bash
cd /Users/mm2/sites/petpalhq-next && git add src/content/guides/<slug>.md
```

Then commit with a descriptive HEREDOC message:

```bash
git commit -m "$(cat <<'EOF'
feat(guides): add <slug>

- <N> picks at <AOV range> (<vertical> vertical)
- Hub: <hub-slug>
- Sources: <expertSourceCount> authority sources cited
- ownerVoice quotes integrated
- ASIN-verified via amazon-lookup.cjs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 4. Push to v2-preview

```bash
cd /Users/mm2/sites/petpalhq-next && git push origin v2-preview
```

### 5. Owner deploy gate (HARD RULE — do not bypass)

Print exactly this to the owner:

> **Deploy gate**: Production deploy requires you to type this command in your terminal:
> ```
> vercel --prod
> ```
> Type it and paste the deployment URL here when it completes.

Wait for the owner to provide the deployment URL. Do NOT run `vercel --prod` yourself under any circumstances — this applies even in auto mode.

### 6. IndexNow submission

After the owner provides the deployment URL, submit the new guide URL to IndexNow:

```bash
node ~/.claude/skills/search-index-submit/scripts/submit-urls.cjs submit \
  --site petpalhq \
  --urls "https://petpalhq.com/guides/<slug>"
```

The IndexNow key for petpalhq lives at `~/.claude/skills/search-index-submit/keys/petpalhq.txt`.

Report: HTTP status code from the IndexNow API. 200 = accepted.

### 7. Google Indexing API submission

```bash
cd /Users/mm2/sites/petpalhq-next && npx tsx scripts/google-index-submit.ts https://petpalhq.com/guides/<slug>
```

Report: whether the submission succeeded. If it fails with an auth error, the service account key in `.env.local` may need refreshing (see `reference_petpal_indexing_pipeline.md` in memory).

### 8. Update memory

Update `~/.claude/projects/-Users-Nick-petpalhq-next/memory/project_petpal_v2.md`:

Append the new guide to the guide count and list. Increment the "guides live" count. Add a line for the new guide with: slug, hub, vertical, pick count, AOV range, publish date.

Example append:
```
- best-dog-gps-trackers-smart-collars-2026 | pet-home-systems-cleanup-travel | Cats & Dogs | 7 picks | $150-300 AOV | 2026-05-09
```

Also update the "guides live" total at the top of the file.

### 9. Cleanup

Delete `_relay-state.json`:

```bash
rm /Users/mm2/sites/petpalhq-next/_relay-state.json
```

Confirm: "Pipeline complete. `_relay-state.json` deleted."

## Exit condition

Build passed, guide is committed and pushed, owner has deployed to prod, IndexNow + GIA submissions completed, memory updated, state file deleted.

## Hard rules

- Review verdict MUST be `clean` in `_relay-state.json` before any commit or push. Do not ship a guide that failed or skipped Review.
- `vercel --prod` MUST be owner-typed. Never auto-run it. Never suggest "I'll run it for you."
- Build must exit 0 before commit.
- Do not skip IndexNow or GIA submission — these are the indexing moat.
- Memory file must be updated in the same session before closing.

## Completion message

After all steps are done, print:

```
Pipeline complete for: <slug>
─────────────────────────────────────────
Guide URL:    https://petpalhq.com/guides/<slug>
Build:        ✓ passed
Commit:       ✓ pushed to v2-preview
Deploy:       ✓ <deployment-url>
IndexNow:     ✓ submitted
Google IAPI:  ✓ submitted
Memory:       ✓ updated (guides live: <N>)
State file:   ✓ deleted
─────────────────────────────────────────
Hero image reminder: Request ChatGPT image-gen for the hero if not already done.
Cross-link reminder: Run /cross-link to add internal links from related guides.
```
