# PetPalHQ — repo law

## 0. Authority
- **This file + `.claude/` are the law for this repo.** Portfolio `LAW.md`, `RUNBOOK.md` §8, PLAYBOOK and briefs under `~/affiliate-site-template/programs/` are reference only (owner ruling 2026-09-16, `programs/2026-09-governance-100x/RULING-SITE-LOCAL-GOVERNANCE-2026-09-16.md`).
- Where a skill, doc or script comment contradicts this file, this file wins. Longer procedure lives in the skills (`content-pipeline-petpal`, `cp-pp-*`, `w4-verify`, `w5b-indexer-audit`).
- Owner-only controls: merging, credentials, deploys beyond the merge. A session proposes; it never self-amends this file's rulings.
- Two floors nothing overrides: **no fabricated citations/attributions**, **no invented ASINs**.

## 1. Ship recipe (owner 2026-09-24 · PR #183 `c690c40`, PR #185 `3f21c2a`)
1. Branch `content/<slug>` or `fix/<topic>` off `origin/main`. Never stage another lane's untracked drafts.
2. Local build + Vale: `npm run build` (prebuild = `validate:content`; postbuild = schema + buy-path-floor tests) and `npm run lint:vale` → 0 alerts on the changed guides. CI under-reports; sweep the whole class, not the flagged line.
3. llms.txt parity before the PR opens: `npm run generate:llms-txt` + `npm run generate:llms-full-txt`, committed in the same PR.
4. Open a PR whose body has `## Justification` and `## BLAST RADIUS` (counts of pages/cards/ASINs touched).
5. W4 if in scope (§6). Its verdict lands as a durable PR comment ending `VERDICT: MERGE | MERGE-WITH-NOTES | HOLD`.
6. **Owner merges. Merge = deploy** (push to `main` → Vercel production). Never `vercel --prod`, never `npm run deploy`.
7. IndexNow is submitted by the Post-Deploy workflow. After the merge, read its receipt; run `node scripts/search-index/submit-urls.cjs --slug <slug> [--slug …] --indexnow-only` only for changed URLs the receipt shows missing or skipped. Never double-submit. Google is never pushed by a session.
8. W5b after the merge (§6). Probe live URLs with `curl -sL` (without `-L` the apex→www 307 reads as a false alarm).

## 2. AI-grounding protection (LOCKED 2026-07-16 — Bing grounding-cut post-mortem; reaffirmed 2026-09-24)
Four portfolio sites lost all Copilot/AI citations in May–Jul 2026: a churn trigger × a trust-debt disqualifier.
- **IndexNow: changed URLs only** — never the full sitemap, never per-redeploy, per-site key only. A full-corpus submit is a manual owner baseline action, never automated.
- **No replacement churn while cited** — no corpus teardowns, mass deletions, schema swaps, or author-identity rewrites; stage rebuilds additively. Additive content waves are proven safe.
- **AI-surface parity** — llms.txt + sitemap.xml track the live corpus: right site, no dead/redirect URLs, no missing live pages, moving freshness stamp.
- **No fabricated citations/attributions, ever** (Bing scores source-attribution integrity; dormgear was cut over this class).
- **Citation metric of record = Bing Webmaster Tools AI Performance** (GA4 AI referrals are only the click floor). Two consecutive zero-citation days vs a nonzero baseline = investigate immediately.

