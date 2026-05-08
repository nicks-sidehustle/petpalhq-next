import Link from "next/link";
import Image from "next/image";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { buildAmazonUrl, type GuidePick, slugifyHeading } from "@/lib/guides";
import PromoBadge from "@/components/guides/PromoBadge";

interface FeaturedPicksGridProps {
  picks?: GuidePick[];
}

export default function FeaturedPicksGrid({ picks }: FeaturedPicksGridProps) {
  if (!picks?.length) return null;

  return (
    <section id="featured-picks" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6"
        style={{ color: "var(--color-navy)" }}
      >
        Our Picks
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  {pick.asin && (
                    <AffiliateLink
                      href={buildAmazonUrl(pick.asin)}
                      productName={pick.name}
                      placement="guide-featured-picks"
                      className="block w-full text-center text-sm font-semibold py-2 px-3 rounded transition-colors"
                      style={{
                        backgroundColor: "var(--color-coral)",
                        color: "white",
                      }}
                    >
                      Check Today&apos;s Price
                    </AffiliateLink>
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
