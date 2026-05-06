interface ShortAnswerProps {
  text?: string;
}

export default function ShortAnswer({ text }: ShortAnswerProps) {
  if (!text) return null;

  return (
    <section id="short-answer" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-4"
        style={{ color: "var(--color-navy)" }}
      >
        The Short Answer
      </h2>
      <div
        className="p-6 rounded-lg border-l-4"
        style={{
          backgroundColor: "var(--color-cream-deep)",
          borderLeftColor: "var(--color-coral)",
        }}
      >
        <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--color-text)" }}>
          {text}
        </p>
      </div>
    </section>
  );
}
