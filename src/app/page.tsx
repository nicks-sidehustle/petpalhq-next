import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { categories } from "@/data/categories";
import { guides } from "@/data/guides";

export const metadata: Metadata = {
  alternates: {
    canonical: siteConfig.url,
  },
};

const quickGuides = [
  { label: "Best Dog Harnesses", href: "/guides/best-dog-harnesses-2026" },
  { label: "Best Automatic Cat Feeders", href: "/guides/best-automatic-cat-feeders-2026" },
  { label: "Best Dog Leashes", href: "/guides" },
  { label: "Best Cat Litter Boxes", href: "/guides" },
  { label: "Best Pet Travel Carriers", href: "/guides" },
  { label: "Best Dog Beds", href: "/guides" },
];

export default function HomePage() {
  const featuredGuides = guides.filter((g) => g.featured).slice(0, 3);

  return (
    <>
      {/* Site Header */}
      <header className="border-b border-amber-200 bg-white sticky top-0 z-40">
        <div className="mx-auto px-4 max-w-5xl flex items-center justify-between h-14">
          <Link href="/" className="font-bold text-xl text-amber-700 tracking-tight">
            PetPalHQ
          </Link>
          <nav className="hidden sm:flex items-center gap-5 text-sm text-gray-600">
            <Link href="/guides" className="hover:text-amber-600 transition-colors">Guides</Link>
            <Link href="/reviews" className="hover:text-amber-600 transition-colors">Reviews</Link>
            <Link href="/about" className="hover:text-amber-600 transition-colors">About</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-amber-50 to-white py-14 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Find the Best Gear for Your Pet
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            Expert reviews and buying guides for dogs, cats, and every pet in between — tested and recommended by our senior pet editor.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Browse Buying Guides
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/reviews"
              className="inline-flex items-center gap-2 border border-amber-300 hover:bg-amber-50 text-amber-700 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Product Reviews
            </Link>
          </div>
        </div>
      </section>

      {/* Quick decision paths */}
      <section className="py-5 border-b border-gray-100 bg-white">
        <div className="mx-auto px-4 max-w-4xl">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Popular buying decisions</p>
          <div className="flex flex-wrap gap-2">
            {quickGuides.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="inline-flex items-center gap-1 text-sm bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium px-3 py-1.5 rounded-full border border-amber-200 hover:border-amber-300 transition-colors"
              >
                {label}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Guides */}
      <section className="py-12 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Buying Guides</h2>
              <p className="text-sm text-gray-500 mt-1">Thoroughly researched to help you buy with confidence</p>
            </div>
            <Link href="/guides" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white"
              >
                <div className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {guide.category}
                  </span>
                  <h3 className="font-bold text-gray-900 mt-2 mb-1 group-hover:text-amber-600 transition-colors line-clamp-2">
                    {guide.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{guide.excerpt}</p>
                  <p className="text-xs text-gray-400 mt-3">{guide.readTime}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category Browse */}
      <section className="py-12 px-4 bg-amber-50 border-t border-amber-100">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse by Pet</h2>
          <p className="text-sm text-gray-500 mb-6">Find gear reviews organized by your pet type</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/reviews/${cat.slug}`}
                className="flex items-center gap-3 p-4 bg-white border border-amber-100 rounded-xl hover:shadow-md hover:border-amber-300 transition-all"
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-400">{cat.count} products</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-10 px-4 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-6">Why trust PetPalHQ?</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: "🔬", title: "Hands-On Testing", desc: "Every product is evaluated based on real-world use cases for pets and their owners." },
              { icon: "🐾", title: "Vet-Backed Expertise", desc: "Our editor Rachel Cooper is a former vet tech with 10+ years reviewing pet products." },
              { icon: "💯", title: "Independent Reviews", desc: "We only recommend products we'd use ourselves — no pay-to-play placements." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="p-4">
                <div className="text-3xl mb-2">{icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
