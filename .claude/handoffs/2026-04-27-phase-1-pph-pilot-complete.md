# Phase 1 PPH Pilot — Handoff

**Date:** 2026-04-27
**Branch:** `network/phase-1-pph-pilot`
**Worktree:** `/Users/mm2/sites/.worktrees/petpalhq-phase-1-pilot/`
**Remote:** https://github.com/nicks-sidehustle/petpalhq-next

---

## TL;DR

Phase 1 of the OMC network playbook rollout is complete on PetPalHQ (Loyal & Found pilot). Three infra packages vendored and wired in, dynamic robots.ts replacing the hand-rolled file, affiliate tag sourcing refactored away from hardcoded strings, and Lite Playbook applied to 6 existing guides (capsule + dateModified). Branch is pushed; Vercel preview deploy triggered automatically. IndexNow submission is staged for owner execution post-production-promotion — the submit-urls.cjs shim is SHE-hardcoded and cannot be used for petpalhq.com directly.

---

## Commits

| SHA | Title |
|-----|-------|
| `d26853b` | `feat(network): adopt @omc network infra — robots, affiliate-layer, sister-sites (phase 1)` |
| `d86350b` | `content(lite-playbook): add capsules + dateModified to 6 guides (phase 1)` |

---

## What Shipped

### Infrastructure (Task #6)

- **`vendor/omc-robots-config-0.1.0.tgz`** — robots config package vendored
- **`vendor/omc-affiliate-layer-0.1.0.tgz`** — affiliate URL builder vendored
- **`vendor/omc-sister-sites-0.1.0.tgz`** — sister-sites registry vendored
- **`package.json`** — 3 new `file:` deps pointing to vendor tarballs
- **`package-lock.json`** — resolved npm install with vendored packages
- **`next.config.ts`** — `transpilePackages` extended from 2 to 5 entries (adds the 3 @omc packages)
- **`src/app/robots.ts`** — replaced hand-rolled static output with dynamic `@omc/robots-config` generator using `loadSiteConfig('petpalhq')`; output includes full OMC AI-bot allowlist (GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot, etc.)
- **`src/lib/creators-api.ts`** — `getMockOffer` now uses `buildAmazonUrl({asin, tag})`; singleton factory falls back to `siteConfig.affiliateTag`; hardcoded `petpalhq-20` string removed from URL paths
- **`src/lib/dataLayer.ts`** — `injectAscSubtag` delegates to `buildAmazonUrl({existingUrl, tag, ascsubtag})`; `SITE_TAG` bound at module scope from `siteConfig`; public function signatures unchanged

### Content — Lite Playbook (Task #7)

Applied to 6 guides. Changes per guide:
- BLUF capsule (≤150 chars, "Verified against N sources" format) inserted at top of body
- `dateModified: 2026-04-27` added to frontmatter
- No body rewrites, no rank changes, no FAQ edits, no affiliate links added to FAQ

Guides upgraded:
1. `best-automatic-cat-feeders-2026.md`
2. `best-cat-water-fountains-2026.md`
3. `best-dog-harnesses-2026.md`
4. `best-dog-puzzle-feeders-enrichment-toys-2026.md`
5. `best-orthopedic-dog-beds-2026.md`
6. `best-smart-pet-cameras-2026.md`

---

## Baseline Metrics for 7-Day Citation-Lift Gate

These are the pre-deploy states to compare against after 7 days:

| Signal | Before Phase 1 | After Phase 1 |
|--------|---------------|---------------|
| `dateModified` on 6 guides | Missing on all 6 | `2026-04-27` on all 6 |
| `robots.txt` generator | Hand-rolled static | Dynamic from `@omc/robots-config` |
| AI-bot allowlist in robots.txt | Unknown / not confirmed | GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot present (smoke-tested before commit) |
| Affiliate tag source | Hardcoded `petpalhq-20` literals | `siteConfig.affiliateTag` via `@omc/affiliate-layer` |

