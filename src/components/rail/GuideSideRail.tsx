/**
 * GuideSideRail — SERVER component.
 *
 * Ported from SmartHomeExplorer's grid side-rail pilot ("Rail v2"), via
 * DormGearHQ's review-hardened port (PR #86). The xl+ (>=1280px) sticky right
 * rail. A DIRECT CHILD of the guide page's grid wrapper, SIBLING TO
 * <article> — never nested inside it (page.tsx renders `<article>...
 * </article>` then `<GuideSideRail />`, both direct children of the grid
 * div). This matters beyond markup hygiene: the rail carries a
 * rel="nofollow sponsored" Amazon CTA, and nesting it inside <article> would
 * make the promo look like part of the article's own editorial content
 * rather than a separate rail surface.
 *
 * Composition top -> bottom:
 *   1. RailTOC            — compact numbered list (wraps <aside
 *                            aria-label="Table of contents">); the in-flow
 *                            GuideOnPageTOC hides at xl+ once this takes over
 *                            (see page.tsx).
 *   2. SeasonalPromoRail   — ONE text-led promo card (renders null when no
 *                            promo is active for this page).
 *   3. CrossCategoryPicks  — "Readers also shopping" thumbnail chips
 *                            (renders null when no pick resolves).
 *   4. Footer              — methodology chip -> /metrics/{slug}-score, only
 *                            when the guide actually has a methodology
 *                            (matches src/app/metrics/[slug]/page.tsx's own
 *                            scoreSlug() convention — no separate metrics
 *                            registry to query, unlike SHE/dormgear).
 *
 * position: sticky; top: 8rem; self-start. Below xl the whole rail is
 * `hidden` (CSS-hidden, not omitted — ships in SSR/DOM, just display:none) —
 * mobile/tablet get no visible or interactive change from this pilot.
 */

import Link from "next/link";
import { RailTOC, type RailTOCItem } from "@/components/rail/RailTOC";
import { SeasonalPromoRail } from "@/components/rail/SeasonalPromoRail";
import { CrossCategoryPicks } from "@/components/rail/CrossCategoryPicks";

export function GuideSideRail({
  tocItems,
  pageSlug,
  category,
  hasMethodology,
}: {
  tocItems: RailTOCItem[];
  pageSlug: string;
  category?: string | null;
  hasMethodology?: boolean;
}) {
  return (
    <div className="hidden xl:flex xl:flex-col xl:gap-6 xl:sticky xl:top-32 xl:self-start xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pb-4">
      <RailTOC items={tocItems} />
      <SeasonalPromoRail pageSlug={pageSlug} />
      <CrossCategoryPicks slug={pageSlug} category={category} />
      {hasMethodology && (
        <Link
          href={`/metrics/${pageSlug}-score`}
          className="inline-flex w-fit items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors"
          style={{ borderColor: "var(--color-cream-deep)", color: "var(--color-text-muted)" }}
        >
          How we scored this guide →
        </Link>
      )}
    </div>
  );
}
