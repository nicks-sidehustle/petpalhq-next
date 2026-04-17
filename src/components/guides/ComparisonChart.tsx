import { ClientAffiliateCTA } from "@/components/ClientAffiliateCTA";

/**
 * ComparisonChart — mid-guide compare-at-a-glance table for the three-tier
 * framework. Readers hit this after reading all three ValueTierCards, when
 * they're weighing Budget vs. Sweet Spot vs. Splurge against each other.
 *
 * GA4 position: comparison_chart. On SHE this is the #3 earning position —
 * captures readers who've decided they want to buy but haven't picked a tier.
 *
 * Unlike SHE's ComparisonChart (which handles N products with ecosystem
 * badges, energy savings, etc.), L&F's is always exactly 3 columns matching
 * the tier framework — no parsing, no guesswork.
 */

interface TierRow {
  name: string;
  price: string;
  subtitle: string;
  tradeOff: string;
  affiliateUrl: string;
  asin?: string;
}

interface ComparisonChartProps {
  budget: TierRow;
  sweetSpot: TierRow;
  splurge: TierRow;
}

type TierKey = "budget" | "sweet-spot" | "splurge";

const TIER_META: Record<
  TierKey,
  {
    label: string;
    range: string;
    color: string;
    cardIndex: number;
    contentSection: string;
  }
> = {
  budget: {
    label: "Best for the Money",
    range: "Under $30",
    color: "var(--leaf)",
    cardIndex: 0,
    contentSection: "Budget",
  },
  "sweet-spot": {
    label: "Our Favorite",
    range: "$30\u2013$75",
    color: "var(--sage)",
    cardIndex: 1,
    contentSection: "Sweet Spot",
  },
  splurge: {
    label: "Worth the Splurge",
    range: "$75+",
    color: "var(--honey)",
    cardIndex: 2,
    contentSection: "Splurge",
  },
};

const ROW_LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--driftwood)",
  fontWeight: 700,
  fontFamily: "var(--font-body)",
  padding: "14px 16px",
  borderBottom: "1px solid var(--oat)",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const CELL_BASE_STYLE: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid var(--oat)",
  borderLeft: "1px solid var(--oat)",
  verticalAlign: "top",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  color: "var(--walnut)",
  lineHeight: 1.5,
};

function TierColumnHeader({ tier, data }: { tier: TierKey; data: TierRow }) {
  const meta = TIER_META[tier];
  return (
    <th
      scope="col"
      style={{
        ...CELL_BASE_STYLE,
        background: "var(--ivory)",
        borderTop: `3px solid ${meta.color}`,
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: meta.color,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {meta.label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--driftwood)",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {meta.range}
      </div>
      <div
        style={{
          fontSize: 16,
          color: "var(--espresso)",
          fontWeight: 600,
          lineHeight: 1.25,
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.01em",
        }}
      >
        {data.name}
      </div>
    </th>
  );
}

function TierCtaCell({ tier, data }: { tier: TierKey; data: TierRow }) {
  const meta = TIER_META[tier];
  return (
    <td style={{ ...CELL_BASE_STYLE, textAlign: "left" }}>
      <ClientAffiliateCTA
        href={data.affiliateUrl}
        productName={data.name}
        linkPosition="comparison_chart"
        ctaType="compare_row"
        cardIndex={meta.cardIndex}
        contentSection={meta.contentSection}
        asin={data.asin}
        aria-label={`See ${data.name} price on Amazon`}
        style={{
          display: "inline-block",
          padding: "9px 14px",
          background: "var(--tomato)",
          color: "var(--cream)",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        See on Amazon
      </ClientAffiliateCTA>
    </td>
  );
}

export function ComparisonChart({
  budget,
  sweetSpot,
  splurge,
}: ComparisonChartProps) {
  const tiers: Array<{ key: TierKey; data: TierRow }> = [
    { key: "budget", data: budget },
    { key: "sweet-spot", data: sweetSpot },
    { key: "splurge", data: splurge },
  ];

  return (
    <section
      data-section="comparison"
      style={{
        marginTop: 48,
        marginBottom: 48,
      }}
    >
      <h2
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: "var(--espresso)",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
          fontFamily: "var(--font-display)",
        }}
      >
        Compare at a glance
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--driftwood)",
          fontFamily: "var(--font-body)",
          margin: "0 0 20px",
        }}
      >
        The three picks side-by-side. Each one has a real trade-off &mdash; no
        perfect choice, just the right fit for your priorities.
      </p>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--oat)",
          borderRadius: 14,
          background: "#FFFFFF",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-body)",
            minWidth: 600,
          }}
        >
          <thead>
            <tr>
              {/* Empty corner cell to align with row labels */}
              <th
                scope="col"
                style={{
                  ...CELL_BASE_STYLE,
                  background: "var(--ivory)",
                  borderLeft: "none",
                  width: 110,
                }}
                aria-hidden="true"
              />
              {tiers.map(({ key, data }) => (
                <TierColumnHeader key={key} tier={key} data={data} />
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price row */}
            <tr>
              <th scope="row" style={ROW_LABEL_STYLE}>
                Price
              </th>
              {tiers.map(({ key, data }) => (
                <td
                  key={key}
                  style={{
                    ...CELL_BASE_STYLE,
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--tomato)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {data.price}
                </td>
              ))}
            </tr>

            {/* Best for row */}
            <tr>
              <th scope="row" style={ROW_LABEL_STYLE}>
                Best for
              </th>
              {tiers.map(({ key, data }) => (
                <td key={key} style={CELL_BASE_STYLE}>
                  {data.subtitle}
                </td>
              ))}
            </tr>

            {/* Trade-off row */}
            <tr>
              <th scope="row" style={ROW_LABEL_STYLE}>
                Trade-off
              </th>
              {tiers.map(({ key, data }) => (
                <td key={key} style={CELL_BASE_STYLE}>
                  {data.tradeOff}
                </td>
              ))}
            </tr>

            {/* CTA row */}
            <tr>
              <th
                scope="row"
                style={{ ...ROW_LABEL_STYLE, borderBottom: "none" }}
              >
                Where to buy
              </th>
              {tiers.map(({ key, data }) => (
                <TierCtaCell key={key} tier={key} data={data} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
