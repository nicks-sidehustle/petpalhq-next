import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { categories } from "@/data/categories";

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  // No product pages yet — will be added as content grows
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const cat = categories.find((c) => c.slug === category);
  if (!cat) return {};

  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${title} Review`,
    description: `Expert review of ${title} — is it worth it for your ${cat.name.toLowerCase()}?`,
    alternates: { canonical: `${siteConfig.url}/reviews/${category}/${slug}` },
  };
}

export default async function ProductReviewPage({ params }: Props) {
  const { category, slug } = await params;
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();

  const productName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <main className="mx-auto px-4 max-w-3xl py-12">
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/" className="hover:text-amber-600 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/reviews" className="hover:text-amber-600 transition-colors">Reviews</Link>
        <span>/</span>
        <Link href={`/reviews/${category}`} className="hover:text-amber-600 transition-colors">{cat.name}</Link>
        <span>/</span>
        <span className="text-gray-600">{productName}</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">{productName} Review</h1>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-gray-600">
          This review is coming soon. Browse our{" "}
          <Link href="/guides" className="text-amber-600 underline hover:text-amber-700">
            buying guides
          </Link>{" "}
          for expert recommendations in the {cat.name.toLowerCase()} category.
        </p>
      </div>
    </main>
  );
}
