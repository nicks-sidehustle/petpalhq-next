import Link from "next/link";
import Image from "next/image";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { type GuidePick, slugifyHeading } from "@/lib/guides";
import { buildGoHref } from "@/lib/affiliate-href";
import PromoBadge from "@/components/guides/PromoBadge";

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
                    /* Class STRING, not a template — the working-card branch
                       must emit byte-identical markup (owner rule 5). */
                    className={
                      pick.priceSourceChip || pick.priceDisclosure
                        ? "text-sm font-semibold mb-1 mt-auto"
                        : "text-sm font-semibold mb-3 mt-auto"
                    }
                    style={{ color: "var(--color-navy)" }}
                  >
                    {pick.price}
                  </p>
                )}
                {/* OWNER EMERGENCY RULING 2026-09-07 — DARK-CARD FIGURE.
                    A pick the availability gates would have removed keeps its
                    card and its link, and prints a DATED, SOURCED figure
                    instead of nothing: the maker's list price, or the last
                    Amazon price we read. Both lines come from
                    resolveDarkCardFigure() (src/lib/dark-card.ts) via
                    parsePicks — never from guide prose, so neither can rot into
                    a false claim. The chip carries the source and the date
                    (rule 4: every figure has a source); the disclosure carries
                    the caveat the ruling requires beside a non-live figure. */}
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
                <div className="flex flex-col gap-2">
                  {/* BUY PATH FLOOR — owner, 2026-09-09 ~8:40am PT: "We always
                      want products on guides and review pages to have either a
                      direct link or a direct search results link." Every card,
                      in every state, carries a cookie-setting link, so this
                      branch turns on ONE thing: does the pick name something to
                      send the click at.

                      What used to sit here instead: `available === false` and
                      an absent ASIN each rendered a card with no link at all —
                      a card nobody can click sets no cookie, and the click is
                      the whole revenue mechanism. `pick.buyPathId` (guides.ts)
                      resolves an ASIN to its exact /dp/ page and an ASIN-less
                      pick to an Amazon search-results page for its own brand +
                      name, which is the bridge until the slot is filled by a
                      replacement (§8qq rule 3). Working cards are byte-identical:
                      for a pick with an `asin`, buyPathId IS that asin. */}
                  {pick.buyPathId ? (
                    <>
                      <AffiliateLink
                        href={buildGoHref(pick.buyPathId, guideSlug, pick.rank)}
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
                      {/* Owner ruling 2026-08-18 — lead-time policy. An
                          Amazon-sold delayed-shipment pick renders as a normal
                          pick, and this line is what the ruling charges for
                          that: the reader learns the order ships later BEFORE
                          clicking, not after. Text comes from the price snapshot
                          (price-cache.ts), never from guide prose, so it cannot
                          rot into a false ship claim — and since the owner's
                          2026-09-08 ruling it carries no availability
                          vocabulary. */}
                      {pick.backorderDisclosure && (
                        <p
                          className="text-xs text-center"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {pick.backorderDisclosure}
                        </p>
                      )}
                      {pick.guardDisclosure && (
                        <p
                          className="text-xs text-center"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {pick.guardDisclosure}
                        </p>
                      )}
                    </>
                  ) : null}
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
