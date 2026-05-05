# PetPalHQ v2 — Setup Record

This is the completed setup record for PetPalHQ v2 (cloned from `christmasgearhq-next` on 2026-05-04 as a clean SHE-pattern instance).

## Site Configuration

- [x] `src/config/site.ts` — PetPalHQ identity, navy/teal/green/coral palette, 5 categories (dogs / cats / aquarium / reptile / birds), 11 content pillars, pet keyword aliases
- [x] `package.json` — `name: "petpalhq-next"`, description updated
- [x] `next.config.ts` — image hosts inherited (Unsplash + Amazon CDN); add petpal-specific CDNs only if linking to non-Amazon imagery

## Schema & Network Identity

- [x] `src/lib/schema.ts` — `SITE_URL = "https://petpalhq.com"`, `loadSiteConfig('petpalhq')` with **Nick Miles persona override** at the consumer (upstream `omc-config-0.1.0.tgz` still names "Rachel Cooper" from the L&F era; override avoids a tarball repack)
- [x] `BRAND_SAME_AS_MAP` populated with pet-relevant brands (API, Seachem, Fluval, Zoo Med, Bird Buddy, etc.); expand as content ships
- [x] `vendor/omc-{config,schema}-0.1.0.tgz` — kept as-is (shared network infrastructure, do not modify)

## Affiliate / Amazon

- [x] Default Amazon Associates tag: `petpalhq-20` (in `src/lib/creators-api.ts`, `src/types/content.ts`, `src/components/reviews/ProductCard.tsx`)
- [ ] `AMAZON_ASSOCIATES_TAG=petpalhq-20` set on Vercel Production + Preview env (do at Phase 6)
- [ ] `AMAZON_CREATORS_API_CLIENT_SECRET` provisioned (stub mode works without; live pricing requires it)
- [ ] Verify `petpalhq-20` is active in Amazon Associates dashboard

## Component & Type Refactor

- [x] `ChristmasGearScoreCard.tsx` → renamed `PetPalScoreCard.tsx`
- [x] `ChristmasLightsInfographic.tsx` → deleted
- [x] `consensus-data.ts` types — new `PillarScores` (Expert Consensus 30 / Effectiveness 25 / Animal Safety 20 / Durability 15 / Value 10), renamed `christmasGearScore` → `petpalGearScore`, renamed `estimatedSeasons` → `estimatedYears`, empty `consensusReviews[]`
- [x] `src/data/products.ts` — wiped to empty array
- [x] All field rename references updated (5 files)
- [x] All API route URLs and source labels updated (`subscribe`, `newsletter`, `analytics/gsc`, `indexnow`)
- [x] TypeScript compile clean (`tsc --noEmit` exit 0)

## Content State

- [x] `src/content/guides/` — wiped (40 christmas guides removed)
- [x] `public/llms.txt` — removed (will regenerate from new guides via existing pipeline)
- [x] `public/a9b8...txt` (christmas's IndexNow key) — removed; new petpal IndexNow key needed for production
- [ ] Wave 1 aquarium guides (6) — pending Phase 5 build from `docs/research/aquarium/`
- [ ] Wave 2 reptile guides (2 hubs) — pending
- [ ] Wave 3 birds guide (1 hub) — pending

## Identity Documents

- [x] `EDITORIAL-IDENTITY.md` — petpal voice, persona, content pillars
- [x] `DESIGN-IDENTITY.md` — petpal visual system
- [x] `PIPELINE-CONFIG.md` — petpal pipeline config
- [x] `SETUP_CHECKLIST.md` (this file)
- [x] `NETWORK-EDITORIAL-DIRECTIVES.md` — symlinked to network-level directives at `/Users/mm2/sites/`

## Branding Assets

- [ ] `public/logo.svg` — TBD (christmasgearhq logo still in place; replace from ChatGPT image candidates at `docs/research/images/`)
- [ ] `public/favicon.png`, `public/favicon.svg` — TBD (christmasgearhq favicon still in place)
- [ ] `public/opengraph-image.tsx` — verify or regenerate
- [ ] Author photo `public/images/authors/nick-miles.jpg` — TBD

## Prose Pages (still contain christmasgearhq references — Phase 3 prose work)

- [ ] `src/app/about/page.tsx` — site intro + contact email
- [ ] `src/app/privacy-policy/page.tsx` — canonical URL + privacy contact emails
- [ ] `src/app/affiliate-disclosure/page.tsx` — canonical URL
- [ ] `src/lib/email-templates.ts` — welcome email URLs + support email
- [ ] `src/app/author/<slug>/page.tsx` — Nick Miles bio (christmasgearhq's `sarah-mitchell` page replaces; rename slug)

## Deployment

- [ ] Local verification (`npm install`, `npm run validate:content`, `npm run audit:guides`, `npm run build`, `npm run dev`)
- [ ] Vercel env vars provisioned (5 vars per BRIEF_PETPAL_V2.md)
- [ ] First commit + force-push to `nicks-sidehustle/petpalhq-next` main (NEEDS user confirmation)
- [ ] Vercel auto-deploy succeeds
- [ ] DNS / domain mapping verified for petpalhq.com
- [ ] Schema.org Rich Results test passes on a guide page
- [ ] GSC sitemap submitted

## Post-Launch

- [ ] GA4 measurement ID added to `siteConfig.gaId` and Vercel env
- [ ] Brevo list created and `BREVO_LIST_ID` set
- [ ] IndexNow key file regenerated and placed at `public/<key>.txt`
- [ ] First few guides crawl-checked + indexed

## Reference

- Execution brief: `./BRIEF_PETPAL_V2.md`
- Approved plan: `/Users/mm2/.claude/plans/can-you-put-a-mutable-orbit.md`
- Research source: `./docs/research/`
- Design wireframes (canonical): `./docs/design/wireframes/` + `./docs/design/DECISIONS.md`
- Quarantined v1: `/Users/mm2/sites/_archive/petpalhq-v1/`
