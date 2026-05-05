import { SiteHeader } from "@/components/SiteHeader";
import { FeaturedProducts } from "@/components/homepage/FeaturedProducts";
import { categories } from "@/config/site";
import { getProductsByCategory } from "@/lib/content/products";
import { getAllGuideSummaries } from "@/lib/guides";
import { getPillarSlugForCategory } from "@/lib/taxonomy";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SITE_URL, buildCollectionPage, buildBreadcrumbList } from "@/lib/schema";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return categories.map((cat) => ({
    category: cat.slug,
  }));
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category);
  
  if (!cat) {
    return { title: "Category Not Found" };
  }

  return {
    title: `${cat.name} Reviews | PetPalHQ`,
    description: cat.description,
    alternates: {
      canonical: `${SITE_URL}/reviews/${cat.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category);

  if (!cat) {
    notFound();
  }

  const products = getProductsByCategory(category);
  const catUrl = `${SITE_URL}/reviews/${category}`;
  const categoryPillar = getPillarSlugForCategory(cat.name) ?? getPillarSlugForCategory(cat.slug);
  const relatedGuides = getAllGuideSummaries()
    .filter((guide) => getPillarSlugForCategory(guide.category) === categoryPillar)
    .slice(0, 6);

  const categorySchema = {
    '@context': 'https://schema.org',
    '@graph': [
      buildCollectionPage({
        name: `${cat.name} Reviews`,
        description: cat.description,
        url: catUrl,
      }),
      buildBreadcrumbList([
        { name: 'Home', url: SITE_URL },
        { name: 'Reviews', url: `${SITE_URL}/reviews` },
        { name: cat.name, url: catUrl },
      ]),
    ],
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categorySchema) }}
      />
      <main className="py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-gray-700">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/reviews" className="hover:text-gray-700">Reviews</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">{cat.name}</span>
          </nav>

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <span className="text-5xl">{cat.icon}</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {cat.name}
              </h1>
              <p className="text-gray-600 mt-1">
                {cat.description}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {products.length} products
              </p>
            </div>
          </div>

          {/* Products */}
          {products.length > 0 ? (
            <FeaturedProducts products={products} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No products in this category yet.
            </div>
          )}

          {relatedGuides.length > 0 && (
            <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-green)]">
                    Buying guidance
                  </p>
                  <h2 className="text-xl font-bold text-gray-900">
                    Helpful {cat.name.toLowerCase()} guides
                  </h2>
                </div>
                <Link
                  href={`/guides?pillar=${categoryPillar}`}
                  className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-red)] hover:gap-2 transition-all"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedGuides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="rounded-xl bg-[var(--brand-cream)]/60 border border-gray-100 p-4 hover:border-[var(--brand-green)]/40 transition-colors"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-green)]">
                      {guide.category}
                    </span>
                    <h3 className="mt-2 font-semibold text-gray-900">{guide.title}</h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{guide.excerpt}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
