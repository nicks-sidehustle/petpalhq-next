# PetPalHQ Autonomous Content Cron — Runner Recipe

**This file is the source of truth for what the scheduled agent does on each cron tick. Read it in full at the start of every run. Do not invent steps not listed here.**

You have explicit owner pre-authorization (granted 2026-05-12) for the actions below:
- Reading + writing `.claude/content-queue.json` (queue state)
- Running the cp-pp content pipeline (Strategy → Research → Skeleton → Polish → Review)
- Calling `amazon-lookup.cjs` in the sister gardengearhq repo for ASIN verification
- Generating hero images via `scripts/image-gen/gen-hero.mjs` (~$0.063/image)
- Committing to `main` and pushing to `origin/main` (triggers prod deploy via Vercel)
- Submitting URLs to IndexNow (4 engines) and Google Indexing API
- Reading 1Password credentials at `op://API Keys/Resend/credential` and `op://API Keys/Google Search Console SA/credential`
- Sending a result email via Resend to `nicks.sidehustle.2024@gmail.com`

You do NOT have authorization for:
- Modifying files outside `src/content/guides/`, `public/images/guides/`, `.claude/content-queue.json`, `.claude/content-cron-log.md`
- Pushing destructive git operations (force push, reset, rebase)
- Deploying anything other than what this recipe specifies
- Spending more than ~$0.20 on image generation per run

---

## Run procedure

### Step 1: Claim a topic from the queue

```bash
cat /Users/mm2/sites/petpalhq-next/.claude/content-queue.json
```

Find the first entry in `queue[]` with `status: "pending"`. Set its `status` to `"in_progress"` and write the file back. Add `claimedAt: <ISO-timestamp>`.

If no pending entries exist:
- Append a "queue empty" log line to `.claude/content-cron-log.md`
- Send the email-empty notification (Step 7 with `outcome: "queue_empty"`)
- Exit cleanly

### Step 2: Run the Polish-equivalent block — ASIN verification

For each expected brand in the claimed entry's `expectedBrands` array (and any natural variants you discover during the run), run:

```bash
cd /Users/mm2/sites/gardengearhq-next && node scripts/automation/amazon-lookup.cjs --product="<brand> <category-keyword>"
```

Collect successful lookups. Target: enough viable picks to match the `scopeHint` (typically 4-5 picks).

**Abort rule A — pick count floor:**
If after exhausting `expectedBrands` and 2-3 generic search variants you have fewer than 3 picks above $50, abort the run:
1. Flip the queue entry status back to `"pending"` (do not block the slug forever — owner can curate or remove)
2. Append a log line with `outcome: "abort_insufficient_picks", picksFound: <N>`
3. Send abort email
4. Exit cleanly

### Step 3: Write the guide file

Model after `src/content/guides/best-cat-exercise-wheels-2026.md` (or any of the 3 guides shipped 2026-05-11 — same shape). Required fields:
- All standard frontmatter: title, description, excerpt, category, species (if applicable), guideType, publishDate, updatedDate, readTime, featured: false, heroImage, products: [], reviewMethod, lastProductCheck, expertSourceCount
- `shortAnswer` — AEO-optimized 4-8 sentence answer to the primary question
- `topPicks` — top 3 picks in the array-of-objects format
- `picks` — full pick objects with verified ASINs, real prices, real image URLs, 5 keyFeatures, 200-300 word body, 5 pros, 4+ cons, 1-sentence verdict
- **CRITICAL: each pick must include `aliases:` array** with short-name variants used in body prose so inline affiliate auto-linking fires. See `feedback_outbound_link_policy.md`.
- `comparison.rows` filled
- `methodology` with the factors from the queue entry's `factors[]` (already specced)
- `bottomLine` — 4 array entries
- `whenNotToBuy` — multi-paragraph string with 5-6 skip scenarios
- `sources.expert` / `sources.community` / `verifiedDate` / `authorBio`
- `ownerVoice: []` (ship empty per quote-sourcing-blocker precedent)
- `related: []` (4-5 entries — adjacent spokes in the same hub or category)

Hard rules:
- NEVER claim hands-on testing ("we tested", "in our experience", "after using" — banned). See `feedback_no_hands_on_testing_claims.md`.
- Authority NAMES (AVMA, AAHA, AVSAB, Merck Veterinary Manual, etc.) may appear as plain text. NO outbound links to them. See `feedback_outbound_link_policy.md`.
- Body markdown between H2s does NOT render — keep editorial in frontmatter. Body should contain only the intro capsule + FAQ section.
- Capsule (first body paragraph) must be link-free.

