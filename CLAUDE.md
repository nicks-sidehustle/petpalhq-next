@AGENTS.md

# PetPalHQ — Session Bootstrap

## What This Project Is
PetPalHQ.com is a Next.js affiliate review site for pet gear — harnesses, feeders, toys, cameras, and accessories. It aggregates consensus scores from expert sources (Wirecutter, American Kennel Club, PetMD, Spruce Pets, etc.) into a proprietary PetPal Score. The site earns via Amazon Associates (tag: `petpalhq-20`).

**Current state:** 5 guides, 25 consensus-scored products in `src/lib/content/consensus-data.ts`. PetPal Score methodology formalized at `/methodology`. Track 1 infrastructure shipped (@omc/schema, llms.txt, network cross-links).

## Session Start Protocol
1. `git log --oneline -10` + `git status` — see what changed since last session
2. Read this file for known issues and conventions
3. Check `src/content/guides/` for current guide count

## Key Paths
- Guides content: `src/content/guides/*.md` (5 guides)
- Guide renderer: `src/app/guides/[slug]/page.tsx`
- Consensus data: `src/lib/content/consensus-data.ts` (25 products)
- Score utilities: `src/lib/consensus-score.ts`
- Content loader: `src/lib/content.ts`
- Schema builder: `src/lib/schema.ts` (delegates to `@omc/schema`)
- Site config: `src/config/site.ts`
- Product images: `public/images/products/`
- Methodology page: `src/app/methodology/page.tsx`
- Network page: `src/app/our-network/page.tsx`

## Key Commands
- Dev server: `npm run dev` (port 3000)
- Build: `npm run build`

## Affiliate & Monetization
- **Amazon tag:** `petpalhq-20` — always use this
- **Amazon link format:** `https://www.amazon.com/s?k={ProductName}&tag=petpalhq-20`
- **Affiliate disclosure:** Must be present on all pages with affiliate links

## Schema & Structured Data
- All JSON-LD built via `src/lib/schema.ts` using `@omc/schema` factory
- Site-wide Organization + WebSite JSON-LD emitted in root `layout.tsx`
- Brand entity linking via `BRAND_SAME_AS_MAP` in `schema.ts`
- Stable @id URIs: `https://petpalhq.com/#organization`, `https://petpalhq.com/#website`
- Author @id: `https://petpalhq.com/#person-rachel-cooper`

## PetPal Score
Proprietary composite rating: **Safety 35% + Pet Comfort 25% + Durability 25% + Value 15%**

Verdict scale:
- >= 9.0: "Must Buy"
- >= 8.0: "Recommended"
- >= 7.5: "Good Value"
- >= 6.0: "Mixed"
- < 6.0: "Skip"

## Content Rules
- Never claim to test all products — site uses a hybrid synthesis model (expert review aggregation + selective hands-on validation)
- Minimum 3 expert sources per product for inclusion
- Expert quotes must have `source` attribute — never fabricate quotes
- Every product must be real — verify on Amazon before including
- No outbound editorial links to competitors (mention by name only, never link)
- Health/safety claims must include veterinary disclaimers where appropriate

## Author
- **Rachel Cooper**, Senior Pet Editor — former licensed veterinary technician
- Author page: `/author/rachel-cooper`
- All guides attributed to Rachel Cooper

## Git Workflow
- **Branch:** `main` — Vercel auto-deploys on push to main
- **Git email MUST be `nicks.sidehustle.2024@gmail.com`** — wrong email causes silent Vercel deploy failures
- Commit format: `{type}: {description}` (feat/fix/docs/schema/content)
- Never commit: `.env.local`, API keys, credentials

## Part of a Network
PetPalHQ is one of 5 affiliate sites sharing editorial infrastructure. Sister sites: SmartHomeExplorer, GardenGearHQ, DeskGearHQ, ChristmasGearHQ. References to these in `our-network/page.tsx` and editorial cross-links in guides are intentional — not brand leakage.
