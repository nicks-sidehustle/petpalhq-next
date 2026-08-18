import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { type GuideComparison, type GuidePick } from "@/lib/guides";
import { buildGoHref } from "@/lib/affiliate-href";

interface GuideComparisonTableProps {
  picks?: GuidePick[];
  comparison?: GuideComparison;
  guideSlug?: string;
}

export default function GuideComparisonTable({
  picks,
  comparison,
  guideSlug,
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
                Check price
              </th>
              {picks.map((pick) => (
                <td key={pick.rank} className="p-3">
                  {/* Owner ruling 2026-08-12: suppress or render clean, never label.
                      `available: false` on a pick with NO ASIN does not mean the
                      product is unavailable — it means we never had an Amazon
                      listing for it. Asserting "Currently unavailable on Amazon"
                      over a direct-sale product that is in stock at its vendor is
                      a false claim, and it is the labelling the suppression law
                      forbids. Only claim unavailability when an ASIN exists to be
                      unavailable. */}
                  {pick.available === false && pick.asin ? (
                    <span
                      className="inline-block text-xs font-semibold py-1.5 px-3 rounded"
                      style={{
                        backgroundColor: "var(--color-cream-deep)",
                        color: "var(--color-text-muted)",
                      }}
                      title={pick.guardLabel}
                    >
                      Unavailable
                    </span>
                  ) : pick.available === false ? (
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      &ndash;
                    </span>
                  ) : pick.asin ? (
                    <AffiliateLink
                      href={buildGoHref(pick.asin, guideSlug, pick.rank)}
                      productName={pick.name}
                      placement="guide-comparison-table"
                      className="inline-block text-xs font-semibold py-1.5 px-3 rounded"
                      style={{
                        backgroundColor: "var(--color-coral)",
                        color: "white",
                      }}
                      // The full backorder line lives on the pick card and the
                      // deep dive (owner ruling 2026-08-18); this cell is one
                      // compact CTA, so it carries the same fact as its tooltip
                      // rather than staying silent about the delay.
                      title={pick.backorderDisclosure ?? pick.guardDisclosure}
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
