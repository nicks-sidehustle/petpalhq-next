interface QuickAnswerProps {
  answer: string;
}

export function QuickAnswer({ answer }: QuickAnswerProps) {
  if (!answer) return null;

  return (
    <section className="mb-8 rounded-2xl border border-[var(--brand-gold)]/40 bg-[var(--brand-cream)] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-green-deep)] mb-2">
        Quick answer
      </p>
      <p className="text-base sm:text-lg leading-8 text-[var(--text-secondary)]">
        {answer}
      </p>
    </section>
  );
}
