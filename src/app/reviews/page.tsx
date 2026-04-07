import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { categories } from "@/data/categories";

export const metadata: Metadata = {
  title: "Pet Gear Reviews by Category",
  description: "Browse pet product reviews by category — dogs, cats, small pets, birds, fish, and outdoor/travel gear.",
  alternates: { canonical: `${siteConfig.url}/reviews` },
};

export default function ReviewsPage() {
  return (
    <main className="mx-auto px-4 max-w-4xl py-12">
      <div className="mb-4">
        <Link href="/" className="text-sm text-amber-600 hover:text-amber-700">
          ← PetPalHQ
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Pet Gear Reviews</h1>
      <p className="text-gray-500 mb-8">
        Browse product reviews by pet category. Every review is written by our senior pet editor
        with a focus on safety, durability, and value.
      </p>

      <div className="grid sm:grid-cols-2 gap-5">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/reviews/${cat.slug}`}
            className="group flex items-start gap-4 border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-amber-200 transition-all bg-white"
          >
            <span className="text-3xl shrink-0">{cat.icon}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                  {cat.name}
                </h2>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
              </div>
              <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
              <p className="text-xs text-amber-600 mt-2 font-medium">{cat.count} products reviewed</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
