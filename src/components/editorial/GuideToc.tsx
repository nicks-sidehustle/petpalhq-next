interface TocItem {
  id: string;
  text: string;
}

interface GuideTocProps {
  items: TocItem[];
}

export function GuideToc({ items }: GuideTocProps) {
  if (!items.length) return null;

  return (
    <nav className="mb-10 border-y border-[var(--brand-gold)]/30 py-4" aria-label="Guide sections">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-green-deep)]">
        In this guide
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.slice(0, 8).map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-sm leading-5 text-[var(--text-secondary)] shadow-sm ring-1 ring-[var(--brand-green)]/10 hover:text-[var(--brand-red)]"
          >
            {item.text}
          </a>
        ))}
      </div>
    </nav>
  );
}
