# PetPalHQ — Claude session notes

## AI-Grounding Protection (LOCKED 2026-07-16 — Bing grounding-cut post-mortem)
Four portfolio sites lost ALL Copilot/AI citations overnight in May–Jul 2026. Root pattern: a churn trigger (abnormal deploy/content week) × a quality disqualifier (trust debt). Full analysis: `affiliate-site-template/programs/2026-07-portfolio-parity/BING-CUT-POSTMORTEM-AND-PRECAUTIONS.md`. Non-negotiables for THIS site:
- **IndexNow: changed URLs only** — never the full sitemap, never per-redeploy, per-site key only. Full-corpus submission is a manual baseline action, never automated.
- **No replacement churn while cited**: no corpus teardowns, mass deletions, schema swaps, or author-identity rewrites on a live cited site — stage rebuilds additively. (Additive content waves are proven safe.)
- **AI-surface parity**: llms.txt + sitemap.xml must track the live corpus — correct site, no dead/redirect URLs, no missing live pages, moving freshness stamp.
- **No fabricated citations/attributions ever** (Bing scores source-attribution integrity directly — dormgear was cut over this class).
- **Citation metric of record = Bing Webmaster Tools AI Performance** (GA4 AI-referrals are only the click floor). Two consecutive zero-citation days vs a nonzero baseline = investigate immediately.
