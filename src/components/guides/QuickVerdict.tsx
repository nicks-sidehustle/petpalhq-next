interface TierSummary {
  name: string;
  price: string;
}

interface QuickVerdictProps {
  budget: TierSummary;
  sweetSpot: TierSummary;
  splurge: TierSummary;
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
          gap: 12,
          fontFamily: "var(--font-body)",
        }}
      >
        {/* Budget */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--leaf)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Budget &middot; {budget.price}
          </div>
          <div
            style={{
              fontSize: 15,
              color: "var(--espresso)",
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {budget.name}
          </div>
        </div>

        {/* Sweet Spot */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--sage)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Sweet Spot &middot; {sweetSpot.price}
          </div>
          <div
            style={{
              fontSize: 15,
              color: "var(--espresso)",
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {sweetSpot.name}
          </div>
        </div>

        {/* Splurge */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--honey)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Splurge &middot; {splurge.price}
          </div>
          <div
            style={{
              fontSize: 15,
              color: "var(--espresso)",
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {splurge.name}
          </div>
        </div>
      </div>
    </div>
  );
}
