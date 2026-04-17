import { ClientAffiliateCTA } from "@/components/ClientAffiliateCTA";

interface TierSummary {
  name: string;
  price: string;
  /** Pre-built Amazon affiliate URL — same URL passed to the matching ValueTierCard below */
  affiliateUrl: string;
  /** Amazon ASIN — optional, enriches GA4 affiliate_link_click events */
  asin?: string;
}

interface QuickVerdictProps {
  budget: TierSummary;
  sweetSpot: TierSummary;
  splurge: TierSummary;
}

type TierKey = "budget" | "sweet-spot" | "splurge";

interface TierBlockProps {
  tier: TierKey;
  label: string;
  overlineColor: string;
  cardIndex: number;
  contentSection: string;
  summary: TierSummary;
}

/**
 * Single tier column. Server-rendered; only the CTA is a client component.
 * Keeps the compact 3-column QuickVerdict layout from the original while
 * adding a subtle tracked affiliate link ("See on Amazon →") at the bottom.
 *
 * GA4 position: featured_strip (matches SHE's #1 earning position across the
 * network — the above-fold summary-block click-out).
 */
function TierBlock({
  label,
  overlineColor,
  cardIndex,
  contentSection,
  summary,
  tier,
}: TierBlockProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 10,
          color: overlineColor,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label} &middot; {summary.price}
      </div>
      <div
        style={{
          fontSize: 15,
          color: "var(--espresso)",
          fontWeight: 600,
          lineHeight: 1.3,
          marginBottom: 10,
        }}
      >
        {summary.name}
      </div>
      <ClientAffiliateCTA
        href={summary.affiliateUrl}
        productName={summary.name}
        linkPosition="featured_strip"
        ctaType="quick_verdict"
        cardIndex={cardIndex}
        contentSection={contentSection}
        asin={summary.asin}
        aria-label={`See ${summary.name} price on Amazon`}
        style={{
          fontSize: 12,
          color: "var(--tomato)",
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          textDecoration: "none",
          marginTop: "auto",
          letterSpacing: "0.02em",
        }}
      >
        See on Amazon &rarr;
      </ClientAffiliateCTA>
      {/* dev-only tier marker for screen readers / test hooks */}
      <span data-tier={tier} hidden />
    </div>
  );
}

export function QuickVerdict({ budget, sweetSpot, splurge }: QuickVerdictProps) {
  return (
    <div
      style={{
        background: "var(--ivory)",
        border: "1px solid var(--oat)",
        borderRadius: 14,
        padding: "24px 26px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--tomato)",
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        The quick verdict
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          fontFamily: "var(--font-body)",
          alignItems: "stretch",
        }}
      >
        <TierBlock
          tier="budget"
          label="Budget"
          overlineColor="var(--leaf)"
          cardIndex={0}
          contentSection="Budget"
          summary={budget}
        />
        <TierBlock
          tier="sweet-spot"
          label="Sweet Spot"
          overlineColor="var(--sage)"
          cardIndex={1}
          contentSection="Sweet Spot"
          summary={sweetSpot}
        />
        <TierBlock
          tier="splurge"
          label="Splurge"
          overlineColor="var(--honey)"
          cardIndex={2}
          contentSection="Splurge"
          summary={splurge}
        />
      </div>
    </div>
  );
}
