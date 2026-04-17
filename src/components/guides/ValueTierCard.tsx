import { ClientAffiliateCTA } from "@/components/ClientAffiliateCTA";

type Tier = "budget" | "sweet-spot" | "splurge";

const TIER_CARD_INDEX: Record<Tier, number> = {
  budget: 0,
  "sweet-spot": 1,
  splurge: 2,
};

interface ValueTierCardProps {
  tier: Tier;
  product: {
    name: string;
    subtitle: string;
    price: string;
    /** HTML string from our own markdown content — safe to render */
    description: string;
    tradeOff: string;
    tradeOffLabel?: string;
    affiliateUrl: string;
    /** Amazon ASIN — optional, improves GA4 ecommerce correlation when present */
    asin?: string;
  };
}

const tierConfig: Record<
  Tier,
  {
    label: string;
    range: string;
    color: string;
    borderStyle: React.CSSProperties;
    badge?: boolean;
  }
> = {
  budget: {
    label: "Best for the Money",
    range: "Under $30",
    color: "var(--leaf)",
    borderStyle: {
      border: "1px solid var(--oat)",
      borderLeft: "4px solid var(--leaf)",
    },
  },
  "sweet-spot": {
    label: "Our Favorite \u00B7 The Sweet Spot",
    range: "$30\u2013$75",
    color: "var(--sage)",
    borderStyle: {
      border: "2px solid var(--sage)",
    },
    badge: true,
  },
  splurge: {
    label: "Worth the Splurge",
    range: "$75+",
    color: "var(--honey)",
    borderStyle: {
      border: "1px solid var(--oat)",
      borderLeft: "4px solid var(--honey)",
    },
  },
};

export function ValueTierCard({ tier, product }: ValueTierCardProps) {
  const config = tierConfig[tier];
  const tradeOffLabel =
    product.tradeOffLabel ||
    (tier === "splurge" ? "Skip it unless" : "The honest trade-off");

  return (
    <section style={{ marginBottom: 48 }}>
      {/* Tier overline */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: config.color,
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        {config.label} &middot; {config.range}
      </div>

      {/* Card */}
      <div
        style={{
          background: "#FFFFFF",
          ...config.borderStyle,
          borderRadius: 14,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* "Our favorite" badge for sweet-spot */}
        {config.badge && (
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              padding: "5px 14px",
              background: "var(--sage)",
              color: "var(--cream)",
              borderRadius: 6,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              zIndex: 1,
            }}
          >
            Our favorite
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "26px 28px" }}>
          {/* Header row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 28,
                  fontWeight: 500,
                  color: "var(--espresso)",
                  margin: "0 0 4px",
                  letterSpacing: "-0.01em",
                  fontFamily: "var(--font-display)",
                }}
              >
                {product.name}
              </h3>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--driftwood)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {product.subtitle}
              </div>
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: "var(--font-body)",
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: "var(--espresso)",
                }}
              >
                {product.price}
              </div>
              <div style={{ fontSize: 12, color: "var(--driftwood)" }}>
                at Amazon
              </div>
            </div>
          </div>

          {/* Description — content from our own authored markdown, not user input */}
          <div
            style={{
              fontSize: 16,
              color: "var(--walnut)",
              lineHeight: 1.75,
              marginBottom: 20,
              fontFamily: "var(--font-body)",
            }}
            dangerouslySetInnerHTML={{ __html: product.description }}
          />

          {/* Trade-off callout */}
          <div
            style={{
              padding: "14px 18px",
              background: "var(--ivory)",
              borderRadius: 10,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--tomato)",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
                fontFamily: "var(--font-body)",
              }}
            >
              {tradeOffLabel}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--walnut)",
                lineHeight: 1.6,
                fontFamily: "var(--font-body)",
              }}
            >
              {product.tradeOff}
            </div>
          </div>

          {/* CTA — tracked via ClientAffiliateCTA: fires one GA4
              affiliate_link_click event and injects a dynamic ascsubtag
              (lf_{slug}_guide_content_{MMYY}) into the outbound Amazon URL. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <ClientAffiliateCTA
              href={product.affiliateUrl}
              productName={product.name}
              linkPosition="guide_content"
              ctaType="tier_card"
              cardIndex={TIER_CARD_INDEX[tier]}
              contentSection={config.label}
              asin={product.asin}
              aria-label={`See ${product.name} price on Amazon`}
              style={{
                padding: "12px 24px",
                background: "var(--tomato)",
                color: "var(--cream)",
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              See price on Amazon
            </ClientAffiliateCTA>
            <span
              style={{
                fontSize: 12,
                color: "var(--driftwood)",
                fontFamily: "var(--font-body)",
              }}
            >
              Affiliate link &middot; we earn if you buy
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
