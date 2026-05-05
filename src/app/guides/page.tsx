import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import { getAllGuides } from "@/lib/guides";
import { contentPillars, siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Gift Guides",
  description: "Expert-reviewed buying guides for Christmas trees, lights, decorations, and holiday gear. Scored by design quality, durability, and value per season.",
  alternates: {
    canonical: `${SITE_URL}/guides`,
  },
};

interface GuidesPageProps {
  searchParams?: Promise<{ pillar?: string }>;
}

export default async function GuidesPage({ searchParams }: GuidesPageProps) {
  const selectedPillarSlug = (await searchParams)?.pillar;
  const selectedPillar = contentPillars.find((pillar) => pillar.slug === selectedPillarSlug);
  const guides = selectedPillar
    ? getAllGuides().filter((guide) => guide.pillar === selectedPillar.slug)
    : getAllGuides();

  return (
    <>
      <SiteHeader />
      <main className="section-padding">
        <div className="container-content">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-6 h-6" style={{ color: "var(--color-evergreen)" }} />
            <h1 className="text-subheadline" style={{ color: "var(--color-evergreen)" }}>
              Gift Guides
            </h1>
          </div>
          <p className="text-base mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-editorial)" }}>
            {selectedPillar
              ? selectedPillar.description
              : "Expert-reviewed buying guides — scored for design quality, durability, and value per season."}
          </p>

          {/* Pillar filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-10" style={{ scrollbarWidth: "none" }}>
            <Link
              href="/guides"
              className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold border transition-colors"
              style={{
                background: !selectedPillar ? "var(--color-evergreen)" : "var(--color-card-surface)",
                color: !selectedPillar ? "var(--color-parchment)" : "var(--text-secondary)",
                borderColor: !selectedPillar ? "var(--color-evergreen)" : "rgba(26, 71, 38, 0.15)",
                fontFamily: "var(--font-sans)",
              }}
            >
              All guides
            </Link>
            {contentPillars.map((pillar) => (
              <Link
                key={pillar.slug}
                href={`/guides?pillar=${pillar.slug}`}
                className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold border transition-colors"
                style={{
                  background: selectedPillar?.slug === pillar.slug ? "var(--color-evergreen)" : "var(--color-card-surface)",
                  color: selectedPillar?.slug === pillar.slug ? "var(--color-parchment)" : "var(--text-secondary)",
                  borderColor: selectedPillar?.slug === pillar.slug ? "var(--color-evergreen)" : "rgba(26, 71, 38, 0.15)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {pillar.name}
              </Link>
            ))}
          </div>

          {/* Guide cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <Link key={guide.slug} href={`/guides/${guide.slug}`}>
                <article className="gift-card h-full flex flex-col">
                  <div className="relative h-44 -mx-[var(--space-6)] -mt-[var(--space-6)] mb-4 overflow-hidden" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}>
                    <Image
                      src={guide.image || 'https://images.unsplash.com/photo-1512389098783-66b81f86e199?w=800&q=80'}
                      alt={guide.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="editorial-tag">{guide.category}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                      {guide.readTime}
                    </span>
                  </div>
                  <h2 className="text-base font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen)" }}>
                    {guide.title}
                  </h2>
                  <p className="text-sm flex-1 mb-4" style={{ color: "var(--text-secondary)" }}>
                    {guide.excerpt}
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold mt-auto" style={{ color: "var(--color-cranberry)", fontFamily: "var(--font-sans)" }}>
                    Read Guide
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
