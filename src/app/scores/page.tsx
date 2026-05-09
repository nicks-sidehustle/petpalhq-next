import type { Metadata } from "next";
import Link from "next/link";
import { getAllGuides } from "@/lib/guides";
import { buildCollectionPage, SITE_URL } from "@/lib/schema";
import { siteConfig } from "@/config/site";

const PAGE_TITLE = "PetPal Gear Score Methodologies — All 52 Buying Guides";
const PAGE_DESC =
  "Every PetPal Gear Score formula across our 62 buying guides. Each score is a category-tailored, weighted composite of expert criteria — transparent factor breakdowns inside.";
const PAGE_URL = `${SITE_URL}/scores`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `${PAGE_TITLE} | ${siteConfig.name}`,
    description: PAGE_DESC,
    url: PAGE_URL,
    type: "website",
  },
};

const CATEGORY_ORDER = ["Aquarium", "Reptile", "Birds", "Cats & Dogs", "Playground"];

function categoryLabel(cat: string): string {
  if (cat === "Cats & Dogs") return "Cats & Dogs";
  return cat;
}

export default function ScoresPage() {
  const allGuides = getAllGuides();
  const guidesWithMethodology = allGuides.filter((g) => g.methodology);

  // Group by category
  const grouped = new Map<string, typeof guidesWithMethodology>();
  for (const guide of guidesWithMethodology) {
    const cat = guide.category || "Other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(guide);
  }

  // Build ordered categories — known ones first, then any extra
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...[...grouped.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const collectionPage = {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...buildCollectionPage({
          name: PAGE_TITLE,
          description: PAGE_DESC,
          url: PAGE_URL,
        }),
        hasPart: guidesWithMethodology.map((g) => ({
          "@type": "Article",
          "@id": `${SITE_URL}/metrics/${g.slug}-score`,
          name: `PetPal Gear Score — ${g.title}`,
          url: `${SITE_URL}/metrics/${g.slug}-score`,
        })),
      },
    ],
  };

  const ldJson = JSON.stringify(collectionPage);

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD built from static site data only. Pattern matches methodology/page.tsx.
        dangerouslySetInnerHTML={{ __html: ldJson }}
      />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-teal)" }}
        >
          Score Methodologies
        </p>
        <h1
          className="font-serif text-4xl md:text-5xl font-bold mb-4 leading-tight"
          style={{ color: "var(--color-navy)" }}
        >
          PetPal Gear Score Index
        </h1>
        <p
          className="max-w-2xl mb-10 text-lg"
          style={{ color: "var(--color-text-muted)" }}
        >
          {guidesWithMethodology.length} buying guides each have a tailored, weighted scoring formula.
          Every factor is defined and weighted transparently — no black boxes.
        </p>

        {orderedCategories.map((cat) => {
          const guides = grouped.get(cat)!;
          return (
            <section key={cat} className="mb-12">
              <h2
                className="font-serif text-2xl font-bold mb-5 pb-2 border-b"
                style={{
                  color: "var(--color-navy)",
                  borderColor: "var(--color-cream-deep)",
                }}
              >
                {categoryLabel(cat)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guides.map((guide) => {
                  const { methodology } = guide;
                  const scoreUrl = `/metrics/${guide.slug}-score`;
                  return (
                    <Link
                      key={guide.slug}
                      href={scoreUrl}
                      className="block rounded-md p-5 transition-shadow hover:shadow-md"
                      style={{ backgroundColor: "var(--color-cream-deep)" }}
                    >
                      <p
                        className="font-semibold text-sm mb-1 leading-snug"
                        style={{ color: "var(--color-navy)" }}
                      >
                        {guide.title}
                      </p>
                      {methodology?.formula && (
                        <p
                          className="text-xs mb-3 leading-relaxed font-mono line-clamp-2"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {methodology.formula}
                        </p>
                      )}
                      {methodology?.factors && methodology.factors.length > 0 && (
                        <ul className="space-y-0.5">
                          {methodology.factors.map((f) => (
                            <li
                              key={f.name}
                              className="text-xs flex items-center gap-2"
                              style={{ color: "var(--color-text)" }}
                            >
                              <span
                                className="font-mono font-bold shrink-0"
                                style={{ color: "var(--color-coral)" }}
                              >
                                {f.weight}%
                              </span>
                              <span>{f.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p
                        className="mt-3 text-xs font-semibold"
                        style={{ color: "var(--color-teal-deep)" }}
                      >
                        View full breakdown &rarr;
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p className="mt-6 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Score formulas are versioned. v1.0 in effect from 2026-05-01. See the{" "}
          <Link
            href="/methodology"
            style={{ color: "var(--color-teal-deep)", textDecoration: "underline" }}
          >
            full methodology page
          </Link>{" "}
          for source stack, refresh policy, and what we don&apos;t claim.
        </p>
      </div>
    </>
  );
}
