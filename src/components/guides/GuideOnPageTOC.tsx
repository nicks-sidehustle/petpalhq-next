interface TOCItem {
  id: string;
  label: string;
}

interface GuideOnPageTOCProps {
  items: TOCItem[];
}

export default function GuideOnPageTOC({ items }: GuideOnPageTOCProps) {
  if (!items?.length) return null;

  return (
    <nav
      aria-label="On this page"
      className="mb-12 p-6 rounded-lg border"
      style={{
        backgroundColor: "var(--color-cream-deep)",
        borderColor: "var(--color-cream-deep)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--color-text-muted)" }}
      >
        On this page
      </p>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="hover:underline"
              style={{ color: "var(--color-navy)" }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
