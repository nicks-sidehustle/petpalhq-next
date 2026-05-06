import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { buildAmazonUrl, type GuideComparison, type GuidePick } from "@/lib/guides";

interface GuideComparisonTableProps {
  picks?: GuidePick[];
  comparison?: GuideComparison;
}

export default function GuideComparisonTable({
  picks,
  comparison,
}: GuideComparisonTableProps) {
  if (!picks?.length || !comparison?.rows?.length) return null;

  return (
    <section id="comparison" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6"
        style={{ color: "var(--color-navy)" }}
      >
        Head-to-Head Comparison
      </h2>
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--color-cream-deep)" }}>
        <table className="w-full text-sm bg-white">
          <thead>
            <tr style={{ backgroundColor: "var(--color-cream-deep)" }}>
              <th
                className="text-left p-3 font-semibold"
                style={{ color: "var(--color-navy)" }}
                scope="col"
              >
                Feature
              </th>
              {picks.map((pick) => (
                <th
                  key={pick.rank}
                  className="text-left p-3 font-semibold"
                  style={{ color: "var(--color-navy)" }}
                  scope="col"
                >
                  {pick.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row, rIdx) => (
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
                  {row.label}
                </th>
                {picks.map((_, cIdx) => (
                  <td key={cIdx} className="p-3" style={{ color: "var(--color-text)" }}>
                    {row.values[cIdx] ?? "–"}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t" style={{ borderColor: "var(--color-cream-deep)" }}>
              <th
                className="text-left p-3 font-medium"
                style={{ color: "var(--color-text)" }}
                scope="row"
              >
                Check Price
              </th>
              {picks.map((pick) => (
                <td key={pick.rank} className="p-3">
                  {pick.asin ? (
                    <AffiliateLink
                      href={buildAmazonUrl(pick.asin)}
                      productName={pick.name}
                      placement="guide-comparison-table"
                      className="inline-block text-xs font-semibold py-1.5 px-3 rounded"
                      style={{
                        backgroundColor: "var(--color-coral)",
                        color: "white",
                      }}
                    >
                      Amazon
                    </AffiliateLink>
                  ) : (
                    <span style={{ color: "var(--color-text-muted)" }}>–</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
