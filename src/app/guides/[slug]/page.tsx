import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAllSlugs,
  getGuideBySlug,
  getSpokesForHub,
  slugifyHeading,
  buildAmazonUrl,
  isPromoActive,
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
import { isResolvableAsin } from "@/lib/price-cache";
import GuideHero from "@/components/guides/GuideHero";
import GuideOnPageTOC from "@/components/guides/GuideOnPageTOC";
import EvidenceAtAGlance from "@/components/guides/EvidenceAtAGlance";
import FeaturedPicksGrid from "@/components/guides/FeaturedPicksGrid";
import ShortAnswer from "@/components/guides/ShortAnswer";
import MethodologyParagraph from "@/components/guides/MethodologyParagraph";
import GuideBody from "@/components/guides/GuideBody";
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
import SeasonalB2SRail from "@/components/guides/SeasonalB2SRail";
import WaggleSponsoredUnit from "@/components/sponsored/WaggleSponsoredUnit";
import { GuideSideRail } from "@/components/rail/GuideSideRail";
import StickyPriceBar from "@/components/guides/StickyPriceBar";
import {
  resolveStickyBarPick,
  STICKY_BAR_SUBTAG,
  STICKY_BAR_START_SENTINEL,
  STICKY_BAR_END_SENTINEL,
} from "@/lib/sticky-price-bar";

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
    // Self-referential canonical. Without this, guide pages inherit the root
    // layout's default canonical (the homepage), telling search engines every
    // guide is a duplicate of the homepage.
    alternates: { canonical: `${SITE_URL}/guides/${slug}` },
    // Per-guide topic signals: emit <meta name="keywords"> only when the guide
    // curates a `keywords` array (Next joins the array with ", "). Absent field
    // → no keywords key → no meta tag, matching prior behavior.
    ...(guide.keywords?.length ? { keywords: guide.keywords } : {}),
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

  // Speakable: surface the short answer + FAQ to voice/LLM assistants. The
  // CSS selectors resolve to the stable classes on the ShortAnswer and
  // GuideFAQ component containers (.guide-short-answer / .guide-faq).
  article["speakableSpecification"] = {
    "@type": "SpeakableSpecification",
    cssSelector: [".guide-short-answer", ".guide-faq"],
  };

  // Proprietary Score as a PropertyValue on additionalProperty. Emit only when
  // the guide carries a scoring methodology AND at least one pick has a real
  // (non-zero) score — gives LLMs the full formula, factor weights, and per-
  // product scores as a single machine-readable blob. `score` defaults to 0 in
  // the parser, so a positive-score filter is the test for "actually scored".
  if (guide.methodology) {
    const scoredPicks = (guide.picks ?? []).filter((p) => p.score > 0);
    if (scoredPicks.length > 0) {
      const formula = guide.methodology.formula;
      // Score name = text before " = " in the formula; fall back when unparseable.
      const scoreName =
        formula && formula.includes(" = ")
          ? formula.split(" = ")[0].trim()
          : "PetPalHQ Editorial Score";
      article["additionalProperty"] = [
        {
          "@type": "PropertyValue",
          name: scoreName,
          propertyID: `${SITE_URL}/metrics#${slugifyHeading(scoreName)}`,
          value: JSON.stringify({
            scale: "0-10",
            formula: formula,
            factors:
              guide.methodology.factors?.map((f) => ({
                name: f.name,
                weight: f.weight,
                definition: f.definition,
              })) ?? [],
            scores: scoredPicks.map((p) => ({ product: p.name, score: p.score })),
          }),
        },
      ];
    }
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
  // Per-guide topic signals: when the guide curates a `keywords` array, append
  // each as an explicit `about` Thing entity (first ~8, to keep the entity list
  // focused) and emit the full set as a comma-joined `keywords` string (the
  // schema.org keywords convention). The category + species Things above are
  // kept so the broad topic and the species sameAs links still appear; keyword
  // Things are strictly additive. When keywords are absent, behavior is
  // unchanged — no `keywords` key and the category-derived `about` only.
  if (guide.keywords?.length) {
    for (const kw of guide.keywords.slice(0, 8)) {
      aboutEntries.push({ "@type": "Thing", name: kw });
    }
    article["keywords"] = guide.keywords.join(", ");
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

  // ItemList: the ranked picks as an ordered list. Gives crawlers/LLMs the
  // ranking signal explicitly (descending = best first). url is omitted for
  // asin-less picks so we never emit amazon.com/dp/undefined; the pick still
  // counts toward numberOfItems so the count matches itemListElement length.
  if (guide.picks?.length) {
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#picks`,
      name: `${guide.title} — ranked picks`,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: guide.picks.length,
      itemListElement: guide.picks.map((p, i) => ({
        "@type": "ListItem",
        position: p.rank || i + 1,
        name: p.name,
        // Only for a real ASIN. A pick whose `asin` field holds a search phrase
        // would emit `/go/Dyson V15 Detect cordless vacuum` — a malformed URL
        // with literal spaces, pointing at a search page rather than the named
        // product's listing.
        ...(isResolvableAsin(p.asin) ? { url: `${SITE_URL}${buildAmazonUrl(p.asin!)}` } : {}),
        item: {
          "@type": "Product",
          name: p.name,
          ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
        },
      })),
    });
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
          affiliateUrl: `${SITE_URL}${buildAmazonUrl(pick.asin)}`,
          // No resolvable ASIN → no verified listing → the Offer node (price +
          // InStock) is omitted rather than fabricated. Product + Review still
          // emit: the editorial review is real, only the commercial claim was
          // unbacked. These picks are NOT suppressed — an unverifiable ASIN is
          // our data defect, not evidence the product can't be bought.
          hasVerifiableOffer: isResolvableAsin(pick.asin),
          // Owner ruling 2026-08-18: a disclosed backorder claims BackOrder,
          // not InStock. The card says "ships later"; the structured data an
          // AI assistant reads has to say the same thing.
          backordered: !!pick.backorderDisclosure,
          price: priceNum,
          ratingValue: pick.score,
          reviewBody: pick.body || pick.verdict || "",
          datePublished: guide.publishDate,
          reviewName: pick.label,
          communityReviews: pick.ownerVoice?.map((ov) => ({
            quote: ov.quote,
            author: ov.author,
            date: ov.date,
            sourceUrl: ov.sourceUrl,
            sourceLabel: ov.sourceLabel,
          })),
          activePromo: isPromoActive(pick.promo)
            ? { discount: pick.promo.discount, code: pick.promo.code, expiry: pick.promo.expiry }
            : undefined,
          authoritySources: pick.authoritySources?.map((s) => ({
            outlet: s.outlet,
            url: s.url,
            stat: s.stat,
          })),
          available: pick.available,
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

  // Persistent floating check-price bar. Null — no bar, no sentinels, no
  // markup — unless the guide's #1 pick is live, priced, and /go/-able; see
  // the gate documented in src/lib/sticky-price-bar.ts.
  const stickyPick = resolveStickyBarPick(guide.picks, guide.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* This div is the container (max-w-6xl mx-auto px-4 py-12 — 1120px
          content width, unchanged below xl). At xl+ (>=1280px) it ALSO
          becomes a two-column grid: <article> (minmax(0,768px)) + a sticky
          320px right rail (GuideSideRail), as SIBLINGS of this wrapper — the
          rail is NEVER nested inside <article> (dormgear's own structure:
          </article> then the rail, both children of the grid container).
          Grid side-rail pilot ("Rail v2", ported from SmartHomeExplorer /
          DormGearHQ PR #86). */}
      <div className="max-w-6xl mx-auto px-4 py-12 xl:grid xl:grid-cols-[minmax(0,768px)_320px] xl:gap-8">
      <article>
      <GuideHero
        category={guide.category}
        title={guide.title}
        excerpt={guide.excerpt}
        updatedDate={guide.updatedDate}
        readTime={guide.readTime}
        heroImage={guide.heroImage}
      />

      <HubBadge hub={hubGuide} />

      {/* Below xl this is the only TOC surface (unchanged). At xl+ (>=1280px)
          RailTOC inside GuideSideRail (sibling, below) takes over, so this
          hides rather than duplicating "On this page" in two places. */}
      <div className="xl:hidden">
        <GuideOnPageTOC items={tocItems} />
      </div>

      <EvidenceAtAGlance picks={guide.topPicks} />

      <FeaturedPicksGrid picks={guide.picks} guideSlug={guide.slug} lastProductCheck={guide.lastProductCheck} />

      {/* Sticky-bar reveal sentinel: directly below the picks grid. The bar
          appears once this scrolls off the top — i.e. once the cards' own
          Check-price CTAs are no longer on screen. Height is 1px, not 0:
          IntersectionObserver emits no change event for a zero-area target,
          so an h-0 sentinel silently never fires (verified in Chromium). */}
      {stickyPick && (
        <div id={STICKY_BAR_START_SENTINEL} aria-hidden="true" className="h-px" />
      )}

      <ShortAnswer text={guide.shortAnswer} />

      {/* Sponsored listing unit — renders on exactly one slug, null elsewhere.
          Purely additive: it reads nothing from the guide's roster and changes
          no editorial markup. See src/config/waggle-placement.ts.

          POSITION (owner preview, 2026-08-19): mounted directly after The
          Short Answer, landing near 20% depth instead of the ~75% it sat at
          when it followed the For-cats section. Sponsor visibility is what
          the placement sells, and one screen above the fold-line is the
          difference between a paid unit being seen and not.

          The seam is deliberate and keeps playbook contract item 2 intact:
          the reader meets our own editorial answer FIRST, then a separately
          labelled <aside>. It is a top-level sibling — never inside the picks
          grid, the comparison table, or the per-pick deep dives, and never
          above the ranked picks. Nothing about the surrounding editorial
          markup changes; only this element's mount point moved. */}
      <WaggleSponsoredUnit slug={guide.slug} />

      <MethodologyParagraph
        expertSourceCount={guide.expertSourceCount}
        reviewMethod={guide.reviewMethod}
      />

      <GuideBody html={guide.htmlContent} />

      <GuideComparisonTable picks={guide.picks} comparison={guide.comparison} guideSlug={guide.slug} />

      {guide.picks?.map((pick) => (
        <PickDeepDive
          key={pick.rank}
          pick={pick}
          guideSlug={guide.slug}
          lastProductCheck={guide.lastProductCheck}
        />
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

      {/* Hidden at xl+: GuideSideRail's SeasonalPromoRail (sibling, below)
          covers the same B2S_RAIL judgment set on that breakpoint with its
          own distinct rail_v2_* subtag — showing both at once would be a
          redundant duplicate CTA for the same product with colliding
          attribution if they ever shared a subtag. Below xl this in-flow
          block is the only promo surface and is unaffected by this PR. */}
      <div className="xl:hidden">
        <SeasonalB2SRail slug={guide.slug} />
      </div>

      <section id="faq" className="mb-16 scroll-mt-24">
        <GuideFAQ items={guide.faqItems} />
      </section>

      <BottomLine items={guide.bottomLine} itemsHtml={guide.bottomLineHtml} />

      <SpokesList spokes={spokeGuides} />

      {/* Sticky-bar retire sentinel: the bar hides from here down so it can
          never overlay the sources panel, related guides, the affiliate
          disclosure, or the footer. */}
      {stickyPick && (
        <div id={STICKY_BAR_END_SENTINEL} aria-hidden="true" className="h-px" />
      )}

      <SourcesPanel sources={guide.sources} methodology={guide.methodology} />

      <RelatedGuides slugs={guide.related} />
      </article>
      <GuideSideRail
        tocItems={tocItems}
        pageSlug={guide.slug}
        category={guide.category}
        hasMethodology={Boolean(guide.methodology)}
      />
      </div>

      {stickyPick && (
        <StickyPriceBar
          pick={stickyPick}
          startSentinelId={STICKY_BAR_START_SENTINEL}
          endSentinelId={STICKY_BAR_END_SENTINEL}
          placement={STICKY_BAR_SUBTAG}
        />
      )}
    </>
  );
}
