import type { PetPalConsensusReview } from '@/lib/content/consensus-data';
import { getVerdictColor } from '@/lib/consensus-score';

interface Props {
  products: PetPalConsensusReview[];
  updatedDate: string;
}

export function EvidenceSnapshot({ products, updatedDate }: Props) {
  // Show top 3 by score
  const top3 = [...products]
    .sort((a, b) => b.petpalScore - a.petpalScore)
    .slice(0, 3);

  if (top3.length === 0) return null;

  const totalSources = new Set(
    products.flatMap((p) =>
      p.expertQuotes.map((q) => q.source)
    )
  );
  const sourceCount = Math.max(totalSources.size, products.reduce((max, p) => Math.max(max, p.sourcesCount), 0));

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          PetPal Score Summary
        </span>
        <span className="ml-auto text-xs text-gray-400">
          Verified {updatedDate}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {top3.map((product, i) => (
          <div
            key={product.id}
            className="flex items-center gap-3 rounded-lg bg-white border border-gray-100 p-3"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
              {product.petpalScore.toFixed(1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {i === 0 && <span className="text-amber-600 mr-1">#1</span>}
                {product.productName}
              </p>
              <span
                className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 ${getVerdictColor(product.verdict)}`}
              >
                {product.verdict}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Scores aggregated from {sourceCount}+ expert sources.{' '}
        <a href="/methodology" className="text-amber-600 hover:underline">
          How we score
        </a>
      </p>
    </div>
  );
}
