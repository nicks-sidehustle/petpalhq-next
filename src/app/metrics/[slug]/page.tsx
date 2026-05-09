import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllGuides } from "@/lib/guides";
import { SITE_URL } from "@/lib/schema";
import { siteConfig } from "@/config/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Score slug is derived as `${guide.slug}-score`. */
function scoreSlug(guideSlug: string): string {
  return `${guideSlug}-score`;
}

function findGuideByScoreSlug(slug: string) {
  const guides = getAllGuides();
  return guides.find(
    (g) => g.methodology && slug === `${g.slug}-score`,
  ) ?? null;
}

export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides
    .filter((g) => g.methodology)
    .map((g) => ({ slug: scoreSlug(g.slug) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuideByScoreSlug(slug);
  if (!guide) return {};

  const title = `PetPal Gear Score — ${guide.title}`;
  const description = `Transparent score methodology for ${guide.title}. Formula, weighted factors, and definitions — every criterion used to evaluate products in this category.`;
  const url = `${SITE_URL}/metrics/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url,
      type: "article",
    },
  };
}

export const dynamicParams = false;

export default async function MetricPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = findGuideByScoreSlug(slug);
  if (!guide) notFound();

  const { methodology } = guide;
  const url = `${SITE_URL}/metrics/${slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `PetPal Gear Score — ${guide.title}`,
    description: `Score methodology for ${guide.title}: formula, factors, weights, and definitions.`,
    url,
    datePublished: guide.publishDate,
    dateModified: guide.updatedDate,
    author: {
      "@type": "Person",
      name: "Nick Miles",
      url: `${SITE_URL}/author/nick-miles`,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: SITE_URL,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    about: {
      "@type": "Thing",
      name: "PetPal Gear Score",
      description: methodology?.formula ?? "",
    },
  };

  const totalWeight = methodology?.factors?.reduce((sum, f) => sum + f.weight, 0) ?? 0;

  const ldJson = JSON.stringify(articleJsonLd);

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD content is built from static site data only, not user input.
        // This pattern is used throughout the codebase (e.g. methodology/page.tsx).
        dangerouslySetInnerHTML={{ __html: ldJson }}
      />

      <article className="max-w-3xl mx-auto px-4 py-12">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-teal)" }}
        >
          Gear Score Methodology
        </p>

        <h1
          className="font-serif text-3xl md:text-4xl font-bold mb-4 leading-tight"
          style={{ color: "var(--color-navy)" }}
        >
          PetPal Gear Score
        </h1>

        <p
          className="text-xl mb-2 font-medium"
          style={{ color: "var(--color-navy)" }}
        >
          {guide.title}
        </p>

        <p className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <Link
            href={`/guides/${guide.slug}`}
            style={{ color: "var(--color-teal-deep)", textDecoration: "underline" }}
          >
            View full buying guide &rarr;
          </Link>
        </p>

        {guide.reviewMethod && (
          <div className="prose mb-8">
            <p>{guide.reviewMethod}</p>
          </div>
        )}

        {methodology?.formula && (
          <pre
            className="my-6 overflow-x-auto rounded-md p-5 text-sm leading-relaxed"
            style={{
              backgroundColor: "var(--color-cream-deep)",
              color: "var(--color-text)",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          >
            <code>{methodology.formula}</code>
          </pre>
        )}

        {methodology?.factors && methodology.factors.length > 0 && (
          <>
            <h2
              className="font-serif text-2xl font-bold mt-10 mb-4"
              style={{ color: "var(--color-navy)" }}
            >
              Factor breakdown
            </h2>
            {totalWeight !== 100 && totalWeight > 0 && (
              <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                Weights sum to {totalWeight}
              </p>
            )}
            <div className="space-y-4">
              {methodology.factors.map((factor) => (
                <div
                  key={factor.name}
                  className="rounded-md p-5"
                  style={{ backgroundColor: "var(--color-cream-deep)" }}
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <h3
                      className="font-semibold text-base"
                      style={{ color: "var(--color-navy)" }}
                    >
                      {factor.name}
                    </h3>
                    <span
                      className="text-sm font-mono font-bold ml-4 shrink-0"
                      style={{ color: "var(--color-coral)" }}
                    >
                      {factor.weight}%
                    </span>
                  </div>
                  {factor.definition && (
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                      {factor.definition}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div
          className="mt-12 pt-8 border-t"
          style={{ borderColor: "var(--color-cream-deep)" }}
        >
          <Link
            href={`/guides/${guide.slug}`}
            className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--color-navy)",
              color: "#fff",
            }}
          >
            Read the full guide &rarr;
          </Link>
          <p className="mt-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            See all score methodologies on the{" "}
            <Link
              href="/scores"
              style={{ color: "var(--color-teal-deep)", textDecoration: "underline" }}
            >
              Gear Score index
            </Link>
            .
          </p>
        </div>
      </article>
    </>
  );
}
