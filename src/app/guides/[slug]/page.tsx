import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAllSlugs,
  getGuideBySlug,
  getSpokesForHub,
  slugifyHeading,
  buildAmazonUrl,
  type Guide,
} from "@/lib/guides";
import {
  buildArticleGraph,
  buildBreadcrumbList,
  buildFAQGraph,
  buildOrganizationEntity,
  buildPersonEntity,
  buildPickProductReviewGraph,
  buildWebSiteEntity,
  SITE_URL,
} from "@/lib/schema";
import GuideHero from "@/components/guides/GuideHero";
import GuideOnPageTOC from "@/components/guides/GuideOnPageTOC";
import EvidenceAtAGlance from "@/components/guides/EvidenceAtAGlance";
import FeaturedPicksGrid from "@/components/guides/FeaturedPicksGrid";
import ShortAnswer from "@/components/guides/ShortAnswer";
import MethodologyParagraph from "@/components/guides/MethodologyParagraph";
import GuideComparisonTable from "@/components/guides/GuideComparisonTable";
import PickDeepDive from "@/components/guides/PickDeepDive";
import MethodologyBox from "@/components/guides/MethodologyBox";
import EcosystemSection from "@/components/guides/EcosystemSection";
import WhenNotToBuy from "@/components/guides/WhenNotToBuy";
import GuideFAQ from "@/components/guides/GuideFAQ";
import BottomLine from "@/components/guides/BottomLine";
import SourcesPanel from "@/components/guides/SourcesPanel";
import RelatedGuides from "@/components/guides/RelatedGuides";
import HubBadge from "@/components/guides/HubBadge";
import SpokesList from "@/components/guides/SpokesList";
import ForSpeciesSection from "@/components/guides/ForSpeciesSection";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description || guide.excerpt,
  };
}

function articleIdFor(slug: string): string {
  return `${SITE_URL}/guides/${slug}#article`;
}

