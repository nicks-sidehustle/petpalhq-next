/**
 * SeasonalPromoRail — SERVER component.
 *
 * Ported from SmartHomeExplorer/DormGearHQ's grid side-rail pilot ("Rail
 * v2"): a single dominant promo card in the xl+ sticky rail. Renders null
 * when getRailPromo() resolves nothing (env kill-switch off, no season window
 * open at build time, holdout, no map entry, or the mapped pick is no longer
 * eligible — see src/lib/content/rail-promo.ts and src/config/seasonal-rail.ts).
 *
 * The card is text-led and image-free: season eyebrow (e.g. "Black Friday
 * week"), product name, note (the pick's own verdict sentence, verbatim), a
 * "From our {fromGuide} guide" backlink to the pick's deep dive so a reader
 * can trace the pick to its source review, the CTA, then a one-line proximate
 * affiliate disclosure. Owner 2026-11-19: no price figure, no deal / % off /
 * save / cheapest claim and no availability language — so no "Prices checked"
 * line either (the source guide's lastProductCheck is a content stamp, not a
 * price read). scripts/test/seasonal-rail-card.test.ts gates the built HTML.
 *
 * `data-seasonal-promo="rail"` is the marker SurfaceImpressionTracker
 * (src/lib/analytics/surface-impression.ts) locates via querySelector.
 *
 * ATTRIBUTION: position "rail_v2" + subtag `rail_v2_<season key>` (distinct
 * from SeasonalB2SRail's "rail_b2s") — see rail-promo.ts.
 */

import Link from "next/link";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { appendGoParams } from "@/lib/affiliate-href";
import { getRailPromo } from "@/lib/content/rail-promo";
import { SurfaceImpressionTracker } from "@/lib/analytics/surface-impression";

export function SeasonalPromoRail({ pageSlug }: { pageSlug: string }) {
  const promo = getRailPromo(pageSlug);
  if (!promo) return null;

  const href = appendGoParams(`/go/${promo.asin}?st=${promo.subtag}`, pageSlug, "rail_v2");

  return (
    <aside
      data-seasonal-promo="rail"
      aria-label="Recommended pick"
      className="w-full rounded-lg border p-4 shadow-sm"
      style={{
        backgroundColor: "var(--color-cream-deep)",
        borderColor: "var(--color-navy)",
        borderTopWidth: "4px",
      }}
    >
      <SurfaceImpressionTracker surface="rail" />
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: "var(--color-navy)" }}
      >
        {promo.label}
      </p>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>
        {promo.productName}
      </p>
      <p className="text-xs mb-2 leading-snug" style={{ color: "var(--color-text-muted)" }}>
        {promo.note}
      </p>
      <Link
        href={`/guides/${promo.fromGuideSlug}#${promo.fromGuideAnchor}`}
        className="text-xs font-medium underline block mb-3"
        style={{ color: "var(--color-navy)", textDecorationColor: "var(--color-coral)" }}
      >
        From our {promo.fromGuideTitle} guide
      </Link>
      <AffiliateLink
        href={href}
        productName={promo.productName}
        placement={promo.subtag}
        className="block w-full text-center text-xs font-semibold uppercase tracking-widest py-2 px-3 rounded"
        style={{ backgroundColor: "var(--color-navy)", color: "white" }}
      >
        {promo.cta}
      </AffiliateLink>
      <p className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
        Affiliate link — we may earn a commission.
      </p>
    </aside>
  );
}
