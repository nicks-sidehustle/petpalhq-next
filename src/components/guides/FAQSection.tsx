interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  if (items.length === 0) return null;

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
        Questions we get asked
      </h2>
      {items.map((f, i) => (
        <div
          key={i}
          style={{
            padding: "20px 0",
            borderBottom: "1px solid var(--linen)",
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--espresso)",
              marginBottom: 8,
              fontFamily: "var(--font-body)",
            }}
          >
            {f.question}
          </div>
          <div
            style={{
              fontSize: 15,
              color: "var(--walnut)",
              lineHeight: 1.7,
              fontFamily: "var(--font-body)",
            }}
          >
            {f.answer}
          </div>
        </div>
      ))}
    </section>
  );
}
