# ChristmasGearHQ Refresh Execution Backlog

## Completed in baseline tranche

- Created RALPLAN PRD and test spec.
- Created context snapshot.
- Added refresh audit scripts.
- Added guide/product/package-script/route reports.
- Added product freshness fields to current product data.
- Started moving RSS, sitemap, and search away from legacy `src/data/guides.ts` by adding `getAllGuideSummaries()`.
- Split search results into `src/components/SearchResultsClient.tsx` so server-side guide summaries can feed client search.
- Removed unsupported `eslint` key from `next.config.ts`.
- Repaired TypeScript-incompatible FAQ regex flag in `src/lib/guides.ts`.

## Completed — Guide source-of-truth migration

Files:
- `src/lib/guides.ts`
- `src/app/guides/page.tsx`
- `src/app/guides/[slug]/page.tsx`
- `src/app/feed.xml/route.ts`
- `src/app/sitemap.ts`
- `src/app/search/page.tsx`

Work:
- Verify guide consumers remain on Markdown frontmatter.
- Keep guide counts consistent across guides index, RSS, sitemap, and search.

## Next PR 2 — Taxonomy implementation

Files:
- `src/config/site.ts`
- Markdown frontmatter in `src/content/guides/*.md`
- Category/review hub pages

Work:
- Add target pillar/category model.
- Add mapping/alias support for old category labels.
- Reduce `validate:content` category failures.

## Completed — Typecheck cleanup / stale component pruning

Deleted unused stale components that blocked `npx tsc --noEmit`. Build now runs TypeScript validation.

## Completed — Affiliate and monetization primitives baseline

- Added `src/components/affiliate/AffiliateLink.tsx`.
- Enforced `rel="sponsored noopener noreferrer"`.
- Added GA `affiliate_click` event tracking with product, retailer, and placement metadata.
- Migrated product detail and featured product card CTAs.
- Future work: expose `lastVerified` in redesigned product cards.

## Next PR 5 — Design system components

Files:
- `src/app/globals.css`
- New `src/components/editorial/*`

Work:
- Implement Merchant's Almanac components.
- Build real-content fixtures before template rollout.

## Next PR 6 — Guide template redesign

Files:
- `src/app/guides/[slug]/page.tsx`
- `src/components/editorial/*`
- `src/lib/schema.ts`

Work:
- Add quick answer, quick picks, comparison, methodology, FAQ, related links.
- Ensure schema mirrors visible content.

## Next PR 7 — Flagship content batch

Guides:
- `best-christmas-lights-2026`
- `best-artificial-christmas-trees-2026`
- `best-christmas-tree-stands-2026`
- `best-outdoor-christmas-decorations-2026`
- `best-christmas-storage-solutions-2026`

Work:
- Rewrite only after taxonomy/template gates pass.
- Verify products before current claims.
- Merge/redirect duplicates only with documented canonical decisions.
