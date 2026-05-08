import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllGuides, buildAmazonUrl, isPromoActive, type GuidePick } from "@/lib/guides";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import PromoBadge from "@/components/guides/PromoBadge";

export const metadata: Metadata = {
  title: "Active Pet Product Deals | PetPalHQ",
  description:
    "Verified pet product deals, coupon codes, and limited-time offers — curated weekly by the PetPalHQ editorial team.",
};

interface DealEntry {
  pick: GuidePick;
  guideTitle: string;
  guideSlug: string;
}

export default function DealsPage() {
  const guides = getAllGuides();

  const deals: DealEntry[] = [];
  for (const guide of guides) {
    if (!guide.picks) continue;
    for (const pick of guide.picks) {
      if (isPromoActive(pick.promo)) {
        deals.push({ pick, guideTitle: guide.title, guideSlug: guide.slug });
      }
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1
          className="font-serif text-3xl md:text-4xl font-bold mb-3"
          style={{ color: "var(--color-navy)" }}
        >
          Active Pet Product Deals
        </h1>
        <p className="text-base" style={{ color: "var(--color-text-muted)" }}>
          Verified deals and coupon codes from our editorial picks — checked weekly.
        </p>
      </div>

      {deals.length === 0 ? (
        <div
          className="text-center py-20 rounded-lg border"
          style={{
            borderColor: "var(--color-cream-deep)",
            backgroundColor: "var(--color-cream-deep)",
          }}
        >
          <p
            className="text-lg font-serif font-bold mb-2"
            style={{ color: "var(--color-navy)" }}
          >
            No active deals right now
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Deals are verified weekly — check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map(({ pick, guideTitle, guideSlug }) => (
            <article
              key={`${guideSlug}-${pick.rank}`}
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
                {pick.brand && (
                  <p
                    className="text-xs uppercase tracking-widest mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {pick.brand}
                  </p>
                )}
                <h2
                  className="font-serif text-lg font-bold mb-3 leading-tight"
                  style={{ color: "var(--color-navy)" }}
                >
                  {pick.name}
                </h2>

                <PromoBadge promo={pick.promo} className="mb-4 self-start" />

                {pick.price && (
                  <p
                    className="text-sm mb-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    From {pick.price}
                  </p>
                )}

                <p className="text-xs mb-4 mt-auto" style={{ color: "var(--color-text-muted)" }}>
                  From{" "}
                  <Link
                    href={`/guides/${guideSlug}`}
                    className="underline hover:opacity-80"
                    style={{ color: "var(--color-teal)" }}
                  >
                    {guideTitle}
                  </Link>
                </p>

                <div className="flex flex-col gap-2">
                  {pick.asin && (
                    <AffiliateLink
                      href={buildAmazonUrl(pick.asin)}
                      productName={pick.name}
                      placement="deals-page"
                      className="block w-full text-center text-sm font-semibold py-2 px-3 rounded transition-colors"
                      style={{
                        backgroundColor: "var(--color-coral)",
                        color: "white",
                      }}
                    >
                      Shop on Amazon
                    </AffiliateLink>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
