import { SiteHeader } from "@/components/SiteHeader";
import { products, getProductBySlug, getRelatedProducts } from "@/lib/content/products";
import { categories } from "@/config/site";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Star, ExternalLink, Check, X, Quote, ArrowRight, Clock, Package } from "lucide-react";
import { FeaturedProducts } from "@/components/homepage/FeaturedProducts";
import { SITE_URL, buildOfferGraph, buildBreadcrumbList } from "@/lib/schema";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { findReviewBySlug } from "@/lib/content/consensus-data";
import { PetPalScoreCard } from "@/components/editorial/PetPalScoreCard";
import { VerdictBadge } from "@/components/reviews/VerdictBadge";

interface ProductPageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  return products.map((product) => ({
    category: product.category,
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const url = `${SITE_URL}/reviews/${product.category}/${product.slug}`;

  return {
    title: `${product.title} Review`,
    description: product.overview,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${product.title} Review`,
      description: product.overview,
      url,
      type: 'article',
      ...(product.image ? { images: [{ url: product.image }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { category, slug } = await params;
  const product = getProductBySlug(slug);

  if (!product || product.category !== category) {
    notFound();
  }

  const cat = categories.find((c) => c.slug === category);
  const relatedProducts = getRelatedProducts(product, 3);
  const pageUrl = `${SITE_URL}/reviews/${category}/${product.slug}`;

  const productSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      buildOfferGraph({
        productName: product.title,
        description: product.overview,
        image: product.image,
        url: pageUrl,
        affiliateUrl: product.amazonLink,
        price: product.price,
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
      }),
      buildBreadcrumbList([
        { name: 'Home', url: SITE_URL },
        { name: 'Reviews', url: `${SITE_URL}/reviews` },
        { name: cat?.name ?? category, url: `${SITE_URL}/reviews/${category}` },
        { name: product.title, url: pageUrl },
      ]),
    ],
  };

  // Check for consensus review data
  const consensus = product.consensusSlug
    ? findReviewBySlug(product.consensusSlug)
    : findReviewBySlug(product.slug);

  const displayPros = consensus ? consensus.pros : product.pros;
  const displayCons = consensus ? consensus.cons : product.cons;

  // Safe: schema JSON is built from hardcoded site data, not user input
  const schemaHtml = JSON.stringify(productSchema);

  return (
    <>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaHtml }} />
      <main className="section-padding">
        <div className="container-content">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs mb-8 flex-wrap" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            <Link href="/" className="hover:underline">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/reviews" className="hover:underline">Curated Picks</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/reviews/${category}`} className="hover:underline">
              {cat?.name ?? category.replace(/-/g, ' ')}
            </Link>
          </nav>

          {/* Product Header */}
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-8 mb-10">
            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "var(--color-parchment-dark)" }}>
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain p-6" />
              ) : (
                <div style={{ color: "var(--text-muted)" }}>No Image</div>
              )}
              {consensus && (
                <div className="absolute top-4 left-4">
                  <VerdictBadge verdict={consensus.verdict} size="lg" />
                </div>
              )}
            </div>

            <div>
              <span className="editorial-tag mb-3 inline-block">{cat?.name ?? category.replace(/-/g, ' ')}</span>
              <h1 className="text-headline mb-3" style={{ color: "var(--color-evergreen)" }}>{product.title}</h1>

              {consensus ? (
                <PetPalScoreCard review={consensus} compact className="mb-4" />
              ) : (
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-lg" style={{ fontFamily: "var(--font-heading)" }}>{product.rating.toFixed(1)}</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>({product.reviewCount.toLocaleString()} reviews)</span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen)" }}>${product.price.toFixed(2)}</span>
                {consensus && (
                  <span className="tier-badge" data-tier={consensus.priceBand}>
                    {consensus.priceBand === "premium" ? "Premium Selection" : consensus.priceBand === "recommended" ? "Editor's Pick" : "Practical Choice"}
                  </span>
                )}
              </div>

              {consensus && (
                <div className="flex flex-wrap gap-4 text-xs mb-5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                  {consensus.setupTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Setup: {consensus.setupTime}</span>}
                  {consensus.estimatedYears && <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> ~{consensus.estimatedYears} years</span>}
                </div>
              )}

              <p className="mb-6 leading-relaxed" style={{ fontFamily: "var(--font-editorial)", color: "var(--text-secondary)" }}>{product.overview}</p>

              <AffiliateLink
                href={product.amazonLink}
                productSlug={product.slug}
                productName={product.title}
                retailer={product.retailer}
                placement="product_detail_hero"
                className="inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-bold transition-colors"
                style={{ background: "var(--color-cranberry)", color: "#fff", fontFamily: "var(--font-sans)" }}
              >
                Check Price on Amazon <ArrowRight className="w-4 h-4" />
              </AffiliateLink>
            </div>
          </div>

          {/* Expert Quotes */}
          {consensus && consensus.expertQuotes.length > 0 && (
            <section className="mb-10">
              <h2 className="text-subheadline mb-5" style={{ color: "var(--color-evergreen)" }}>What the Experts Say</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {consensus.expertQuotes.map((eq) => (
                  <div key={eq.source} className="gift-card">
                    <Quote className="w-5 h-5 mb-2" style={{ color: "var(--color-antique-gold)" }} />
                    <p className="text-sm italic mb-3" style={{ fontFamily: "var(--font-editorial)", color: "var(--text-secondary)" }}>&ldquo;{eq.quote}&rdquo;</p>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>— {eq.source}{eq.rating ? ` (${eq.rating}/10)` : ""}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Score Breakdown */}
          {consensus && (
            <section className="mb-10">
              <PetPalScoreCard review={consensus} />
            </section>
          )}

          {/* Pros & Cons */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-lg p-6" style={{ background: "hsla(150, 46%, 22%, 0.05)", border: "1px solid hsla(150, 46%, 22%, 0.1)" }}>
              <h3 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: "var(--color-evergreen)", fontFamily: "var(--font-heading)" }}>
                <Check className="w-5 h-5" /> {consensus ? "What Design Publications Love" : "Pros"}
              </h3>
              <ul className="space-y-2.5">
                {displayPros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-evergreen)" }} /> {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg p-6" style={{ background: "hsla(354, 68%, 34%, 0.04)", border: "1px solid hsla(354, 68%, 34%, 0.1)" }}>
              <h3 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: "var(--color-cranberry)", fontFamily: "var(--font-heading)" }}>
                <X className="w-5 h-5" /> {consensus ? "What to Consider" : "Cons"}
              </h3>
              <ul className="space-y-2.5">
                {displayCons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <X className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-cranberry)" }} /> {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Specs */}
          {Object.keys(product.specs).length > 0 && (
            <section className="mb-10">
              <h2 className="text-subheadline mb-4" style={{ color: "var(--color-evergreen)" }}>Specifications</h2>
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: "rgba(26, 71, 38, 0.1)" }}>
                <table className="w-full text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                  <tbody>
                    {Object.entries(product.specs).map(([key, value], i) => (
                      <tr key={key} style={{ background: i % 2 === 0 ? "var(--color-card-surface)" : "var(--color-parchment)" }}>
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{key}</td>
                        <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Verdict */}
          <section className="mb-10">
            <h2 className="text-subheadline mb-4" style={{ color: "var(--color-evergreen)" }}>Our Verdict</h2>
            <div className="rounded-lg p-6" style={{ background: "var(--color-parchment-dark)" }}>
              <p className="leading-relaxed" style={{ fontFamily: "var(--font-editorial)", color: "var(--text-secondary)", fontSize: "1.125rem" }}>{product.verdict}</p>
            </div>
          </section>

          {/* Bottom CTA */}
          <div className="rounded-lg p-8 text-center mb-12" style={{ background: "var(--color-evergreen-deep)" }}>
            <p className="text-sm mb-3" style={{ color: "var(--color-parchment)", opacity: 0.7, fontFamily: "var(--font-sans)" }}>Ready to invest in quality?</p>
            <AffiliateLink
              href={product.amazonLink}
              productSlug={product.slug}
              productName={product.title}
              retailer={product.retailer}
              placement="product_detail_bottom"
              className="inline-flex items-center gap-2 px-8 py-3 rounded text-sm font-bold transition-colors"
              style={{ background: "var(--color-cranberry)", color: "#fff", fontFamily: "var(--font-sans)" }}
            >
              Check Price on Amazon <ArrowRight className="w-4 h-4" />
            </AffiliateLink>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section>
              <h2 className="text-subheadline mb-6" style={{ color: "var(--color-evergreen)" }}>Related Products</h2>
              <FeaturedProducts products={relatedProducts} />
            </section>
          )}
        </div>
      </main>
    </>
  );
}
