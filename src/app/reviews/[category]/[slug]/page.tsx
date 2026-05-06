import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { consensusReviews, findReviewBySlug } from "@/lib/content/consensus-data";
import BuyBox from "@/components/reviews/BuyBox";
import ProsCons from "@/components/reviews/ProsCons";
import ScoreBreakdown from "@/components/reviews/ScoreBreakdown";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

function categorySlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function generateStaticParams() {
  return consensusReviews.map((r) => ({
    category: categorySlug(r.category),
    slug: r.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = findReviewBySlug(slug);
  if (!review) return {};
  return {
    title: `${review.productName} Review`,
    description: `${review.verdict} — PetPal Gear Score ${review.petpalGearScore.toFixed(1)} based on ${review.sourcesCount} expert sources.`,
  };
}

export default async function ReviewPage({ params }: PageProps) {
  const { category, slug } = await params;
  const review = findReviewBySlug(slug);
  if (!review) notFound();
  if (categorySlug(review.category) !== category) notFound();

  const alsoConsider = consensusReviews
    .filter((r) => r.category === review.category && r.slug !== review.slug)
    .slice(0, 3);

  return (
    <article className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <header className="mb-8">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--color-teal)" }}
            >
              {review.category}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 leading-tight" style={{ color: "var(--color-navy)" }}>
              {review.productName}
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              By <span className="font-medium" style={{ color: "var(--color-text)" }}>Nick Miles</span>
              {review.lastUpdated && <> {" · "}Updated {review.lastUpdated}</>}
              {" · "}{review.sourcesCount} expert sources
            </p>
          </header>

          <ProsCons pros={review.pros} cons={review.cons} />

          <ScoreBreakdown scores={review.pillarScores} />

          {review.expertQuotes.length > 0 && (
            <section className="my-8">
              <h2 className="font-serif text-2xl font-bold mb-4" style={{ color: "var(--color-navy)" }}>
                What the experts say
              </h2>
              <div className="space-y-4">
                {review.expertQuotes.map((q, i) => (
                  <blockquote key={i} className="border-l-4 pl-4" style={{ borderColor: "var(--color-coral)" }}>
                    <p className="italic" style={{ color: "var(--color-text)" }}>
                      &ldquo;{q.quote}&rdquo;
                    </p>
                    <footer className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                      — {q.source}
                      {q.rating !== undefined && <> ({q.rating.toFixed(1)}/10)</>}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-1 space-y-6">
          <div className="lg:sticky lg:top-20 space-y-6">
            <BuyBox
              productName={review.productName}
              productSlug={review.slug}
              priceRange={review.priceRange}
              amazonUrl={review.affiliateLinks.amazon}
              verdict={review.verdict}
              score={review.petpalGearScore}
            />

            {alsoConsider.length > 0 && (
              <div
                className="rounded-lg border bg-white p-5"
                style={{ borderColor: "var(--color-cream-deep)" }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Also consider
                </p>
                <ul className="space-y-3">
                  {alsoConsider.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/reviews/${categorySlug(r.category)}/${r.slug}`}
                        className="block hover:underline"
                      >
                        <p className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                          {r.productName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {r.petpalGearScore.toFixed(1)} · {r.verdict}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
