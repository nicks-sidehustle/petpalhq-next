# ChristmasGearHQ Quality Gates

Quality is more important than speed. A phase is not complete until its evidence exists.

## Gate 1 — Planning gate

Evidence:
- `.omx/plans/prd-christmasgearhq-quality-refresh-20260410.md`
- `.omx/plans/test-spec-christmasgearhq-quality-refresh-20260410.md`
- `.omx/context/christmasgearhq-quality-refresh-20260410T225942Z.md`

Status: complete.

## Gate 2 — Audit gate

Evidence:
- `docs/refresh/reports/guide-inventory.md`
- `docs/refresh/reports/product-inventory.md`
- `docs/refresh/reports/package-script-health.md`
- `docs/refresh/reports/sitemap-route-audit.md`

Pass criteria:
- Reports generate without network access.
- Known mismatches are visible, not hidden.

Status: complete for baseline; validation intentionally fails due known taxonomy issues.

## Gate 3 — Strategy/IA gate

Evidence:
- `docs/refresh/content-model-spec.md`
- `docs/refresh/taxonomy-strategy.md`
- `docs/refresh/execution-backlog.md`

Pass criteria:
- Target pillars exist.
- Current categories have mapping rules.
- Frontmatter source-of-truth strategy is explicit.

Status: complete for baseline taxonomy strategy and alias validation; implementation of route/category hub redesign is deferred.

## Gate 4 — Foundation implementation gate

Evidence required in a later PR:
- Guide consumers use one registry.
- Sitemap/RSS/search include intended public guides consistently.
- Content validation has a known path from failing baseline to passing taxonomy.
- Product freshness fields exist and are used by product card specs.

## Gate 5 — Design system gate

Evidence required in a later PR:
- Merchant's Almanac tokens/components implemented.
- Guide/product/category components are tested with real content.
- Desktop and mobile screenshots reviewed.
- Accessibility and contrast reviewed.

## Gate 6 — Template gate

Evidence required in a later PR:
- Guide template contains visible quick answer, comparison, methodology, affiliate disclosure, FAQ, and related links when applicable.
- Schema reflects visible content.
- Mobile layout is verified.

## Gate 7 — Content refresh gate

Evidence required per guide:
- SERP/search intent brief.
- Product verification notes.
- Duplicate/merge decision.
- Updated content with no unsupported testing claims.
- Internal links and FAQs.

## Gate 8 — Monetization gate

Evidence required:
- Affiliate links centralized or audited.
- `rel="sponsored noopener noreferrer"` enforced.
- CTA click tracking or tracking hook documented.
- Product `lastVerified` displayed or available to display.

## Gate 9 — Launch gate

Evidence required:
- `npm run build` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- Schema/link/visual checks pass for changed templates.
- Sitemap submitted/ready.
