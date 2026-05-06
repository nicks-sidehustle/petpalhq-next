import type { GuideHeading } from "@/lib/guides";

interface GuideTOCProps {
  headings: GuideHeading[];
}

export default function GuideTOC({ headings }: GuideTOCProps) {
  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--color-text-muted)" }}
      >
        On this page
      </p>
      <ul className="space-y-2">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${h.id}`}
              className="hover:underline"
              style={{ color: h.level === 2 ? "var(--color-text)" : "var(--color-text-muted)" }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
