interface ProsConsProps {
  pros: string[];
  cons: string[];
}

export default function ProsCons({ pros, cons }: ProsConsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
      <div className="rounded-lg p-5" style={{ backgroundColor: "var(--color-cream-deep)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-green-deep)" }}>
          Pros
        </p>
        <ul className="space-y-2 text-sm">
          {pros.map((p, i) => (
            <li key={i} className="flex gap-2" style={{ color: "var(--color-text)" }}>
              <span style={{ color: "var(--color-green)" }}>+</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg p-5" style={{ backgroundColor: "var(--color-cream-deep)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-coral-deep)" }}>
          Cons
        </p>
        <ul className="space-y-2 text-sm">
          {cons.map((c, i) => (
            <li key={i} className="flex gap-2" style={{ color: "var(--color-text)" }}>
              <span style={{ color: "var(--color-coral)" }}>−</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
