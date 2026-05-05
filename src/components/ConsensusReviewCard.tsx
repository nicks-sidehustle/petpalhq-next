import { type ConsensusReview, verdictToSlug } from "@/lib/content/consensus-data";
import { VerdictBadge } from "@/components/reviews/VerdictBadge";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { Check, X, Quote, Clock, Package, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ConsensusReviewCardProps {
  review: ConsensusReview;
  rank?: number;
  showExpertQuotes?: boolean;
  className?: string;
}

export function ConsensusReviewCard({
  review,
  rank,
  showExpertQuotes = true,
  className = "",
}: ConsensusReviewCardProps) {
  const topQuote = review.expertQuotes[0];

  return (
    <div className={`gift-card ${className}`}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Image + Score */}
        <div className="md:w-1/3 relative">
          {rank && (
            <span
              className="absolute -top-2 -left-1 z-10 w-10 h-10 flex items-center justify-center rounded-full text-lg font-bold"
              style={{
                fontFamily: "var(--font-heading)",
                background: "var(--color-antique-gold)",
                color: "var(--color-evergreen-deep)",
              }}
            >
              {rank}
            </span>
          )}
          <div className="aspect-[4/3] rounded-md overflow-hidden bg-[var(--color-parchment-dark)]">
            <img
              src={review.image}
              alt={review.productName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {/* Score circle below image on mobile, overlaid on desktop */}
          <div className="mt-3 flex items-center gap-3">
            <div
              className="score-circle"
              data-verdict={verdictToSlug(review.verdict)}
            >
              {review.petpalGearScore.toFixed(1)}
            </div>
            <div>
              <VerdictBadge verdict={review.verdict} size="sm" />
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                {review.sourcesCount} expert sources
              </p>
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div className="md:w-2/3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="editorial-tag mb-2">{review.category}</span>
              <h3 className="text-xl mt-2" style={{ fontFamily: "var(--font-heading)" }}>
                <Link href={`/reviews/${review.category.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}/${review.slug}`} className="hover:underline" style={{ color: "var(--color-evergreen)" }}>
                  {review.productName}
                </Link>
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <span
                className="tier-badge"
                data-tier={review.priceBand}
              >
                {review.priceBand === "premium" ? "Premium Selection" : review.priceBand === "recommended" ? "Editor's Pick" : "Practical Choice"}
              </span>
              <p className="text-lg font-bold mt-1" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                {review.priceRange}
              </p>
            </div>
          </div>

          {/* Best For tags */}
          {review.bestFor && review.bestFor.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {review.bestFor.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--color-parchment-dark)",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Expert Quote (featured) */}
          {showExpertQuotes && topQuote && (
            <blockquote className="border-l-2 pl-3 mb-4 text-sm italic" style={{ borderColor: "var(--color-antique-gold)", color: "var(--text-secondary)" }}>
              <Quote className="inline w-3 h-3 mr-1 opacity-40" />
              {topQuote.quote}
              <cite className="block mt-1 text-xs not-italic font-semibold" style={{ color: "var(--text-muted)" }}>
                — {topQuote.source}{topQuote.rating ? ` (${topQuote.rating}/10)` : ""}
              </cite>
            </blockquote>
          )}

          {/* Pros/Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-4">
            <div>
              {review.pros.slice(0, 3).map((pro) => (
                <p key={pro} className="flex items-start gap-1.5 text-sm mb-1.5">
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--color-evergreen)" }} />
                  <span style={{ color: "var(--text-secondary)" }}>{pro}</span>
                </p>
              ))}
            </div>
            <div>
              {review.cons.slice(0, 2).map((con) => (
                <p key={con} className="flex items-start gap-1.5 text-sm mb-1.5">
                  <X className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--color-cranberry)" }} />
                  <span style={{ color: "var(--text-secondary)" }}>{con}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-xs mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            {review.setupTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Setup: {review.setupTime}
              </span>
            )}
            {review.estimatedYears && (
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                ~{review.estimatedYears} years
              </span>
            )}
            {review.storageNote && (
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {review.storageNote}
              </span>
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <AffiliateLink
              href={review.affiliateLinks.amazon}
              productSlug={review.slug}
              productName={review.productName}
              retailer="amazon"
              placement="consensus_review_card"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-colors"
              style={{
                background: "var(--color-cranberry)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
              }}
            >
              Check Price on Amazon
              <ArrowRight className="w-4 h-4" />
            </AffiliateLink>
            <Link
              href={`/reviews/${review.category.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}/${review.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold border transition-colors"
              style={{
                borderColor: "rgba(26, 71, 38, 0.2)",
                color: "var(--color-evergreen)",
                fontFamily: "var(--font-sans)",
              }}
            >
              View Full Consensus
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
