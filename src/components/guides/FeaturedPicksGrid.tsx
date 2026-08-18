import Link from "next/link";
import Image from "next/image";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { type GuidePick, slugifyHeading } from "@/lib/guides";
import { buildGoHref } from "@/lib/affiliate-href";
import PromoBadge from "@/components/guides/PromoBadge";
import RestockNotify from "@/components/guides/RestockNotify";

interface FeaturedPicksGridProps {
  picks?: GuidePick[];
  /** Required: the restock capture posts it back so the notify email can link
      the guide this pick lives on. */
  guideSlug: string;
  lastProductCheck?: string;
}

export default function FeaturedPicksGrid({ picks, guideSlug, lastProductCheck }: FeaturedPicksGridProps) {
  if (!picks?.length) return null;

  return (
    <section id="featured-picks" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6"
        style={{ color: "var(--color-navy)" }}
      >
        Our Picks
      </h2>
      {/* xl:grid-cols-2 (Rail v2, portfolio-parity): at xl+ (>=1280px) the
          guide page's article column narrows to minmax(0,768px) to make room
          for the sticky side rail — 3 columns there would squeeze cards to
          ~240px. 2 columns keeps cards readable; this only ever applies on
          the guide template, which is this component's one call site. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-6">
        {picks.map((pick) => {
          const anchor = slugifyHeading(pick.name);
          return (
            <article
              key={pick.rank}
              className="rounded-lg border bg-white overflow-hidden flex flex-col"
              style={{ borderColor: "var(--color-cream-deep)" }}
            >
              <div
                className="aspect-[4/3] relative"
                style={{ backgroundColor: "var(--color-cream-deep)" }}
              >
                {pick.image && (
                  <Image
                    src={pick.image}
                    alt={pick.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain p-4"
                  />
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                {pick.label && (
                  <span
                    className="self-start text-[10px] font-semibold uppercase tracking-widest mb-2 px-2 py-1 rounded"
                    style={{
                      backgroundColor: "var(--color-coral)",
                      color: "white",
                    }}
                  >
                    {pick.label}
                  </span>
                )}
                {pick.brand && (
                  <p
                    className="text-xs uppercase tracking-widest mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {pick.brand}
                  </p>
                )}
                <h3
                  className="font-serif text-lg font-bold mb-2 leading-tight"
                  style={{ color: "var(--color-navy)" }}
                >
                  {pick.name}
                </h3>
                {pick.score > 0 && (
                  <p
                    className="text-sm font-semibold mb-3"
                    style={{ color: "var(--color-teal)" }}
                  >
                    {pick.score.toFixed(1)} / 10
                  </p>
                )}
                {pick.keyFeatures.length > 0 && (
                  <ul
                    className="text-sm space-y-1 mb-4"
                    style={{ color: "var(--color-text)" }}
                  >
                    {pick.keyFeatures.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex">
                        <span
                          className="mr-2"
                          style={{ color: "var(--color-teal)" }}
                          aria-hidden="true"
                        >
                          •
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {pick.price && (
                  <p
                    className="text-sm font-semibold mb-3 mt-auto"
                    style={{ color: "var(--color-navy)" }}
                  >
                    {pick.price}
                  </p>
                )}
                <PromoBadge promo={pick.promo} className="mb-3" />
                <div className="flex flex-col gap-2">
                  {/* Owner ruling 2026-08-12: suppress or render clean, never label.
                      `available: false` on a pick with NO ASIN does not mean the
                      product is unavailable — it means we never had an Amazon
                      listing for it. Asserting "Currently unavailable on Amazon"
                      over a direct-sale product that is in stock at its vendor is
                      a false claim, and it is the labelling the suppression law
                      forbids. Only claim unavailability when an ASIN exists to be
                      unavailable.

                      Owner ruling 2026-08-18: that honest dead end now carries a
                      restock capture. RestockNotify RENDERS THE UNAVAILABILITY
                      HEADLINE ITSELF, so it replaces the label paragraph rather
                      than sitting under it — stacking the two prints the headline
                      twice. */}
                  {pick.available === false && pick.asin ? (
                    <RestockNotify
                      asin={pick.asin}
                      productName={pick.name}
                      guideSlug={guideSlug}
                      checkedOn={lastProductCheck}
                    />
                  ) : pick.available === false ? null : pick.asin ? (
                    <>
                      <AffiliateLink
                        href={buildGoHref(pick.asin, guideSlug, pick.rank)}
                        productName={pick.name}
                        placement="guide-featured-picks"
                        className="block w-full text-center text-sm font-semibold py-2 px-3 rounded transition-colors"
                        style={{
                          backgroundColor: "var(--color-coral)",
                          color: "white",
                        }}
                      >
                        Check price
                      </AffiliateLink>
                      {pick.guardDisclosure && (
                        <p
                          className="text-xs text-center"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {pick.guardDisclosure}
                        </p>
                      )}
                    </>
                  ) : (
                    <p
                      className="block w-full text-center text-sm font-semibold py-2 px-3 rounded"
                      style={{
                        backgroundColor: "var(--color-cream-deep)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Check Amazon for current price and availability
                    </p>
                  )}
                  {pick.reviewSlug && (
                    <Link
                      href={`/reviews/${pick.reviewSlug}`}
                      className="block w-full text-center text-sm font-semibold py-2 px-3 rounded border transition-colors"
                      style={{
                        borderColor: "var(--color-teal)",
                        color: "var(--color-teal)",
                      }}
                    >
                      Read Review
                    </Link>
                  )}
                  <a
                    href={`#${anchor}`}
                    className="block w-full text-center text-xs py-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Jump to deep dive ↓
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
