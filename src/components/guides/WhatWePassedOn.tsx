interface PassedProduct {
  name: string;
  reason: string;
}

interface WhatWePassedOnProps {
  products: PassedProduct[];
}

export function WhatWePassedOn({ products }: WhatWePassedOnProps) {
  if (products.length === 0) return null;

  return (
    <section style={{ marginBottom: 48 }}>
      <h2
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: "var(--espresso)",
          margin: "0 0 18px",
          letterSpacing: "-0.01em",
          fontFamily: "var(--font-display)",
        }}
      >
        What we passed on
      </h2>
      <p
        style={{
          fontSize: 16,
          color: "var(--walnut)",
          lineHeight: 1.7,
          marginBottom: 20,
          fontFamily: "var(--font-body)",
        }}
      >
        {products.length} popular{" "}
        {products.length === 1 ? "product" : "products"} we considered but
        didn&apos;t pick, and why:
      </p>

      {products.map((p, i) => (
        <div
          key={i}
          style={{
            padding: "18px 20px",
            background: "#FFFFFF",
            border: "1px solid var(--oat)",
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--espresso)",
              marginBottom: 6,
              fontFamily: "var(--font-body)",
            }}
          >
            {p.name}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "var(--shale)",
              lineHeight: 1.6,
              fontFamily: "var(--font-body)",
            }}
          >
            {p.reason}
          </div>
        </div>
      ))}
    </section>
  );
}
