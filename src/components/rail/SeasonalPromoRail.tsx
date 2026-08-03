/**
 * SeasonalPromoRail — SERVER component.
 *
 * Ported from SmartHomeExplorer/DormGearHQ's grid side-rail pilot ("Rail
 * v2"): a single dominant promo card in the xl+ sticky rail. Renders null
 * when getRailPromo() resolves nothing (env kill-switch off, holdout, or no
 * B2S_RAIL entry for this page — see src/lib/content/rail-promo.ts for the
 * full gating chain and the honesty rationale for reusing PetPalHQ's existing
 * back-to-school judgment set instead of a new product pool).
 *
 * ADAPTATION vs SHE/dormgear: those cards are image-led (a live consensus-
 * data product photo). B2S_RAIL's cards are deliberately image-free (see
 * src/config/b2s-rail.ts's docstring — "Cards carry no images, so pick-image
 * parity is untouched"), a pre-existing PetPalHQ design decision this port
 * does not override. The card is text-led instead: eyebrow, the B2S_RAIL
 * entry's own `heading` (the cross-species justification — e.g. why a betta
 * tank pick is relevant on a hamster-habitat guide), product name, note,
 * a "From our {fromGuide} guide" backlink (mirrors SeasonalB2SRail.tsx's own
 * pattern so a reader can trace the pick to its source review), optional
 * "Prices checked" freshness line, a one-line proximate affiliate disclosure,
 * then the CTA.
 *
 * `data-seasonal-promo="rail"` is the marker SurfaceImpressionTracker
 * (src/lib/analytics/surface-impression.ts) locates via querySelector.
 *
 * ATTRIBUTION: uses position "rail_v2" (distinct from SeasonalB2SRail's
 * "rail_b2s") — see rail-promo.ts's subtag docstring for why the two
 * surfaces must never share a tracking identity.
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
        Back to school 2026
      </p>
      <p className="text-xs font-medium mb-2 leading-snug" style={{ color: "var(--color-navy)" }}>
        {promo.heading}
      </p>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>
        {promo.productName}
      </p>
      <p className="text-xs mb-2 leading-snug" style={{ color: "var(--color-text-muted)" }}>
        {promo.note}
      </p>
      <Link
        href={`/guides/${promo.fromGuideSlug}`}
        className="text-xs font-medium underline block mb-3"
        style={{ color: "var(--color-navy)", textDecorationColor: "var(--color-coral)" }}
      >
        From our {promo.fromGuideTitle} guide
      </Link>
      {promo.pricesCheckedDate && (
        <p className="text-[10px] mb-2" style={{ color: "var(--color-text-muted)" }}>
          Prices checked{" "}
          {new Date(promo.pricesCheckedDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          })}
        </p>
      )}
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