**Owner ops for baseline capture (cannot be pulled programmatically here):**
- GSC impressions/clicks: pull from Google Search Console for petpalhq.com, filter to the 6 guide URLs, snapshot before and 7 days after production promote. (If GSC property not yet verified for petpalhq.com, do it now — it's a 7-day wait for data.)
- AI-bot crawl frequency: check Vercel access logs or Cloudflare analytics for bot UA strings. Pre-deploy baseline is effectively zero confirmed AI-bot visits (robots.txt was not previously confirmed to allow them).
- Bing IndexNow acknowledgment: see IndexNow section below.

---

## IndexNow — Staged for Manual Execution

The `~/.claude/skills/search-index-submit/scripts/submit-urls.cjs` shim is hardcoded to `www.smarthomeexplorer.com` and cannot submit for `petpalhq.com` directly.

URL list staged at:
```
/Users/mm2/sites/.worktrees/petpalhq-phase-1-pilot/.indexnow-pph-phase-1.txt
```

Contents:
```
https://petpalhq.com/guides/best-automatic-cat-feeders-2026
https://petpalhq.com/guides/best-cat-water-fountains-2026
https://petpalhq.com/guides/best-dog-harnesses-2026
https://petpalhq.com/guides/best-dog-puzzle-feeders-enrichment-toys-2026
https://petpalhq.com/guides/best-orthopedic-dog-beds-2026
https://petpalhq.com/guides/best-smart-pet-cameras-2026
```

**WAIT for production promotion before submitting.** IndexNow submissions that 404 are penalized. Once Vercel production is live, submit via:

```bash
# Option A: direct curl to api.indexnow.org (same pattern as PR #47 / f4fd19a5 on SHE)
curl -s -X POST "https://api.indexnow.org/IndexNow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "host": "petpalhq.com",
    "key": "<PPH_INDEXNOW_KEY>",
    "keyLocation": "https://petpalhq.com/<PPH_INDEXNOW_KEY>.txt",
    "urlList": [
      "https://petpalhq.com/guides/best-automatic-cat-feeders-2026",
      "https://petpalhq.com/guides/best-cat-water-fountains-2026",
      "https://petpalhq.com/guides/best-dog-harnesses-2026",
      "https://petpalhq.com/guides/best-dog-puzzle-feeders-enrichment-toys-2026",
      "https://petpalhq.com/guides/best-orthopedic-dog-beds-2026",
      "https://petpalhq.com/guides/best-smart-pet-cameras-2026"
    ]
  }'
```

Replace `<PPH_INDEXNOW_KEY>` with the PPH-specific key (check 1Password → API Keys vault, or `src/lib/indexnow.ts` if it exists in PPH).

---

## Phase 2 Next Steps

Once the 7-day citation-lift gate passes (or is waived by owner judgment), repeat this exact recipe for **CGH** (Cozy Gear Hub) and **GGH** (Great Gear Hub):

1. `git worktree add ~/sites/.worktrees/<site>-phase-1 -b network/phase-1-<site>-pilot` from the relevant source checkout
2. Copy the 3 tarballs from `vendor/` into the new worktree's `vendor/`
3. Update `package.json` with `file:` deps, run `npm install`
4. Extend `next.config.ts` `transpilePackages`
5. Replace `src/app/robots.ts` with the dynamic generator (swap `'petpalhq'` for the relevant site key)
6. Refactor affiliate URL-construction code to use `@omc/affiliate-layer`
7. Apply Lite Playbook to top guides (capsule + dateModified)
8. Build, smoke-test `/robots.txt`, push, IndexNow (post-production), handoff

---

## Owner Ops Still Needed

- [ ] **Verify Vercel preview build** for `network/phase-1-pph-pilot` is green (auto-triggered by push; check Vercel dashboard for petpalhq project)
- [ ] **Promote to production** OR create a PR for owner review (orchestrator did not create a PR per instructions)
- [ ] **GSC baseline snapshot** — pull petpalhq.com impressions/clicks for the 6 guide URLs now, before promotion propagates
- [ ] **IndexNow submission** — run the curl above once production is live (URL list staged at `.indexnow-pph-phase-1.txt`)
- [ ] **PPH IndexNow key** — confirm it exists at `petpalhq.com/<key>.txt` and is in 1Password
- [ ] **DNS + Vercel domain config** for `loyalandfound.com` — separate ops, not in scope for this phase
- [ ] **Domain rebrand follow-up** — once `loyalandfound.com` is live, update `~/sites/omc/packages/config/sites/petpalhq.json` `siteUrl` → `loyalandfound.com`, then `npm run build` in omc packages, re-pack tarballs, re-vendor in PPH worktree, redeploy
- [ ] **GSC property for loyalandfound.com** — add now if domain is already resolving, to start the verification clock

---

## Reference Files

- Plan: `~/.claude/plans/1-thisi-s-intended-spicy-nova.md`
- Phase 0 handoff: check `.claude/handoffs/` in source checkout `/Users/mm2/sites/petpalhq-next/`
- OMC packages: `~/sites/omc/packages/`
- Lite wireframe spec: `~/sites/omc/wireframes/lite-spec.md`
- SHE Phase 0 extraction reference: `/Users/mm2/.openclaw/workspace/smarthome-explorer-blog/.claude/handoffs/`
- Relay enforcement context: `/Users/mm2/.openclaw/workspace/smarthome-explorer-blog/` branch `pipeline/relay-enforcement`