### Step 4: Metrics gate

```bash
cd /Users/mm2/sites/petpalhq-next && npx tsx scripts/check-content-metrics.ts
```

**Abort rule B — FK rewrites:**
If FK > 13.0 on this guide, edit the visible prose (shortAnswer, reviewMethod, picks[].body, picks[].verdict, bottomLine, whenNotToBuy, methodology.factors[].definition, FAQ section) to split long sentences. Re-run metrics. Allow up to 3 rewrite passes. If FK is still > 13.5 after 3 passes, abort:
1. Flip queue entry to `"failed_quality"` (do not retry without owner intervention)
2. Log + email abort
3. Exit

### Step 5: Hero image

```bash
cd /Users/mm2/sites/petpalhq-next && node scripts/image-gen/gen-hero.mjs --slug <slug>
```

**Abort rule C — hero generation:**
If `gen-hero.mjs` exits non-zero, retry once. If second attempt fails, abort:
1. Flip queue entry to `"failed_image_gen"`
2. Log + email abort
3. Exit

After success, re-run `check-content-metrics.ts` to confirm the hero hard gate passes.

### Step 5.5: Adversarial review + fix→verify

Before building or committing, the guide MUST pass an adversarial review with a clean verdict. Invoke the `cp-pp-review` skill (pipeline Block 4.5 — sits between Polish and Ship) on the claimed slug. It runs:

1. **Triple-lens review** (distinct lenses — diversity beats redundancy):
   - **Spec/gate lens** — FAQ `**Q:?**/A:` format, body = capsule + FAQ only, all required frontmatter present, every pick's asin/price/image matches verified `amazon-lookup.cjs` data (no invented or duplicate ASINs), declared `aliases:` appear in prose, dissent ≥ 2.5, top-3 authoritySources ≥ 2, `related` slugs real.
   - **Veterinary/factual lens (YMYL — the critical one)** — re-ground ingredient/active-ingredient panels against live product data (`amazon-lookup.cjs` returns only asin/title/price/image, so specs are otherwise hallucinated); rankings must follow the guide's own stated criteria; correct active-ingredient→condition mappings; prescription items framed as vet-gated context, not picks; no hands-on claims.
   - **Editorial/cannibalization lens** — PetPalHQ voice, no AI-slop, `shortAnswer` front-loads the named pick (AEO), genuine differentiation from any overlapping existing guide (with a markdown cross-link, not a rehash), no templated sentence scaffolding repeated across picks.

   Each lens returns a verdict (`clean` / `needs_fix` / `fail`) plus issues `{severity, field, problem, fix}`.

2. **Fix→verify loop (authoring/review separation — never self-approve in one context):** a FIX pass resolves every blocking + major issue (re-grounding facts in verified data, web-verifying when uncertain) and re-runs the gates; then a SEPARATE verify pass confirms each issue is genuinely resolved and no new error was introduced. Repeat until the verdict is `clean`. Cap at **3 fix→verify cycles** (consistent with the FK 3-pass / hero 1-retry budgets).

Proceed to Step 6 ONLY on a clean verdict (no unresolved blocking/major issues).

**Abort rule E — unresolved_review:**
If the verdict is still not clean after 3 fix→verify cycles, abort the run — do NOT build or commit:
1. Flip queue entry to `"failed_review"` (terminal — do not retry without owner intervention)
2. Log + email abort with the unresolved issues summary
3. Exit

### Step 6: Build, commit, push

```bash
cd /Users/mm2/sites/petpalhq-next && npm run build 2>&1 | tail -8
```

**Abort rule D — build failure:**
If `npm run build` exits non-zero, abort:
1. Flip queue entry back to `"pending"` (likely a transient issue)
2. Log the error tail + email abort with build error message
3. Exit

On success, commit + push:

