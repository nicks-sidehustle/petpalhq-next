import { SiteHeader } from "@/components/SiteHeader";
import { getAllGuides, getAllGuideSummaries, getGuideBySlug } from "@/lib/guides";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Calendar, Clock, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SITE_URL, buildPageGraph, buildFAQGraph } from "@/lib/schema";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { RelatedGuideShelf } from "@/components/editorial/RelatedGuideShelf";
import { GuideToc } from "@/components/editorial/GuideToc";
import { MethodologyBox } from "@/components/editorial/MethodologyBox";
import { ComparisonTable } from "@/components/reviews/ComparisonTable";
import { slugifyHeading } from "@/lib/guides";
import { findReviewBySlug } from "@/lib/content/consensus-data";

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return { title: "Guide Not Found" };
  }

  const url = `${SITE_URL}/guides/${slug}`;

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url,
      type: "article",
      ...(guide.image ? { images: [{ url: guide.image }] } : {}),
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const pageUrl = `${SITE_URL}/guides/${slug}`;
  const guideSummaries = getAllGuideSummaries();
  const sameCategoryGuides = guideSummaries.filter(
    (relatedGuide) => relatedGuide.slug !== guide.slug && relatedGuide.category === guide.category
  );
  const fallbackGuides = guideSummaries.filter(
    (relatedGuide) => relatedGuide.slug !== guide.slug && relatedGuide.category !== guide.category
  );
  const relatedGuides = [...sameCategoryGuides, ...fallbackGuides].slice(0, 3);

  const pageSchema = buildPageGraph({
    url: pageUrl,
    title: guide.title,
    description: guide.description,
    image: guide.image || undefined,
    datePublished: guide.publishDate || undefined,
    dateModified: guide.updatedDate || undefined,
    type: 'article',
    breadcrumbs: [
      { name: 'Home', url: SITE_URL },
      { name: 'Guides', url: `${SITE_URL}/guides` },
      { name: guide.title, url: pageUrl },
    ],
  });

  // Inject FAQPage schema when guide has FAQ content
  const hasFAQ = guide.faqItems.length > 0;
  const schemaGraph = hasFAQ
    ? { ...pageSchema, '@graph': [...(pageSchema['@graph'] as object[]), buildFAQGraph(guide.faqItems)] }
    : pageSchema;

  // Resolve consensus reviews for products referenced in this guide
  const consensusProducts = guide.products
    .map(findReviewBySlug)
    .filter((r): r is NonNullable<typeof r> => r != null);

  // Safe: schema JSON is built from hardcoded site data, not user input
  const schemaHtml = JSON.stringify(schemaGraph);

  return (
    <>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaHtml }} />
      <main className="section-padding">
        <article className="container-content">
          {/* 1. Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs mb-8" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            <Link href="/" className="hover:underline">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/guides" className="hover:underline">Gift Guides</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="editorial-tag">{guide.category}</span>
          </nav>

          {/* 2. Title + Quick Answer */}
          <header className="max-w-3xl mb-6">
            <h1 className="text-headline mb-4" style={{ color: "var(--color-evergreen)" }}>
              {guide.title}
            </h1>
            <p className="text-lg" style={{ fontFamily: "var(--font-editorial)", color: "var(--text-secondary)" }}>
              {guide.excerpt || guide.description}
            </p>
          </header>

          {/* 3. Trust Bar */}
          <div className="flex flex-wrap items-center gap-5 pb-8 mb-8 border-b text-xs" style={{ borderColor: "rgba(26, 71, 38, 0.1)", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Updated {guide.updatedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {guide.readTime}
            </span>
            {guide.expertSourceCount != null && (
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {guide.expertSourceCount} expert sources
              </span>
            )}
            <Link href="/methodology" className="font-semibold underline" style={{ color: "var(--color-cranberry)" }}>
              Our methodology
            </Link>
          </div>

          {/* 4. Quick Picks Table (decision tool — above the fold) */}
          {consensusProducts.length > 0 && (
            <div className="mb-10">
              <ComparisonTable
                products={consensusProducts}
                title="Quick Picks"
              />
            </div>
          )}

          {/* 5. Table of Contents */}
          <GuideToc items={guide.headings.filter((heading) => heading.level === 2)} />

          {/* 6. Editorial Content */}
          <div className="mx-auto" style={{ maxWidth: "var(--container-reading)" }}>
            <div className="prose max-w-none" style={{ fontFamily: "var(--font-editorial)" }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ src, alt }) => (
                    <span className="block my-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src || ''}
                        alt={alt || ''}
                        className="max-w-full h-auto mx-auto rounded-lg max-h-64 object-contain"
                        loading="lazy"
                      />
                    </span>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full border-collapse text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider" style={{ background: "var(--color-parchment)", color: "var(--text-muted)", borderBottom: "1px solid rgba(26, 71, 38, 0.12)" }}>
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2.5 text-sm" style={{ borderBottom: "1px solid rgba(26, 71, 38, 0.06)", color: "var(--text-secondary)" }}>
                      {children}
                    </td>
                  ),
                  h2: ({ children }) => {
                    const text = String(children);
                    return (
                      <h2
                        id={slugifyHeading(text)}
                        className="scroll-mt-28 text-2xl mt-14 mb-5 pt-8 border-t font-bold"
                        style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen-deep)", borderColor: "rgba(201, 162, 39, 0.2)" }}
                      >
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ children }) => {
                    const text = String(children);
                    return (
                      <h3
                        id={slugifyHeading(text)}
                        className="scroll-mt-28 text-xl mt-9 mb-3 font-bold"
                        style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen)" }}
                      >
                        {children}
                      </h3>
                    );
                  },
                  p: ({ children }) => (
                    <p className="my-5 leading-[1.75]" style={{ fontSize: "1.125rem", color: "var(--text-secondary)" }}>
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-5 space-y-2 list-disc pl-6" style={{ color: "var(--text-secondary)" }}>
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="leading-7 text-[1.05rem]">{children}</li>
                  ),
                  a: ({ href = '', children }) => {
                    const isExternal = href.startsWith('http');
                    const isAmazon = /amazon\.com/i.test(href);

                    if (isAmazon) {
                      return (
                        <AffiliateLink
                          href={href}
                          placement="guide_markdown"
                          className="font-semibold hover:underline"
                          style={{ color: "var(--color-cranberry)" }}
                        >
                          {children}
                        </AffiliateLink>
                      );
                    }

                    return (
                      <a
                        href={href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="font-semibold hover:underline"
                        style={{ color: "var(--color-evergreen)" }}
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {guide.content}
              </ReactMarkdown>
            </div>

            {/* 7. Methodology Box */}
            <MethodologyBox
              expertSourceCount={guide.expertSourceCount}
              lastProductCheck={guide.lastProductCheck}
              className="my-12"
            />
          </div>

          {/* 8. Related Guides */}
          <RelatedGuideShelf guides={relatedGuides} />

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(26, 71, 38, 0.1)" }}>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              <strong>Affiliate Disclosure:</strong> This guide contains affiliate links. When you buy through our links, we may earn a commission at no extra cost to you.
            </p>
            <Link
              href="/guides"
              className="inline-flex items-center gap-1 font-semibold hover:underline text-sm"
              style={{ color: "var(--color-evergreen)", fontFamily: "var(--font-sans)" }}
            >
              ← Back to All Guides
            </Link>
          </footer>
        </article>
      </main>
    </>
  );
}
