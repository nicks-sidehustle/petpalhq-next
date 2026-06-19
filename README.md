# PetPalHQ

> Internal operational reference — not a public-facing README.

**Last Updated:** 2026-06-19

---

## Overview

- **Domain:** [petpalhq.com](https://petpalhq.com)
- **Niche:** Pet gear and care guides across five verticals — Dogs, Cats, Aquarium, Reptile, and Birds (with depth in exotic-pet gear)
- **Target Audience:** Pet owners looking for curated, expert-reviewed product recommendations
- **Monetization:** Amazon Associates affiliate links (tag: `petpalhq08-20`)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Content:** Markdown files (guides) + TypeScript data files (products, guide metadata) — legacy flat-markdown pipeline
- **Dependencies:** 33 runtime + 13 dev packages

## Hosting & Deployment

- **Platform:** Vercel
- **Vercel Project:** `petpalhq-next`
- **GitHub Repo:** [nicks-sidehustle/petpalhq-next](https://github.com/nicks-sidehustle/petpalhq-next)
- **Deploy:** Auto-deploy on push to `main`
- **Custom Domain:** `petpalhq.com` configured in Vercel

## Content Structure

```
src/
├── content/guides/*.md      # Canonical guide content + frontmatter metadata (legacy flat-markdown pipeline)
├── data/products.ts         # Product data (name, ASIN, affiliate links)
└── app/                     # Next.js App Router pages
```

### Adding New Content

1. **New Guide:** Create `src/content/guides/your-slug.md` with complete frontmatter
2. **New Product:** Add entry to `src/data/products.ts` with ASIN and affiliate link
3. Push to `main` — Vercel auto-deploys

## APIs & Services

- **Brevo** — Email newsletter signup and list management
- **Amazon Associates** — Affiliate links (tag: `petpalhq08-20`)
- **Google Analytics 4** — Configure before relying on traffic data

## Environment Variables

```env
# .env.local
BREVO_API_KEY=           # Brevo API key for newsletter
BREVO_LIST_ID=           # Brevo contact list ID
```

See `.env.local.example` for the full list of supported variables.

## Current Status

- **Content:** ~90 guides currently in `src/content/guides` across all five verticals
- **Pipeline:** Legacy flat-markdown content pipeline (see `PIPELINE-CONFIG.md` and `docs/GUIDE_CREATION_PROCESS.md`)

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev          # http://localhost:3000

# Build
npm run build

# Validate content
npm run validate:content

# Regenerate llms.txt / llms-full.txt after content changes
npm run generate:llms-txt
npm run generate:llms-full-txt

# Deploy
git push origin main  # Auto-deploys via Vercel
```