```bash
git add src/content/guides/<slug>.md public/images/guides/<slug>.png
git commit -m "feat(content): auto-ship <slug> via cron pipeline

- <N> picks at <AOV-range> AOV
- <ScoreName> methodology
- ASIN-verified via amazon-lookup.cjs
- Hero generated via gen-hero.mjs

Auto-shipped by content cron (recipe at .claude/cron-content-runner.md).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

### Step 7: Wait for deploy + submit to IndexNow + GIA

Poll until the new URL returns 200:

```bash
until curl -sI -o /dev/null -w "%{http_code}" https://petpalhq.com/guides/<slug> | grep -q "200"; do sleep 15; done
```

Cap the poll at 10 minutes — if not live, log a partial-success (deploy may still complete but indexing will not happen this run) and skip to email.

IndexNow (inline form — see `reference_petpal_indexing_pipeline.md` for canonical pattern):

```bash
node -e "
const KEY = '97b4501830e1517ea48c01d86ff03a81';
const urls = ['https://petpalhq.com/guides/<slug>'];
const payload = JSON.stringify({ host: 'petpalhq.com', key: KEY, keyLocation: 'https://petpalhq.com/' + KEY + '.txt', urlList: urls });
(async () => {
  for (const ep of ['https://api.indexnow.org/IndexNow', 'https://www.bing.com/IndexNow', 'https://yandex.com/indexnow', 'https://searchadvisor.naver.com/indexnow']) {
    const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: payload });
    console.log(r.status, r.statusText, '|', ep);
  }
})();
"
```

GIA:

```bash
op read "op://API Keys/Google Search Console SA/credential" > /tmp/petpal-sa.json
GOOGLE_APPLICATION_CREDENTIALS=/tmp/petpal-sa.json npx tsx scripts/google-index-submit.ts --url https://petpalhq.com/guides/<slug>
rm -f /tmp/petpal-sa.json
```

### Step 8: Finalize queue + log + email

Update `.claude/content-queue.json`:
- Move the claimed entry from `queue[]` to `shipped[]`
- Add `shippedAt: <ISO>`, `commit: <short-sha>`, `picksCount`, `aov`
- Update `lastUpdated`

Append a line to `.claude/content-cron-log.md`:

```markdown
- 2026-05-12T14:30:00Z | <slug> | shipped | commit:<sha> | picks:<N> | aov:$<X-Y> | indexnow:ok | gia:ok
```

Send the result email via Resend:

```bash
RESEND_KEY=$(op read "op://API Keys/Resend/credential" --reveal)
curl -sS -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "PetPalHQ Cron <onboarding@resend.dev>",
    "to": ["nicks.sidehustle.2024@gmail.com"],
    "subject": "[PetPalHQ cron] <outcome> — <slug>",
    "text": "<status summary, log line, URL, picks, link to commit>"
  }'
unset RESEND_KEY
```

Use `onboarding@resend.dev` as the From address until petpalhq.com sender domain is verified in Resend — that's a non-blocking owner action.

---

## Outcome categories (for email subject + log)

- `shipped` — guide live, indexed, queue advanced
- `abort_insufficient_picks` — Step 2 abort A
- `abort_fk_unfixable` — Step 4 abort B
- `abort_image_gen` — Step 5 abort C
- `failed_review` — Step 5.5 abort E (adversarial review not clean after fix→verify loop; see the cp-pp-review skill)
- `abort_build_failure` — Step 6 abort D
- `partial_deploy_timeout` — Step 7 deploy poll timed out (>10 min)
- `queue_empty` — Step 1 found no pending entries

Every outcome (success or abort) MUST send an email and update the log. No silent failures.

---

## Memory awareness

Before writing the guide, read the following memory files for active rules and constraints (especially feedback files — those carry hard rules from prior corrections):

- `/Users/mm2/.claude/projects/-Users-mm2-sites-petpalhq-next/memory/MEMORY.md` (index)
- `feedback_outbound_link_policy.md` — outbound link rule (affiliate or internal only)
- `feedback_no_hands_on_testing_claims.md` — banned phrases
- `feedback_petpal_guide_body_invisible.md` — body markdown rendering quirk
- `feedback_metrics_gate_visible_prose.md` — what FK gate measures
- `project_quote_sourcing_blocker.md` — why ownerVoice ships empty
- `reference_petpal_indexing_pipeline.md` — indexing infra reference
- `reference_amazon_lookup.md` — ASIN lookup invocation
- `reference_image_gen_pipeline.md` — hero gen invocation

---

## Notes for future-maintainer-Claude

- The queue file is the strategy layer. Edits to topics, factors, scope hints — do them in `content-queue.json`, not in this runner.
- If the cron starts producing low-quality output, the failure mode is most likely the runner recipe being too loose or memory rules drifting. Audit both, don't blame the schedule.
- Queue refill is currently a manual owner task. If owner wants auto-refill, the next iteration could pull from Playground seasonal roadmap or a gap-analysis agent.
- The Resend From address should move to `cron@petpalhq.com` (or similar) once the sender domain is verified — currently using the Resend onboarding sandbox.