function buildGuideJsonLd(guide: Guide, hubGuide: Guide | null, spokeGuides: Guide[]) {
  const url = `${SITE_URL}/guides/${guide.slug}`;
  const article = buildArticleGraph({
    title: guide.title,
    description: guide.description || guide.excerpt,
    url,
    image: guide.heroImage || guide.image,
    datePublished: guide.publishDate,
    dateModified: guide.updatedDate || guide.publishDate,
  }) as Record<string, unknown>;

  // Anchor article @id, add about/articleSection from category
  article["@id"] = articleIdFor(guide.slug);
  if (!article["mainEntityOfPage"]) {
    article["mainEntityOfPage"] = url;
  }
  // Build species-tagged `about` array. `sameAs` to canonical Wikipedia entities
  // is the single highest-leverage LLM-citation signal: retrieval-augmented
  // systems can confidently classify "this article is about Dogs (the species)"
  // vs cats from this single field.
  const aboutEntries: Record<string, unknown>[] = [];
  if (guide.category) {
    aboutEntries.push({ "@type": "Thing", name: guide.category });
  }
  if (guide.species?.includes("dog")) {
    aboutEntries.push({
      "@type": "Thing",
      name: "Dog",
      sameAs: "https://en.wikipedia.org/wiki/Dog",
    });
  }
  if (guide.species?.includes("cat")) {
    aboutEntries.push({
      "@type": "Thing",
      name: "Cat",
      sameAs: "https://en.wikipedia.org/wiki/Cat",
    });
  }
  if (aboutEntries.length) {
    article["about"] = aboutEntries;
    if (guide.category) {
      article["articleSection"] = guide.category;
    }
  }

  // Hub: list parts
  if (spokeGuides.length) {
    article["hasPart"] = spokeGuides.map((s) => ({
      "@type": "Article",
      "@id": articleIdFor(s.slug),
      headline: s.title,
      url: `${SITE_URL}/guides/${s.slug}`,
    }));
  }

  // Dual-species spoke: emit per-species deep-link WebPageElement entries.
  // Lets retrieval-augmented systems link directly to #for-dogs / #for-cats
  // sections instead of the article root.
  if (guide.sectionAnchors) {
    const sectionParts: Record<string, unknown>[] = [];
    if (guide.sectionAnchors.forDogs && guide.species?.includes("dog")) {
      sectionParts.push({
        "@type": "WebPageElement",
        "@id": `${url}#${guide.sectionAnchors.forDogs}`,
        name: "For dogs",
        about: {
          "@type": "Thing",
          name: "Dog",
          sameAs: "https://en.wikipedia.org/wiki/Dog",
        },
      });
    }
    if (guide.sectionAnchors.forCats && guide.species?.includes("cat")) {
      sectionParts.push({
        "@type": "WebPageElement",
        "@id": `${url}#${guide.sectionAnchors.forCats}`,
        name: "For cats",
        about: {
          "@type": "Thing",
          name: "Cat",
          sameAs: "https://en.wikipedia.org/wiki/Cat",
        },
      });
    }
    if (sectionParts.length) {
      const existing = (article["hasPart"] as object[] | undefined) ?? [];
      article["hasPart"] = [...existing, ...sectionParts];
    }
  }

  // Spoke: link back to hub
  if (hubGuide) {
    article["isPartOf"] = {
      "@type": "Article",
      "@id": articleIdFor(hubGuide.slug),
      headline: hubGuide.title,
      url: `${SITE_URL}/guides/${hubGuide.slug}`,
    };
  }

  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", url: SITE_URL },
    { name: "Guides", url: `${SITE_URL}/guides` },
    { name: guide.title, url },
  ]);

  const graph: object[] = [
    buildOrganizationEntity(),
    buildWebSiteEntity(),
    buildPersonEntity(),
    article,
    breadcrumbs,
  ];

  if (guide.faqItems.length > 0) {
    graph.push(buildFAQGraph(guide.faqItems));
  }

  // Per-pick Product + Review schema. Growth Marshal Feb 2026: Product+Review
  // schema correlates with 61.7% citation rate vs 41.6% for generic Article-
  // only schema. Every pick gets a Product node with nested Review carrying
  // the editorial deep-dive prose as reviewBody.
  if (guide.picks?.length) {
    for (const pick of guide.picks) {
      if (!pick.asin) continue; // skip picks without an ASIN (no affiliate link)
      const priceMatch = pick.price?.match(/\$([\d,.]+)/);
      const priceNum = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : undefined;
      graph.push(
        buildPickProductReviewGraph({
          productName: pick.name,
          brand: pick.brand,
          image: pick.image,
          url: `${url}#${slugifyHeading(pick.name)}`,
          affiliateUrl: buildAmazonUrl(pick.asin),
          price: priceNum,
          ratingValue: pick.score,
          reviewBody: pick.body || pick.verdict || "",
          datePublished: guide.publishDate,
          reviewName: pick.label,
        })
      );
    }
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  // Hub-and-spoke resolution
  const hubGuide = guide.hub ? getGuideBySlug(guide.hub) : null;
  const isHub =
    guide.guideType === "hub" || Boolean(guide.spokes?.length);
  const spokeGuides = isHub ? getSpokesForHub(guide.slug) : [];

  // Build TOC from frontmatter sections that actually have data — order matches page composition.
  const tocItems: { id: string; label: string }[] = [];
  if (guide.topPicks?.length) tocItems.push({ id: "evidence-at-a-glance", label: "Evidence at a Glance" });
  if (guide.picks?.length) tocItems.push({ id: "featured-picks", label: "Our Picks" });
  if (guide.shortAnswer) tocItems.push({ id: "short-answer", label: "The Short Answer" });
  if (guide.comparison?.rows?.length && guide.picks?.length) {
    tocItems.push({ id: "comparison", label: "Head-to-Head Comparison" });
  }
  guide.picks?.forEach((p) => {
    tocItems.push({ id: slugifyHeading(p.name), label: p.name });
  });
  // Body section headings (h2) for hubs without picks — hub guides rely on prose.
  if (!guide.picks?.length) {
    guide.headings.filter((h) => h.level === 2).forEach((h) => {
      if (
        h.text.toLowerCase() !== "frequently asked questions" &&
        h.text.toLowerCase() !== "bottom line"
      ) {
        tocItems.push({ id: h.id, label: h.text });
      }
    });
  }
  if (guide.methodology) tocItems.push({ id: "methodology", label: "How We Score" });
  if (guide.ecosystemSection) tocItems.push({ id: "ecosystem", label: "Compatibility & Ecosystem" });
  if (guide.whenNotToBuy) tocItems.push({ id: "when-not-to-buy", label: "When NOT to Buy" });
  if (guide.forDogsHtml) {
    tocItems.push({
      id: guide.sectionAnchors?.forDogs || "for-dogs",
      label: "For dogs",
    });
  }
  if (guide.forCatsHtml) {
    tocItems.push({
      id: guide.sectionAnchors?.forCats || "for-cats",
      label: "For cats",
    });
  }
  if (guide.faqItems.length) tocItems.push({ id: "faq", label: "Frequently Asked Questions" });
  if (guide.bottomLine?.length) tocItems.push({ id: "bottom-line", label: "Bottom Line" });
  if (spokeGuides.length) tocItems.push({ id: "spokes-list", label: "All articles in this guide" });
  if (guide.sources) tocItems.push({ id: "sources", label: "Sources & Methodology" });
  if (guide.related?.length) tocItems.push({ id: "related-guides", label: "More Guides" });

  const jsonLd = buildGuideJsonLd(guide, hubGuide, spokeGuides);

  return (
    <article className="max-w-6xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <GuideHero
        category={guide.category}
        title={guide.title}
        excerpt={guide.excerpt}
        updatedDate={guide.updatedDate}
        readTime={guide.readTime}
        heroImage={guide.heroImage}
      />

      <HubBadge hub={hubGuide} />

      <GuideOnPageTOC items={tocItems} />

      <EvidenceAtAGlance picks={guide.topPicks} />

      <FeaturedPicksGrid picks={guide.picks} />

      <ShortAnswer text={guide.shortAnswer} />

      <MethodologyParagraph
        expertSourceCount={guide.expertSourceCount}
        reviewMethod={guide.reviewMethod}
      />

      <GuideComparisonTable picks={guide.picks} comparison={guide.comparison} />

      {guide.picks?.map((pick) => (
        <PickDeepDive key={pick.rank} pick={pick} />
      ))}

      <MethodologyBox methodology={guide.methodology} picks={guide.picks} />

      <EcosystemSection section={guide.ecosystemSection} />

      <WhenNotToBuy html={guide.whenNotToBuyHtml} />

      <ForSpeciesSection
        anchorId={guide.sectionAnchors?.forDogs || "for-dogs"}
        heading="For dogs"
        html={guide.forDogsHtml}
      />

      <ForSpeciesSection
        anchorId={guide.sectionAnchors?.forCats || "for-cats"}
        heading="For cats"
        html={guide.forCatsHtml}
      />

      <section id="faq" className="mb-16 scroll-mt-24">
        <GuideFAQ items={guide.faqItems} />
      </section>

      <BottomLine items={guide.bottomLine} itemsHtml={guide.bottomLineHtml} />

      <SpokesList spokes={spokeGuides} />

      <SourcesPanel sources={guide.sources} methodology={guide.methodology} />

      <RelatedGuides slugs={guide.related} />
    </article>
  );
}
