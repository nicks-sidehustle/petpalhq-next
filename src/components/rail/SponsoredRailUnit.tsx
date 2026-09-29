/**
 * SponsoredRailUnit — SERVER component (owner 2026-09-29).
 *
 * Amazon Creator Connections (Sponsored Products for Creators) campaign
 * products in the guide side rail. GUIDE PAGES ONLY. Separate from the guide's
 * editorial picks: it reads data/sponsored-rail.json (via
 * src/lib/content/sponsored-rail.ts), never the guide's pick/price data, and
 * never shows one of the guide's own pick ASINs.
 *
 * Rules this unit holds (see scripts/test/sponsored-rail.test.tsx):
 *  - Visible "Sponsored" label on the unit (FTC; Creator Connections guide
 *    allows "Sponsored", "Advertisement" or "Ad").
 *  - NO price, NO availability words, NO ratings/review counts, NO
 *    "best"/ranking claims. Image + short name + "See it on Amazon" only.
 *  - Links are internal /go/{ASIN} through AffiliateLink (interaction-gated
 *    redirect, existing tag handling, rel="nofollow sponsored noopener
 *    noreferrer", affiliate_link_click telemetry), tagged
 *    st=rail_sponsored_cc + CLL s={slug}&p=rail_sponsored_cc so sponsored
 *    clicks stay separable from editorial placements.
 *  - No schema: plain markup only, no Product/Offer JSON-LD or microdata.
 *  - Renders null when no campaign matches the guide's animal.
 *  - Plain <img> of the Creators API image URL, served straight from Amazon's
 *    media host (not proxied through next/image), so the unit also renders in
 *    the react-dom/server gate. The rail is xl+ only and the image is 56px.
 */

import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { appendGoParams } from "@/lib/affiliate-href";
import {
  guideAnimals,
  selectSponsoredRailProducts,
  SPONSORED_RAIL_PLACEMENT,
  type SponsoredRailProduct,
} from "@/lib/content/sponsored-rail";

export function SponsoredRailUnit({
  slug,
  species,
  category,
  excludeAsins,
  products,
}: {
  slug: string;
  species?: readonly string[] | null;
  category?: string | null;
  /** The guide's own pick ASINs — never shown in the sponsored unit. */
  excludeAsins?: readonly string[];
  /** Test seam; defaults to data/sponsored-rail.json. */
  products?: readonly SponsoredRailProduct[];
}) {
  const items = selectSponsoredRailProducts(
    { slug, animals: guideAnimals(species, category), excludeAsins },
    products,
  );
  if (items.length === 0) return null;

  return (
    <aside
      aria-label="Sponsored products"
      data-sponsored-unit="creator-connections"
      className="w-full rounded-lg border p-3 shadow-sm"
      style={{ borderColor: "var(--color-cream-deep)", backgroundColor: "var(--color-cream)" }}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: "var(--color-navy)", color: "#ffffff" }}
        >
          Sponsored
        </span>
        <span className="text-[10px] leading-tight text-right" style={{ color: "var(--color-text-muted)" }}>
          Not part of our picks
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((p) => (
          <li key={p.asin} className="flex items-center gap-2.5">
            <img
              src={p.image}
              alt={p.name}
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              className="h-14 w-14 flex-shrink-0 rounded object-contain p-1"
              style={{ backgroundColor: "#ffffff" }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="text-[12px] font-medium leading-snug line-clamp-2 mb-1"
                style={{ color: "var(--color-text)" }}
              >
                {p.name}
              </p>
              <AffiliateLink
                href={appendGoParams(
                  `/go/${p.asin}?st=${SPONSORED_RAIL_PLACEMENT}`,
                  slug,
                  SPONSORED_RAIL_PLACEMENT,
                )}
                productName={p.name}
                placement={SPONSORED_RAIL_PLACEMENT}
                className="text-[11px] font-semibold underline underline-offset-2"
                style={{ color: "var(--color-navy)" }}
              >
                See it on Amazon
              </AffiliateLink>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[10px] leading-snug" style={{ color: "var(--color-text-muted)" }}>
        Brand-sponsored Amazon campaign. As an Amazon Associate, PetPalHQ earns from qualifying purchases.
      </p>
    </aside>
  );
}
