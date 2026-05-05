import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { categories } from "@/config/site";
import { getProductsByCategory } from "@/lib/content/products";
import { SITE_URL } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Product Reviews | PetPalHQ",
  description: "Browse our expert-consensus pet gear reviews across aquarium, reptile, and bird verticals.",
  alternates: {
    canonical: `${SITE_URL}/reviews`,
  },
};

export default function ReviewsPage() {
  const categoryData = categories.map(cat => ({
    ...cat,
    count: getProductsByCategory(cat.slug).length,
  }));

  return (
    <>
      <SiteHeader />
      <main className="py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Product Reviews
          </h1>
          <p className="text-gray-600 mb-8">
            Browse our curated collection of the best aquarium, reptile, and bird gear, organized by category.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryData.map((category) => (
              <Link
                key={category.slug}
                href={`/reviews/${category.slug}`}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[var(--brand-green)] hover:shadow-md transition-all"
              >
                <span className="text-4xl mb-4 block">{category.icon}</span>
                <h2 className="font-semibold text-lg text-gray-900 group-hover:text-[var(--brand-green)] transition-colors mb-1">
                  {category.name}
                </h2>
                <p className="text-sm text-gray-500 mb-3">
                  {category.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{category.count} products</span>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--brand-green)] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
