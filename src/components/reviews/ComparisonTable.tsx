import { type ConsensusReview, verdictToSlug } from "@/lib/content/consensus-data";
import { VerdictBadge } from "@/components/reviews/VerdictBadge";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { Trophy } from "lucide-react";

interface ComparisonTableProps {
  products: ConsensusReview[];
  title?: string;
  className?: string;
}

export function ComparisonTable({
  products,
  title = "Quick Picks",
  className = "",
}: ComparisonTableProps) {
  if (products.length === 0) return null;

  const sorted = [...products].sort((a, b) => b.petpalGearScore - a.petpalGearScore);

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`} style={{ borderColor: "rgba(26, 71, 38, 0.12)", background: "var(--color-card-surface)" }}>
      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(26, 71, 38, 0.08)", background: "var(--color-parchment)" }}>
        <Trophy className="w-4 h-4" style={{ color: "var(--color-antique-gold)" }} />
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)", color: "var(--color-evergreen)" }}>
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: "var(--font-sans)" }}>
          <thead>
            <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: "rgba(26, 71, 38, 0.08)", color: "var(--text-muted)" }}>
              <th className="text-left px-4 py-3 font-semibold">Product</th>
              <th className="text-left px-4 py-3 font-semibold">Best For</th>
              <th className="text-center px-4 py-3 font-semibold">Score</th>
              <th className="text-center px-4 py-3 font-semibold">Verdict</th>
              <th className="text-right px-4 py-3 font-semibold">Price</th>
              <th className="text-center px-4 py-3 font-semibold sr-only">Link</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((product, i) => (
              <tr
                key={product.id}
                className={`border-b last:border-b-0 transition-colors hover:bg-[var(--color-parchment)]`}
                style={{ borderColor: "rgba(26, 71, 38, 0.06)" }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {i === 0 && (
                      <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--color-antique-gold)", color: "var(--color-evergreen-deep)" }}>
                        1
                      </span>
                    )}
                    <div>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {product.productName}
                      </p>
                      {product.topPick && (
                        <span className="text-xs font-semibold" style={{ color: "var(--color-antique-gold)" }}>Top Pick</span>
                      )}
                      {product.practicalPick && (
                        <span className="text-xs font-semibold" style={{ color: "var(--color-evergreen-light)" }}>Practical Pick</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                  {product.bestFor?.[0] || "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold"
                    style={{
                      fontFamily: "var(--font-heading)",
                      background: `${product.petpalGearScore >= 8.5 ? "hsla(150, 46%, 22%, 0.10)" : product.petpalGearScore >= 7.5 ? "hsla(42, 62%, 48%, 0.10)" : "hsla(30, 70%, 50%, 0.10)"}`,
                      color: product.petpalGearScore >= 8.5 ? "var(--color-evergreen)" : product.petpalGearScore >= 7.5 ? "hsl(42, 50%, 35%)" : "var(--color-verdict-mixed)",
                    }}
                  >
                    {product.petpalGearScore.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <VerdictBadge verdict={product.verdict} size="sm" />
                </td>
                <td className="px-4 py-3 text-right font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                  {product.priceRange}
                </td>
                <td className="px-4 py-3 text-center">
                  <AffiliateLink
                    href={product.affiliateLinks.amazon}
                    productSlug={product.slug}
                    productName={product.productName}
                    retailer="amazon"
                    placement="comparison_table"
                    className="inline-flex items-center px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                    style={{
                      background: "var(--color-cranberry)",
                      color: "#fff",
                    }}
                  >
                    Check Price
                  </AffiliateLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t text-xs text-center" style={{ borderColor: "rgba(26, 71, 38, 0.08)", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
        Scores based on {products.reduce((sum, p) => sum + p.sourcesCount, 0)} expert sources.{" "}
        <a href="/methodology" className="underline">See our methodology</a>
      </div>
    </div>
  );
}
