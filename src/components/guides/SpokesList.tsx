import Link from "next/link";
import type { Guide } from "@/lib/guides";

interface SpokesListProps {
  spokes?: Guide[];
}

export default function SpokesList({ spokes }: SpokesListProps) {
  if (!spokes?.length) return null;

  return (
    <section id="spokes-list" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6"
        style={{ color: "var(--color-navy)" }}
      >
        All articles in this guide
      </h2>
      <ul
        className="rounded-lg border overflow-hidden divide-y bg-white"
        style={{ borderColor: "var(--color-cream-deep)" }}
      >
        {spokes.map((spoke) => (
          <li
            key={spoke.slug}
            style={{ borderColor: "var(--color-cream-deep)" }}
          >
            <Link
              href={`/guides/${spoke.slug}`}
              className="block p-5 transition-colors hover:bg-[var(--color-cream-deep)]"
            >
              <h3
                className="font-serif text-lg font-bold mb-1 leading-tight"
                style={{ color: "var(--color-navy)" }}
              >
                {spoke.title}
              </h3>
              {spoke.excerpt && (
                <p
                  className="text-sm mb-2 leading-relaxed"
                  style={{ color: "var(--color-text)" }}
                >
                  {spoke.excerpt}
                </p>
              )}
              {spoke.readTime && (
                <p
                  className="text-xs uppercase tracking-widest"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {spoke.readTime}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
