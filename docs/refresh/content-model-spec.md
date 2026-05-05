# ChristmasGearHQ Content Model Spec

## Purpose

Make Markdown guide frontmatter the canonical source of truth for guide pages, sitemap, RSS, search, category hubs, and future AEO/SEO templates.

## Canonical source

Preferred target: `src/content/guides/*.md` frontmatter parsed by `src/lib/guides.ts`.

The legacy `src/data/guides.ts` file has been removed. If static guide data is needed later, it should be generated from Markdown rather than hand-maintained.

## Required frontmatter

```yaml
title: string
description: string
excerpt: string
category: string
publishDate: YYYY-MM-DD
updatedDate: YYYY-MM-DD
readTime: string
featured: boolean
image: URL or path
```

## Recommended frontmatter for redesign phase

```yaml
pillar: tree-setup | lights-power | decor-atmosphere | outdoor-displays | gifts-wrapping | hosting-kitchen | storage-next-year
primaryKeyword: string
secondaryKeywords:
  - string
intent: informational | commercial | transactional | navigational
season: evergreen | jan-storage | spring-planning | summer-planning | fall-research | peak-season | last-minute
products:
  - product-slug
relatedGuides:
  - guide-slug
author: sarah-mitchell
reviewMethod: researched | expert-consensus | hands-on-tested | editor-curated
lastProductCheck: YYYY-MM-DD
```

## AEO content blocks

Future guide templates should support explicit, visible sections:

- Quick answer
- Best overall / best budget / best upgrade / best for specific need
- Comparison table
- Who should buy / who should skip
- Measurement/setup/storage advice
- FAQ

Schema must reflect visible content only.

## Validation rules

Baseline validator should fail on:

- Missing required frontmatter.
- Invalid category once target taxonomy is implemented.
- Duplicate slugs.
- Product references that do not exist.
- Affiliate links missing `tag=xmasgearhq-20`.

Baseline validator may warn on:

- Markdown-only / metadata-only legacy guide mismatches only when `validate:content -- --legacy-guides` is explicitly requested. The audit reports always keep these mismatches visible.
- Stub/under-development language.
- Missing optional AEO fields before the redesign template requires them.

## Consumer migration requirements

These surfaces must use the same registry:

- `src/app/guides/page.tsx`
- `src/app/guides/[slug]/page.tsx`
- `src/app/feed.xml/route.ts`
- `src/app/sitemap.ts`
- `src/app/search/page.tsx`
- Future category hubs and related-guide shelves

## Do-not-do rules

- Do not hand-edit `src/data/guides.ts` to patch individual mismatches.
- Do not delete Markdown guides without a merge/redirect decision.
- Do not add AEO schema for content not visible on the page.
- Do not claim hands-on testing unless the content has actual evidence.
