@AGENTS.md

# Loyal & Found (petpalhq.com) — Session Bootstrap

## What This Project Is
**Display brand:** Loyal & Found. **Domain:** petpalhq.com (retained for SEO).

A warm, approachable pet review publication built on Next.js. We synthesize expert reviews (veterinarians, trainers, behaviorists) and present three picks at three price points for every category: Best for the Money, The Sweet Spot, Worth the Splurge. Earns via Amazon Associates (tag: `petpalhq-20`).

**Current state:** 5 guides (1 three-tier, 4 legacy prose), 25 consensus-scored products. "Loyal & Found" redesign Phase 1 shipped — design system, homepage, guide template, flagship harnesses guide.

## The Core Innovation: Three-Tier Framework
EVERY new guide presents exactly 3 products:
1. **Best for the Money** (under ~$30) — tier color: Leaf (#5B7C4A)
2. **The Sweet Spot** (~$30-75) — "Our favorite" — tier color: Sage (#7A8970)
3. **Worth the Splurge** ($75+) — tier color: Honey (#D4A155)

Price ranges vary by category. Never more, never fewer. Frontmatter uses `tiers:` with `budget`, `sweetSpot`, `splurge` objects.

## Design System
- **Fonts:** Fraunces (display, `--font-display`) + Inter (body, `--font-body`)
- **Palette:** Espresso #2A2520, Cream #FDF9F2, Tomato #B5472E, Sage #7A8970, Leaf #5B7C4A, Honey #D4A155
- **Wordmark:** "Loyal *&* Found" — italic Tomato ampersand is the brand signature
- **Layout:** 720px article, 900px layout. No drop shadows.
- **Voice:** First-person plural "we" — trusted friend, not publication

## Session Start Protocol
1. `git log --oneline -10` + `git status`
2. Read this file for known issues and conventions
3. Check `src/content/guides/` for current guide count

## Key Paths
- Guides content: `src/content/guides/*.md` (5 guides)
- Guide renderer: `src/app/guides/[slug]/page.tsx`
- Guide components: `src/components/guides/` (ValueTierCard, QuickVerdict, ResearchNote, etc.)
- Consensus data: `src/lib/content/consensus-data.ts` (25 products)
- Content loader: `src/lib/content.ts` (parses tier frontmatter)
- Schema builder: `src/lib/schema.ts` (delegates to `@omc/schema`)
- Site config: `src/config/site.ts`
- Design tokens: `src/app/globals.css` (Tailwind v4 @theme inline)
- Methodology page: `src/app/methodology/page.tsx`
- Network page: `src/app/our-network/page.tsx`

## Key Commands
- Dev server: `npm run dev` (port 3000)
- Build: `npm run build`

## Affiliate & Monetization
- **Amazon tag:** `petpalhq-20` — always use this
- **Amazon link format:** `https://www.amazon.com/dp/{ASIN}?tag=petpalhq-20&linkCode=as2`
- **Affiliate disclosure:** Must be present on all pages with affiliate links
- **CTA language:** "See price on Amazon" (approved). Never "BUY NOW" or urgency language.

## Schema & Structured Data
- All JSON-LD built via `src/lib/schema.ts` using `@omc/schema` factory
- Site-wide Organization + WebSite JSON-LD emitted in root `layout.tsx`
- Brand entity linking via `BRAND_SAME_AS_MAP` in `schema.ts`
- Stable @id URIs: `https://petpalhq.com/#organization`, `https://petpalhq.com/#website`

## Voice Rules
- ALWAYS: "We read 32 expert reviews" / "Here's what we found" / "The honest trade-off:"
- NEVER: "I tested this" (no single reviewer) / "Best ever!" / urgency language
- Every pick has a downside. Splurge picks get "Skip it unless" callout.
- First-person plural "we" — editorial team voice

## Content Rules
- Minimum 20 expert sources per three-tier guide
- Expert quotes must have `source` attribute — never fabricate
- Every product must be real — verify on Amazon before including
- No outbound editorial links to competitors
- Health/safety claims must include veterinary disclaimers

## Legacy Pages
Pages not yet reskinned (`/about`, `/methodology`, `/author/*`, `/reviews/*`, `/our-network`) use backward-compat CSS aliases in globals.css mapping old variable names (--forest, --stone, --aged-gold, etc.) to new palette. These work but should be reskinned in Phase 2.

## Git Workflow
- **Branch:** `main` — Vercel auto-deploys on push to main
- **Git email MUST be `nicks.sidehustle.2024@gmail.com`**
- Commit format: `{type}: {description}` (feat/fix/docs/schema/content)
- Never commit: `.env.local`, API keys, credentials

## Part of a Network
PetPalHQ is one of 5 affiliate sites sharing editorial infrastructure. Sister sites: SmartHomeExplorer, GardenGearHQ, DeskGearHQ, ChristmasGearHQ.
