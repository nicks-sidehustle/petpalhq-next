# ChristmasGearHQ

> Internal operational reference — not a public-facing README.

**Last Updated:** 2026-02-25

---

## Overview

- **Domain:** [christmasgearhq.com](https://christmasgearhq.com)
- **Niche:** Christmas decorations, holiday gifts, and seasonal gear
- **Target Audience:** Holiday shoppers looking for curated Christmas product recommendations
- **Monetization:** Amazon Associates affiliate links (tag: `xmasgearhq-20`)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Content:** Markdown files (guides) + TypeScript data files (products, guide metadata)
- **Dependencies:** 29 packages

## Hosting & Deployment

- **Platform:** Vercel
- **Vercel Project:** `christmasgearhq-next`
- **GitHub Repo:** [nicks-sidehustle/christmasgearhq-next](https://github.com/nicks-sidehustle/christmasgearhq-next)
- **Deploy:** Auto-deploy on push to `main`
- **Custom Domain:** `christmasgearhq.com` configured in Vercel

## Content Structure

```
src/
├── content/guides/*.md      # Canonical guide content + frontmatter metadata
├── data/products.ts         # Product data (name, ASIN, affiliate links)
└── app/                     # 10 pages (Next.js App Router)
```

### Adding New Content

1. **New Guide:** Create `src/content/guides/your-slug.md` with complete frontmatter
2. **New Product:** Add entry to `src/data/products.ts` with ASIN and affiliate link
3. Push to `main` — Vercel auto-deploys

## Cron Jobs (OpenClaw)

| Name | ID | Schedule | Description |
|------|-----|----------|-------------|
| ChristmasGearHQ Daily Content | `a0b7e913` | Daily 7:39 AM PT | Generates new guide content |

## APIs & Services

- **Brevo** — Email newsletter signup and list management
- **Amazon Associates** — Affiliate links (tag: `xmasgearhq-20`)
- **Google Analytics 4** — ⚠️ **Not configured** — no traffic data available

## Environment Variables

```env
# .env.local
BREVO_API_KEY=           # Brevo API key for newsletter
BREVO_LIST_ID=           # Brevo contact list ID
```

## Current Status

- **Traffic:** Unknown (no GA4 configured)
- **Revenue:** Unknown
- **Content:** 28 guides, 10 pages
- **Known Issues:**
  - ⚠️ **14 dead ASINs** — products no longer available on Amazon, need replacement
  - ⚠️ **No GA4 tracking** — can't measure traffic or conversions

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev          # http://localhost:3000

# Build
npm run build

# Deploy
git push origin main  # Auto-deploys via Vercel
```
