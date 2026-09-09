import Image from "next/image";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { type GuidePick, slugifyHeading } from "@/lib/guides";
import { buildGoHref } from "@/lib/affiliate-href";
import PickOwnerVoice from "@/components/guides/PickOwnerVoice";
import PromoBadge from "@/components/guides/PromoBadge";
import PickShareBar from "@/components/guides/PickShareBar";
import PickAuthoritySources from "@/components/guides/PickAuthoritySources";

interface PickDeepDiveProps {
  pick: GuidePick;
  guideSlug: string;
  lastProductCheck?: string;
}

export default function PickDeepDive({ pick, guideSlug, lastProductCheck }: PickDeepDiveProps) {
  const anchor = slugifyHeading(pick.name);
  // pick.bodyHtml is rendered from first-party MDX in src/content/guides via marked() — trusted.

  return (
    <section
      id={anchor}
      className="pick-card mb-16 scroll-mt-24 pt-8 border-t"
      style={{ borderColor: "var(--color-cream-deep)" }}
      aria-labelledby={`${anchor}-heading`}
    >
      <div className="flex flex-wrap items-baseline gap-3 mb-4">
        <span
          className="font-serif text-3xl md:text-4xl font-bold"
          style={{ color: "var(--color-coral)" }}
        >
          {pick.score > 0 ? pick.score.toFixed(1) : ""}
          {pick.score > 0 && (
            <span className="text-xl" style={{ color: "var(--color-text-muted)" }}>
              /10
            </span>
          )}
        </span>
        {pick.label && (
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-teal)" }}
          >
            · {pick.label}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-6">
        <h2
          id={`${anchor}-heading`}
          className="font-serif text-2xl md:text-3xl font-bold leading-tight"
          style={{ color: "var(--color-navy)" }}
        >
          {pick.brand && <span style={{ color: "var(--color-text-muted)" }}>{pick.brand} </span>}
          {pick.name}
        </h2>
        <PickShareBar
          guideSlug={guideSlug}
          pickAnchor={anchor}
          productName={pick.name}
        />
      </div>

      <div className={`grid grid-cols-1 ${pick.image ? "md:grid-cols-3" : ""} gap-6 mb-8`}>
        {pick.image && (
          <div
            className="md:col-span-1 rounded-lg overflow-hidden"
            style={{ backgroundColor: "var(--color-cream-deep)" }}
          >
            <div className="aspect-square relative">
              <Image
                src={pick.image}
                alt={pick.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain p-6"
              />
            </div>
          </div>
        )}

        <div className={pick.image ? "md:col-span-2" : ""}>
          {pick.price && (
            <p
              /* Class STRING, not a template — the working-card branch must
                 emit byte-identical markup (owner rule 5, "only the dark
                 cards"). */
              className={
                pick.priceSourceChip || pick.priceDisclosure
                  ? "text-2xl font-bold mb-1"
                  : "text-2xl font-bold mb-3"
              }
              style={{ color: "var(--color-navy)" }}
            >
              {pick.price}
            </p>
          )}
          {/* OWNER EMERGENCY RULING 2026-09-07 — DARK-CARD FIGURE. Same two
              lines the pick card renders, from the same resolved fields
              (src/lib/dark-card.ts): the ruling's caveat, and the source +
              date the figure came from. One price story on every surface. */}
          {pick.priceDisclosure && (
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
              {pick.priceDisclosure}
            </p>
          )}
          {pick.priceSourceChip && (
            <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
              {pick.priceSourceChip}
            </p>
          )}
          <PromoBadge promo={pick.promo} className="mb-3" />
          {pick.keyFeatures.length > 0 && (
            <ul
              className="space-y-1.5 mb-5 text-sm"
              style={{ color: "var(--color-text)" }}
            >
              {pick.keyFeatures.map((f, i) => (
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
          {/* BUY PATH FLOOR — owner, 2026-09-09 ~8:40am PT. The deep dive is a
              card surface: it carries the product's name, its figure and its
              CTA, so it obeys the same floor. An `available: false` pick and an
              ASIN-less pick each used to render a deep dive with no link at
              all; both now link through the pick's `buyPathId` — the exact /dp/
              page when an ASIN exists, an Amazon search-results page when none
              does. Byte-identical for a pick with an `asin`. */}
          {pick.buyPathId && (
              <>
                <AffiliateLink
                  href={buildGoHref(pick.buyPathId, guideSlug, pick.rank)}
                  productName={pick.name}
                  placement="guide-deep-dive"
                  className="inline-block text-sm font-semibold uppercase tracking-widest py-3 px-6 rounded"
                  style={{
                    backgroundColor: "var(--color-coral)",
                    color: "white",
                  }}
                >
                  Check price
                </AffiliateLink>
                {/* Owner ruling 2026-08-18 — lead-time policy. See the matching
                    block in FeaturedPicksGrid: an Amazon-sold delayed-shipment
                    pick renders as a normal pick and owes the reader this line
                    beside its CTA. Snapshot-sourced, so it never rots into a
                    false ship claim, and since the owner's 2026-09-08 ruling it
                    carries no availability vocabulary. */}
                {pick.backorderDisclosure && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {pick.backorderDisclosure}
                  </p>
                )}
                {pick.guardDisclosure && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {pick.guardDisclosure}
                  </p>
                )}
              </>
          )}
        </div>
      </div>

      {pick.bodyHtml && (
        <div
          className="prose mb-8"
          dangerouslySetInnerHTML={{ __html: pick.bodyHtml }}
        />
      )}

      {(pick.pros.length > 0 || pick.cons.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {pick.pros.length > 0 && (
            <div
              className="p-5 rounded-lg border"
              style={{
                borderColor: "var(--color-cream-deep)",
                backgroundColor: "var(--color-cream-deep)",
              }}
            >
              <h3
                className="font-serif font-bold mb-3 text-base"
                style={{ color: "var(--color-navy)" }}
              >
                What We Love
              </h3>
              <ul className="space-y-1.5 text-sm" style={{ color: "var(--color-text)" }}>
                {pick.pros.map((p, i) => (
                  <li key={i} className="flex">
                    <span
                      className="mr-2 font-bold"
                      style={{ color: "var(--color-green)" }}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pick.cons.length > 0 && (
            <div
              className="p-5 rounded-lg border"
              style={{ borderColor: "var(--color-cream-deep)" }}
            >
              <h3
                className="font-serif font-bold mb-3 text-base"
                style={{ color: "var(--color-navy)" }}
              >
                What Could Be Better
              </h3>
              <ul className="space-y-1.5 text-sm" style={{ color: "var(--color-text)" }}>
                {pick.cons.map((c, i) => (
                  <li key={i} className="flex">
                    <span
                      className="mr-2 font-bold"
                      style={{ color: "var(--color-coral)" }}
                      aria-hidden="true"
                    >
                      –
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {pick.ownerVoice && pick.ownerVoice.length > 0 && (
        <PickOwnerVoice quotes={pick.ownerVoice} />
      )}

      {pick.verdict && (
        <div
          className="p-5 rounded-lg border-l-4"
          style={{
            backgroundColor: "var(--color-cream-deep)",
            borderLeftColor: "var(--color-teal)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--color-teal)" }}
          >
            The Verdict
          </p>
          {pick.verdictHtml ? (
            <p
              className="text-base leading-relaxed affiliate-prose"
              style={{ color: "var(--color-text)" }}
              dangerouslySetInnerHTML={{ __html: pick.verdictHtml }}
            />
          ) : (
            <p className="text-base leading-relaxed" style={{ color: "var(--color-text)" }}>
              {pick.verdict}
            </p>
          )}
        </div>
      )}

      <PickAuthoritySources sources={pick.authoritySources} />
    </section>
  );
}
