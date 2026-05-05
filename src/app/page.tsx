import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { HeroSection } from "@/components/homepage/HeroSection";
import { FeaturedProducts } from "@/components/homepage/FeaturedProducts";
import { CategoryBrowse } from "@/components/homepage/CategoryBrowse";
import { GuidesSection } from "@/components/homepage/GuidesSection";
import { NewsletterSection } from "@/components/homepage/NewsletterSection";
import { products } from "@/data/products";
import { getFeaturedProducts } from "@/lib/content/products";
import { getAllGuideSummaries, getFeaturedGuides } from "@/lib/guides";
import { contentPillars } from "@/config/site";
import { getTopPicks } from "@/lib/content/consensus-data";
import { ConsensusReviewCard } from "@/components/ConsensusReviewCard";
import { Suspense } from "react";
import { SITE_URL } from "@/lib/schema";
import Link from "next/link";
import { BarChart3, Users, Search } from "lucide-react";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function HomePage() {
  const featuredProducts = getFeaturedProducts(6);
  const featuredGuides = getFeaturedGuides();
  const allGuides = getAllGuideSummaries();
  const topPicks = getTopPicks();

  const pillarData = contentPillars.map((pillar) => ({
    name: pillar.name,
    count: allGuides.filter((guide) => guide.pillar === pillar.slug).length,
    icon: pillar.icon,
    href: `/guides?pillar=${pillar.slug}`,
    description: pillar.description,
    countLabel: "guides",
  }));

  return (
    <>
      <SiteHeader />

      {/* 1. Hero Section */}
      <HeroSection guideCount={allGuides.length} productCount={products.length} />

      {/* 2. Featured Guides */}
      <GuidesSection guides={featuredGuides} />

      {/* 3. Top Rated Products (Consensus Reviews) */}
      {topPicks.length > 0 && (
        <section className="section-padding section-cream-alt">
          <div className="container-content">
            <div className="text-center mb-10">
              <span className="editorial-tag mb-3 inline-block">Expert Consensus</span>
              <h2 className="text-subheadline" style={{ color: "var(--color-evergreen)" }}>
                Top Rated Products
              </h2>
              <p className="text-base mt-2 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-editorial)" }}>
                Products scored highest by our ChristmasGear Score methodology across expert reviews and owner data.
              </p>
            </div>
            <div className="space-y-6 max-w-4xl mx-auto">
              {topPicks.slice(0, 3).map((review, i) => (
                <ConsensusReviewCard key={review.id} review={review} rank={i + 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fallback: legacy featured products when no consensus data */}
      {topPicks.length === 0 && (
        <section className="section-padding section-cream-alt">
          <div className="container-content">
            <div className="mb-8">
              <h2 className="text-subheadline" style={{ color: "var(--color-evergreen)" }}>
                Top Rated Products
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Highest-rated holiday gear across all categories
              </p>
            </div>
            <Suspense fallback={<div>Loading...</div>}>
              <FeaturedProducts products={featuredProducts} />
            </Suspense>
          </div>
        </section>
      )}

      {/* 4. Category Browse (7 pillars) */}
      <CategoryBrowse categories={pillarData} />

      {/* 5. Methodology Preview */}
      <section className="section-padding" style={{ background: "var(--color-parchment)" }}>
        <div className="container-content">
          <div className="text-center mb-10">
            <span className="editorial-tag mb-3 inline-block">Transparent Research</span>
            <h2 className="text-subheadline" style={{ color: "var(--color-evergreen)" }}>
              How We Research
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              {
                icon: Search,
                step: "1",
                title: "Aggregate Expert Reviews",
                desc: "We gather ratings from 3-12+ trusted publications per product — Wirecutter, Consumer Reports, Good Housekeeping, and more.",
              },
              {
                icon: Users,
                step: "2",
                title: "Verify with Owner Data",
                desc: "Expert claims are cross-referenced against hundreds of Amazon and Reddit owner reviews to verify real-world performance.",
              },
              {
                icon: BarChart3,
                step: "3",
                title: "Score on Four Pillars",
                desc: "Each product gets a ChristmasGear Score: Aesthetic Quality, Durability, Setup & Storage, and Value Per Season.",
              },
            ].map((item) => (
              <div key={item.step} className="gift-card text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: "hsla(150, 46%, 22%, 0.08)" }}>
                  <item.icon className="w-5 h-5" style={{ color: "var(--color-evergreen)" }} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-antique-gold)", fontFamily: "var(--font-sans)" }}>
                  Step {item.step}
                </p>
                <h3 className="text-sm font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen)" }}>
                  {item.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/methodology"
              className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              style={{ color: "var(--color-cranberry)", fontFamily: "var(--font-sans)" }}
            >
              Read our full methodology →
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Newsletter */}
      <NewsletterSection />
    </>
  );
}
