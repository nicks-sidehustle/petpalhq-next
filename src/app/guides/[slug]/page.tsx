import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Calendar, ArrowLeft } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getGuideBySlug, getAllSlugs, extractFAQFromMarkdown } from "@/lib/content";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { AuthorByline } from "@/components/AuthorByline";
import {
  buildArticleGraph,
  buildBreadcrumbList,
  buildPageGraphWithFAQ,
  buildPageGraph,
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
      ...(guide.image ? { images: [{ url: guide.image, width: 1200, height: 630 }] } : {}),
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) notFound();

  const pageUrl = `${siteConfig.url}/guides/${slug}`;
  const faqs = extractFAQFromMarkdown(guide.content);

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

  const schema =
    faqs.length > 0
      ? buildPageGraphWithFAQ({ article, breadcrumb, faq: faqs })
      : buildPageGraph({ article, breadcrumb });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="mx-auto px-4 max-w-3xl py-10">
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-sm text-gray-400">
          <Link href="/" className="hover:text-amber-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/guides" className="hover:text-amber-600 transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-gray-600 line-clamp-1">{guide.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            {guide.category}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-3 leading-tight">
            {guide.title}
          </h1>
          <p className="text-lg text-gray-500 mb-4">{guide.description}</p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-4">
            {guide.publishDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Published{" "}
                {new Date(guide.publishDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {guide.updatedDate && guide.updatedDate !== guide.publishDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Updated{" "}
                {new Date(guide.updatedDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {guide.readTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {guide.readTime}
              </span>
            )}
          </div>

          <AuthorByline publishDate={guide.publishDate} updatedDate={guide.updatedDate} />
          <AffiliateDisclosure />
        </header>

        {/* Guide Content */}
        <article
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: guide.htmlContent }}
        />

        {/* Back link */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to all guides
          </Link>
        </div>
      </main>
    </>
  );
}
