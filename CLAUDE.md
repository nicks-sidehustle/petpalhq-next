# PetPalHQ — Claude session notes

## Ship Gates — W4/W5b (portfolio-parity, audit §2.5)
- **W4 independent adversarial verifier** (skill: `w4-verify`) — required before merging any content-wave PR on this repo: an orchestrator-spawned agent re-derives every price/spec/ASIN/citation claim from scratch, never trusts the writer/lead's report. Never lead-spawned, never self-approved.
- **W5b post-merge changed-set IndexNow audit** (skill: `w5b-indexer-audit`) — required within ~15min of every merge/deploy: confirms exactly the changed-set URLs were IndexNow-submitted (never full-corpus), Dropped:0, HTTP 200/202, and sitemap.xml/llms.txt parity.
- Authority: `programs/2026-07-portfolio-parity/RUNBOOK.md` §4 (non-negotiable gates) and §8b (indexing & grounding protection protocol).

## AI-Grounding Protection (LOCKED 2026-07-16 — Bing grounding-cut post-mortem)
Four portfolio sites lost ALL Copilot/AI citations overnight in May–Jul 2026. Root pattern: a churn trigger (abnormal deploy/content week) × a quality disqualifier (trust debt). Full analysis: `affiliate-site-template/programs/2026-07-portfolio-parity/BING-CUT-POSTMORTEM-AND-PRECAUTIONS.md`. Non-negotiables for THIS site:
- **IndexNow: changed URLs only** — never the full sitemap, never per-redeploy, per-site key only. Full-corpus submission is a manual baseline action, never automated.
- **No replacement churn while cited**: no corpus teardowns, mass deletions, schema swaps, or author-identity rewrites on a live cited site — stage rebuilds additively. (Additive content waves are proven safe.)
- **AI-surface parity**: llms.txt + sitemap.xml must track the live corpus — correct site, no dead/redirect URLs, no missing live pages, moving freshness stamp.
- **No fabricated citations/attributions ever** (Bing scores source-attribution integrity directly — dormgear was cut over this class).
- **Citation metric of record = Bing Webmaster Tools AI Performance** (GA4 AI-referrals are only the click floor). Two consecutive zero-citation days vs a nonzero baseline = investigate immediately.
