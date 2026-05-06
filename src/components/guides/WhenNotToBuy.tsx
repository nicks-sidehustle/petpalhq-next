interface WhenNotToBuyProps {
  html?: string;
}

export default function WhenNotToBuy({ html }: WhenNotToBuyProps) {
  if (!html) return null;

  // html is rendered from first-party MDX in src/content/guides via marked() — trusted source.
  return (
    <section id="when-not-to-buy" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-4"
        style={{ color: "var(--color-navy)" }}
      >
        When NOT to Buy
      </h2>
      <div
        className="prose"
        style={{ color: "var(--color-text)" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