## 3. Retail, links and compliance
- **Amazon-only retail links via `/go/<ASIN>`** on every surface; no other retailer purchase link anywhere (owner 2026-09-16, confirmed 2026-09-24). Allowed non-shopping citations: manufacturer spec pages, manuals, vet/research, retailer editorial/education pages. Non-retail services (e.g. pet-insurance carriers) are exempt. Verify on the served destination, not the source string.
- **Buy-path floor** — every card in every state carries a `/go/` or Amazon search link (§8uu · `scripts/test/buy-path-floor.test.ts` in postbuild).
- **No availability language** — no "in stock", "unavailable", "low stock", "out of stock" on any card or surface (§8qq.2 · #180).
- **Amazon Associates** — figures come from a live Amazon page read (owner ruling 2026-09-24); every displayed price carries a dated "checked <date>" notation; "As an Amazon Associate we earn from qualifying purchases" (site footer + `/affiliate-disclosure` exist).
- Note: Associates Program Policies (Participation Requirements §2(b)) (API/Amazon-served sources), IP License §2(h) (24h cache) and the data-mining/robots clause were reviewed 2026-09-24; owner ruled live-read-primary with dated check notation.
- **FTC** — clear disclosure near affiliate links; no misrepresentation of testing, pricing or relationships (owner 2026-09-24, adapted).

## 4. Pricing and product state (owner 2026-09-24 — settles §8vv vs D28)
- **The live Amazon page read is the primary source of every figure.** The Creators/PA API (`amazon-lookup.cjs`, `sync-amazon-prices.ts`) is a hint only. No refresh/cache triggers: no crons, no runtime revalidation.
- **Cards show Amazon's LIST price; every displayed list price carries a date-stamped "checked <date>" notation.** No list price on Amazon → the live offer price, labeled as the current price.
- **Every comparison uses Amazon list price** — tables, "cheaper than", value-pick framing, savings math.
- **Never a maker/brand-sourced figure** (Associates Program Policies (Participation Requirements §2(b))).
- **Dark cards show no figure** — only the Amazon buy path.
- **Prose may state a figure only if it matches the card** (owner 2026-09-24).
- **Only a live page read marks a card DARK or GONE** (`scripts/record-live-read.ts` → `data/live-read-overrides.json`); API reads may only HOLD (`scripts/sync-amazon-prices.ts` HOLD-ONLY block); live-read overrides expire after 7 days (§8rr · #171 #177 #178).
- **A truly gone pick is replaced; a product not on Amazon comes off the roster** (§8qq.3, 2026-09-09 · rule-3 batches #170–#182).
- **Price sync is manual** — run `scripts/sync-amazon-prices.ts` by hand and ship the result as a PR (§8nn · #174; the workflow and the refresh-prices cron were retired in #186).
- **No scheduled writers, no crons, no automated sessions** (§8nn · autonomous content cron retired in `04c1e76`; refresh-prices cron + weekly-price-sync retired in #186).
- **Condition titles** — "Renewed" = refurbished; not a substitute for a New pick (§8l · confirm with owner).
- **Dead ASINs** — fix at the generator (regen-source law), plus the dead-ASIN guard (`data/dead-asins.json` + `validate:dead-asin-guard`) (§8m).
- **Grep the product name + ASIN across the repo before changing any fact about it** (owner 2026-09-24).

## 5. Writing and sourcing (owner 2026-09-14 · PR #184 (superseded by this file; closed when this PR opens) · proven on #185)
- **Writers never originate facts.** They reference handed-over verified data (pick JSON; fact list with verbatim source sentence + URL + access date). Brief verbatim: "Do not add any citation you have not been handed."
- **Quotes are copy-paste only** — never retyped, tidied, typo-fixed, reordered or trimmed inside quotation marks. Owner/community quotes (`ownerVoice`) are optional and owner-pasted only.
- **Counts are data-bounded** — "up to N, minimum = what the data supports." Cons are grounded in the listing or a source and never padded. Five sourced picks beat eight padded.
- **`INSUFFICIENT DATA: <requirement> — <what is missing> — <what would close it>` is a successful outcome.** Research lanes may record UNVERIFIED (owner 2026-09-24).
- **Ship when the page is more honest than it was** — not when the system around it is perfect (owner 2026-09-24).
- **≥2 citations per guide, each fetch-resolved at write time** (owner 2026-09-24 · D35). Citations verified at write time (§8t).
- **No hands-on testing claims** ("we tested", "in our lab", "after using"). PetPalHQ synthesizes expert and listing evidence.
- **Fixer fixes get a delta re-verify** — every line a fixer touched is re-checked by someone other than the fixer (§8n).
- **Writer and verifier are never the same lane** (owner 2026-09-24).

## 6. Gates (owner-approved streamlining 2026-09-24)
- **W4 independent adversarial verifier** (skill `w4-verify`) — REQUIRED for PRs touching reader-facing claims, prices, citations, or buy-path/render code. Re-derives every price/spec/ASIN/citation from scratch. Orchestrator-spawned, never lead-spawned, never self-approved. Max 3 fix→re-verify rounds; then escalate to the owner with the open findings.
- **The W4 brief includes CLAUDE.md §3–§5 verbatim. Where ANY w4-verify check disagrees with CLAUDE.md §3–§5, CLAUDE.md governs** (owner 2026-09-24). Known conflicts: Dark-card check, Instrument checks 2, 4 and 5, named-step item 5 (two-read rule), Deal-price-as-MSRP.
- In-lane review (`cp-pp-review` / `petpal-content-review`) is capped at 2 fix→verify rounds; W4 at 3.
- **Chore/CI/docs-only PRs** use a short self-checklist instead of W4 (scope confirmed docs/CI only; no reader-facing text, price, citation or render path touched; build green). It is posted as a PR **comment** ending with a `VERDICT: MERGE` line — lockdown rule 1 reads PR comments only (not the body) before `gh pr merge`.
- **W5b post-merge audit** — the Post-Deploy workflow's job summary is the W5b and IndexNow receipt — the `W5b verdict` step in `post-deploy-index.yml` is live (#186). After each merge the session confirms its verdict line: changed-set only, Dropped 0, HTTP 200/202, sitemap/llms parity. Run skill `w5b-indexer-audit` when the verdict line is missing or FAIL. A FAIL verdict is a warning annotation; the run stays green so debounce keeps working (owner 2026-09-24).
- **A gate change ships in its own PR, never inside a content PR** (§8gg.3).

## 7. Pacing on a cited site (owner 2026-09-24, adapted)
- ≤2 production deploys (merges to `main`) per night.
- Rollouts in cohorts of ≤25 pages (`GUIDE_CAP=25`, `scripts/search-index/guide-index-gate.mjs`).
- Repair-class fixes (restoring truth) are exempt from pacing but still need a live read + W4 + W5b.

## 8. Working with the owner (owner 2026-09-24)
- Questions come after the facts, carry blast-radius counts, max 3 per decision.
- **Lessons learned in a session land in this CLAUDE.md in the same session.**

## 9. Content pipeline
New guides: `/content-pipeline-petpal <slug>` → strategy → research → skeleton → polish → review → ship. Demand gate (owner 2026-09-24, hard gate): a new guide needs demand validated over the trailing two weeks (Bing Webmaster AI Performance citations/queries, as in #183 #185) and must not cannibalize an existing guide. Hero images: `chatgpt-image-gen` skill → `public/images/guides/<slug>.webp`.

## Reference only (not law)
SHE stage model §8ii · §8ll · §8rr.4 canary · §8bb gauntlet (retired) · xmasgear 16a · 09-12 sister freeze (moot after 2026-09-16).

## Known gaps (recorded 2026-09-24, each needs its own gate PR)
- Renderer vs §4: cards currently print the snapshot offer price (`data/amazon-prices.json`) else frontmatter `price`; dark cards can print a maker `listPrice:` block or a last-read figure (`src/lib/dark-card.ts`). 9 guides carry maker `listPrice:` blocks. Do not author new maker `listPrice:` blocks.
- **Interim rule until the pricing render PRs land:** frontmatter `price` = live-read list price; the rendered snapshot figure and missing stamp are recorded in BLAST RADIUS and are not grounds for HOLD.
- Buyable cards have no dated "checked" stamp.
- PromoBadge/`activePromo` still renders (`src/app/guides/[slug]/page.tsx:395`, `src/lib/schema.ts:340`); 1 guide has `promo:` (`best-mothers-day-gifts-pet-moms-2026.md`).
- `scripts/record-live-read.ts --price` records the New buy-box offer price; it has no list-price flag, so list-price reads live in the PR receipts only.
- `.github/workflows/post-deploy-index.yml` still has a Google Indexing API step.
