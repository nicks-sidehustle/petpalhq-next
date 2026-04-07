import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { categories } from "@/data/categories";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return categories.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category);
  if (!cat) return {};

  return {
    title: `${cat.name} Product Reviews`,
    description: `Expert ${cat.name.toLowerCase()} product reviews — ${cat.description}`,
    alternates: { canonical: `${siteConfig.url}/reviews/${category}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();

  return (
    <main className="mx-auto px-4 max-w-4xl py-12">
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/" className="hover:text-amber-600 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/reviews" className="hover:text-amber-600 transition-colors">Reviews</Link>
        <span>/</span>
        <span className="text-gray-600">{cat.name}</span>
      </nav>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{cat.icon}</span>
        <h1 className="text-3xl font-bold text-gray-900">{cat.name} Reviews</h1>
      </div>
      <p className="text-gray-500 mb-8">{cat.description}</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-gray-600 mb-3">
          Individual product review pages are coming soon. In the meantime, check our buying guides
          for expert recommendations in the {cat.name.toLowerCase()} category.
        </p>
        <Link
          href="/guides"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          Browse Buying Guides
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </main>
  );
}
