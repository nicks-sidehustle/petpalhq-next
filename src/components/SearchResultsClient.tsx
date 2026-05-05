"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { FeaturedProducts } from "@/components/homepage/FeaturedProducts";
import type { Product } from "@/data/products";
import type { GuideSummary } from "@/lib/guides";

interface SearchResultsClientProps {
  products: Product[];
  guides: GuideSummary[];
}

export function SearchResultsClient({ products, guides }: SearchResultsClientProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const normalizedQuery = query.toLowerCase();

  const matchingProducts = products.filter(
    (product) =>
      product.title.toLowerCase().includes(normalizedQuery) ||
      product.category.toLowerCase().includes(normalizedQuery) ||
      product.overview.toLowerCase().includes(normalizedQuery)
  );

  const matchingGuides = guides.filter(
    (guide) =>
      guide.title.toLowerCase().includes(normalizedQuery) ||
      guide.description.toLowerCase().includes(normalizedQuery) ||
      guide.excerpt.toLowerCase().includes(normalizedQuery) ||
      guide.category.toLowerCase().includes(normalizedQuery)
  );

  return (
    <main className="py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <Search className="w-6 h-6 text-gray-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Search Results
          </h1>
        </div>
        <p className="text-gray-600 mb-8">
          {query ? (
            <>
              Showing results for &quot;<span className="font-medium">{query}</span>&quot;
            </>
          ) : (
            "Enter a search term to find products and guides"
          )}
        </p>

        {query && (
          <>
            <section className="mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Products ({matchingProducts.length})
              </h2>
              {matchingProducts.length > 0 ? (
                <FeaturedProducts products={matchingProducts} />
              ) : (
                <p className="text-gray-500">No products found.</p>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Guides ({matchingGuides.length})
              </h2>
              {matchingGuides.length > 0 ? (
                <div className="grid gap-4">
                  {matchingGuides.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={`/guides/${guide.slug}`}
                      className="bg-white rounded-xl p-5 border border-gray-200 hover:border-[var(--brand-green)] hover:shadow-md transition-all flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-medium text-[var(--brand-green)] bg-[var(--brand-cream)] px-2 py-0.5 rounded">
                          {guide.category}
                        </span>
                        <h3 className="font-semibold text-gray-900 mt-2">
                          {guide.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {guide.excerpt}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No guides found.</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
