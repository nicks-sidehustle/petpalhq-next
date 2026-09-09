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
                  {/* BUY PATH FLOOR — owner, 2026-09-09 ~8:40am PT — plus the
                      2026-09-08 ~10:45pm ruling that withdrew the availability
                      vocabulary ("don't say the item is out of stock! I don't
                      want that disclaimer on anything!").

                      This cell used to render an "Unavailable" chip for an
                      `available: false` pick with an ASIN and a bare en-dash for
                      one without: a comparison row that both said the withdrawn
                      word and gave the reader nowhere to click. Every column now
                      carries the same cookie-setting link the card does, from
                      the same `buyPathId` — /dp/ for an ASIN, /s?k= for a pick
                      that has none. Byte-identical for a pick with an `asin`. */}
                  {pick.buyPathId ? (
                    <AffiliateLink
                      href={buildGoHref(pick.buyPathId, guideSlug, pick.rank)}
                      productName={pick.name}
                      placement="guide-comparison-table"
                      className="inline-block text-xs font-semibold py-1.5 px-3 rounded"
                      style={{
                        backgroundColor: "var(--color-coral)",
                        color: "white",
                      }}
                      // The full lead-time line lives on the pick card and the
                      // deep dive (owner ruling 2026-08-18); this cell is one
                      // compact CTA, so it carries the same fact as its tooltip
                      // rather than staying silent about the delay.
                      // A re-lit dark card's cell says where its figure came
                      // from (owner ruling 2026-09-07 rule 4) — same precedence
                      // order the card renders in.
                      title={
                        pick.backorderDisclosure ??
                        pick.priceSourceChip ??
                        pick.guardDisclosure
                      }
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
