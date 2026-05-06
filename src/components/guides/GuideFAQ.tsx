import type { FAQItem } from "@/lib/schema";

interface GuideFAQProps {
  items: FAQItem[];
}

export default function GuideFAQ({ items }: GuideFAQProps) {
  if (items.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t" style={{ borderColor: "var(--color-cream-deep)" }}>
      <h2 className="font-serif text-2xl font-bold mb-6" style={{ color: "var(--color-navy)" }}>
        Frequently Asked Questions
      </h2>
      <dl className="space-y-5">
        {items.map((item, i) => (
          <div key={i}>
            <dt className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>
              {item.question}
            </dt>
            <dd className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
