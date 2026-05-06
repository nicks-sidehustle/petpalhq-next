import type { GuideEcosystemSection } from "@/lib/guides";

interface EcosystemSectionProps {
  section?: GuideEcosystemSection;
}

export default function EcosystemSection({ section }: EcosystemSectionProps) {
  if (!section) return null;

  // narrativeHtml comes from marked() over first-party MDX frontmatter — trusted.
  return (
    <section id="ecosystem" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-4"
        style={{ color: "var(--color-navy)" }}
      >
        Compatibility & Ecosystem
      </h2>
      <div
        className="prose mb-6"
        dangerouslySetInnerHTML={{ __html: section.narrativeHtml }}
      />
      {section.table && (
        <div
          className="overflow-x-auto rounded-lg border"
          style={{ borderColor: "var(--color-cream-deep)" }}
        >
          <table className="w-full text-sm bg-white">
            <thead>
              <tr style={{ backgroundColor: "var(--color-cream-deep)" }}>
                <th
                  className="text-left p-3 font-semibold"
                  style={{ color: "var(--color-navy)" }}
                  scope="col"
                >
                  Product
                </th>
                {section.table.columns.map((col, i) => (
                  <th
                    key={i}
                    className="text-left p-3 font-semibold"
                    style={{ color: "var(--color-navy)" }}
                    scope="col"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-t"
                  style={{ borderColor: "var(--color-cream-deep)" }}
                >
                  <th
                    className="text-left p-3 font-medium"
                    style={{ color: "var(--color-text)" }}
                    scope="row"
                  >
                    {row.product}
                  </th>
                  {section.table!.columns.map((_, cIdx) => (
                    <td key={cIdx} className="p-3" style={{ color: "var(--color-text)" }}>
                      {row.values[cIdx] ?? "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
