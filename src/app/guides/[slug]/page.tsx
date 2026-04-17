import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { getGuideBySlug, getAllSlugs, extractFAQFromMarkdown } from "@/lib/content";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { QuickVerdict } from "@/components/guides/QuickVerdict";
import { ValueTierCard } from "@/components/guides/ValueTierCard";
import { ResearchNote } from "@/components/guides/ResearchNote";
import { WhatWePassedOn } from "@/components/guides/WhatWePassedOn";
import { FAQSection } from "@/components/guides/FAQSection";
import { SourcesList } from "@/components/guides/SourcesList";
import { GuideTOC } from "@/components/GuideTOC";
import { EngagementTracker } from "@/components/EngagementTracker";
import { consensusReviews } from "@/lib/content/consensus-data";
import {
  buildArticleGraph,
  buildBreadcrumbList,
  buildPageGraphWithFAQ,
  buildPageGraph,
  buildOfferGraph,
  BRAND_SAME_AS_MAP,
} from "@/lib/schema";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return {};

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `${siteConfig.url}/guides/${slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: "article",
      publishedTime: guide.publishDate,
      modifiedTime: guide.updatedDate,
      ...(guide.image
        ? { images: [{ url: guide.image, width: 1200, height: 630 }] }
        : {}),
    },
  };
}

function buildProductSchemas(productNames: string[]) {
  const schemas: object[] = [];
  for (const name of productNames) {
    const review = consensusReviews.find(
      (r) => r.productName.toLowerCase() === name.toLowerCase()
    );
    if (!review) continue;
    const brandName = review.productName.split(" ")[0];
    const brandSameAs = BRAND_SAME_AS_MAP[brandName] || [];
    schemas.push({
      "@type": "Product",
      "@id": `${siteConfig.url}/products/${review.slug}#product`,
      name: review.productName,
      brand: {
        "@type": "Brand",
        name: brandName,
        ...(brandSameAs.length > 0 ? { sameAs: brandSameAs } : {}),
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: review.petpalScore,
        bestRating: 10,
        worstRating: 0,
        reviewCount: review.sourcesCount,
      },
      offers: buildOfferGraph({
        name: review.productName,
        url: review.affiliateLinks.amazon,
      }),
    });
  }
  return schemas;
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) notFound();

  const pageUrl = `${siteConfig.url}/guides/${slug}`;

  // Use frontmatter FAQ if available, fall back to markdown extraction
  const faqs =
    guide.faq && guide.faq.length > 0
      ? guide.faq
      : extractFAQFromMarkdown(guide.content);

  // JSON-LD schema — content from our own schema builders, not user input
  const article = buildArticleGraph({
    title: guide.title,
    description: guide.description,
    url: pageUrl,
    publishDate: guide.publishDate,
    updatedDate: guide.updatedDate,
    imageUrl: guide.image || undefined,
  });
  const breadcrumb = buildBreadcrumbList([
    { name: "Home", url: siteConfig.url },
    { name: "Guides", url: `${siteConfig.url}/guides` },
    { name: guide.title, url: pageUrl },
  ]);
  const baseSchema =
    faqs.length > 0
      ? buildPageGraphWithFAQ({ article, breadcrumb, faq: faqs })
      : buildPageGraph({ article, breadcrumb });
  const productSchemas = buildProductSchemas(guide.products ?? []);
  const schema = {
    ...baseSchema,
    "@graph": [...(baseSchema["@graph"] as object[]), ...productSchemas],
  };
  const jsonLd = JSON.stringify(schema);

  const hasTiers =
    guide.tiers?.budget && guide.tiers?.sweetSpot && guide.tiers?.splurge;
  const amazonTag = siteConfig.amazonTag;

  return (
    <>
      {/* Safe: JSON-LD from our own schema builders */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* Guide-scoped engagement tracking: scroll depth, dwell time,
          guide completion, product card views, comparison-chart views.
          Renders nothing — side-effect only. */}
      <EngagementTracker isGuide />

      <article
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "48px 24px 80px",
        }}
      >
        {/* Breadcrumb */}
        <nav
          style={{
            fontSize: 13,
            color: "var(--driftwood)",
            fontFamily: "var(--font-body)",
            marginBottom: 24,
          }}
        >
          <Link
            href="/"
            style={{ color: "var(--driftwood)", textDecoration: "none" }}
          >
            Home
          </Link>
          <span style={{ margin: "0 6px" }}>&rsaquo;</span>
          {guide.collection && (
            <>
              <span style={{ color: "var(--tomato)", fontWeight: 600 }}>
                {guide.collection}
              </span>
              <span style={{ margin: "0 6px" }}>&rsaquo;</span>
            </>
          )}
          <span style={{ color: "var(--shale)" }}>{guide.category}</span>
        </nav>

        {/* Hero */}
        <header style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 500,
              color: "var(--espresso)",
              lineHeight: 1.1,
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-display)",
            }}
          >
            {guide.title}
          </h1>
          <p
            style={{
              fontSize: 18,
              color: "var(--shale)",
              lineHeight: 1.6,
              margin: "0 0 24px",
              fontFamily: "var(--font-body)",
            }}
          >
            {guide.description}
          </p>

          {guide.sourceCount && guide.researchHours && (
            <ResearchNote
              sourceCount={guide.sourceCount}
              researchHours={guide.researchHours}
              lastUpdated={
                guide.updatedDate
                  ? new Date(guide.updatedDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : ""
              }
            />
          )}
        </header>

        <AffiliateDisclosure />

        {hasTiers ? (
          <>
            {/* Quick Verdict */}
            <div style={{ marginBottom: 36 }}>
              <QuickVerdict
                budget={{
                  name: guide.tiers!.budget.name,
                  price: guide.tiers!.budget.price,
                }}
                sweetSpot={{
                  name: guide.tiers!.sweetSpot.name,
                  price: guide.tiers!.sweetSpot.price,
                }}
                splurge={{
                  name: guide.tiers!.splurge.name,
                  price: guide.tiers!.splurge.price,
                }}
              />
            </div>

            {/* Editorial intro */}
            {guide.editorialIntro && (
              <section style={{ marginBottom: 48 }}>
                <h2
                  style={{
                    fontSize: 28,
                    fontWeight: 500,
                    color: "var(--espresso)",
                    margin: "0 0 16px",
                    letterSpacing: "-0.01em",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  Why we did this differently
                </h2>
                {guide.editorialIntro.split("\n\n").map((para, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 17,
                      color: "var(--walnut)",
                      lineHeight: 1.7,
                      margin: "0 0 16px",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {para}
                  </p>
                ))}
              </section>
            )}

            {/* Three Value Tier Cards */}
            <ValueTierCard
              tier="budget"
              product={{
                ...guide.tiers!.budget,
                affiliateUrl: `https://www.amazon.com/dp/${guide.tiers!.budget.asin}?tag=${amazonTag}&linkCode=as2`,
              }}
            />
            <ValueTierCard
              tier="sweet-spot"
              product={{
                ...guide.tiers!.sweetSpot,
                affiliateUrl: `https://www.amazon.com/dp/${guide.tiers!.sweetSpot.asin}?tag=${amazonTag}&linkCode=as2`,
              }}
            />
            <ValueTierCard
              tier="splurge"
              product={{
                ...guide.tiers!.splurge,
                affiliateUrl: `https://www.amazon.com/dp/${guide.tiers!.splurge.asin}?tag=${amazonTag}&linkCode=as2`,
              }}
            />

            {/* What we passed on */}
            {guide.passedOn && guide.passedOn.length > 0 && (
              <WhatWePassedOn products={guide.passedOn} />
            )}

            {/* FAQ */}
            {faqs.length > 0 && <FAQSection items={faqs} />}

            {/* Sources */}
            {guide.sources && guide.sources.length > 0 && (
              <SourcesList sources={guide.sources} />
            )}
          </>
        ) : (
          <>
            {/* Legacy guides without tier data — render as prose.
                Content from our own authored markdown files, not user input. */}
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: guide.htmlContent }}
            />
            <GuideTOC headings={guide.headings} />
          </>
        )}

        {/* Back link */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid var(--linen)",
          }}
        >
          <Link
            href="/guides"
            style={{
              fontSize: 14,
              color: "var(--tomato)",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            &larr; Back to all guides
          </Link>
        </div>
      </article>
    </>
  );
}
