import Link from "next/link";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { appendGoParams } from "@/lib/affiliate-href";
import { B2S_RAIL } from "@/config/b2s-rail";

/**
 * SeasonalB2SRail — the back-to-school dorm-pet rail (2026 season, through
 * ~Labor Day). Config-driven per B2S-RAILS-STRATEGY.md: renders ONLY on the
 * judgment-set slugs in src/config/b2s-rail.ts, nothing anywhere else.
 *
 * Lane laws honored:
 *  - CTAs are internal /go/{ASIN} hrefs via AffiliateLink (rel="nofollow
 *    sponsored", interaction-gated redirect, DG-2 click integrity intact).
 *  - Each click carries st=rail_b2s_{key} (ascsubtag on the Amazon side) plus
 *    CLL position tags s={slug}&p=rail_b2s for per-rail revenue attribution.
 *  - No product images — pick-image parity untouched.
 *  - Colors are site tokens; CTA is white-on-navy (measured AA).
 */
export default function SeasonalB2SRail({ slug }: { slug: string }) {
  const entry = B2S_RAIL[slug];
  if (!entry) return null;

  const subtag = `rail_b2s_${entry.key}`;

  return (
    <aside
      aria-label={entry.heading}
      className="mb-16 rounded-lg border p-6 md:p-8"
      style={{
        backgroundColor: "var(--color-cream-deep)",
        borderColor: "var(--color-navy)",
        borderTopWidth: "4px",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: "var(--color-navy)" }}
      >
        Back to school 2026
      </p>
      <p
        className="font-serif text-xl md:text-2xl font-bold mb-3"
        style={{ color: "var(--color-navy)" }}
      >
        {entry.heading}
      </p>
      <p className="text-sm md:text-base mb-5 max-w-prose" style={{ color: "var(--color-text)" }}>
        {entry.intro}
      </p>
      <div className="space-y-4">
        {entry.cards.map((card) => (
          <div
            key={card.asin}
            className="rounded-md border p-4 md:p-5"
            style={{ backgroundColor: "var(--color-cream)", borderColor: "var(--color-cream-deep)" }}
          >
            <p className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>
              {card.name}
            </p>
            <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
              {card.note}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <AffiliateLink
                href={appendGoParams(`/go/${card.asin}?st=${subtag}`, slug, "rail_b2s")}
                productName={card.name}
                placement={subtag}
                className="inline-block text-sm font-semibold uppercase tracking-widest py-2.5 px-5 rounded"
                style={{ backgroundColor: "var(--color-navy)", color: "white" }}
              >
                {card.cta}
              </AffiliateLink>
              <Link
                href={`/guides/${card.fromGuide.slug}`}
                className="text-sm font-medium underline"
                style={{ color: "var(--color-navy)", textDecorationColor: "var(--color-coral)" }}
              >
                From our {card.fromGuide.title} guide
              </Link>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs mt-4" style={{ color: "var(--color-text-muted)" }}>
        A back-to-school note for the fall 2026 move-in season, through Labor Day. Product
        availability re-verified July 2026. As an Amazon Associate, PetPalHQ earns from qualifying
        purchases — prices don&rsquo;t change for the buyer, and rail placements never affect guide
        rankings.
      </p>
    </aside>
  );
}
