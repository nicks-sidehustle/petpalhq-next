import { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { VerdictBadge } from "@/components/reviews/VerdictBadge";
import { getAllReviewsByScore, type Verdict } from "@/lib/content/consensus-data";
import { SITE_URL } from "@/lib/schema";
import { BarChart3, Search, Users, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Methodology — How We Score Products",
  description: "How PetPalHQ's PetPal Gear Score works: our four-pillar scoring methodology, expert source aggregation, and verdict scale explained.",
};

const PILLARS = [
  {
    name: "Aesthetic Quality",
    weight: "30%",
    icon: "✦",
    description: "Design, finish, and visual appeal. Does this product look premium in a real home? We evaluate expert assessments of materials, color accuracy, and overall design sophistication.",
  },
  {
    name: "Multi-Year Durability",
    weight: "25%",
    icon: "⬥",
    description: "Materials, construction, and longevity through annual setup/teardown/storage cycles. We cross-reference expert claims against owner reviews from year 2+ to verify lasting quality.",
  },
  {
    name: "Setup & Storage",
    weight: "25%",
    icon: "◈",
    description: "How easy is it to set up, take down, and store for 11 months? We combine expert setup assessments with real owner reports about time investment and storage footprint.",
  },
  {
    name: "Value Per Season",
    weight: "20%",
    icon: "◆",
    description: "Not raw price — price divided by expected seasons of use. A $400 tree lasting 15 years ($27/season) scores higher than a $150 tree lasting 3 ($50/season).",
  },
];

const VERDICTS: { verdict: Verdict; range: string; meaning: string }[] = [
  { verdict: "Must Buy", range: "9.0 – 10.0", meaning: "Best-in-class. Will anchor your holiday traditions for a decade." },
  { verdict: "Recommended", range: "8.0 – 8.9", meaning: "Strong performer that expert and owner consensus endorses." },
  { verdict: "Good Value", range: "7.5 – 7.9", meaning: "Solid option — especially for buyers who prioritize specific tradeoffs." },
  { verdict: "Mixed", range: "6.0 – 7.4", meaning: "Some strengths but notable weaknesses. Better options exist for most buyers." },
  { verdict: "Skip", range: "Below 6.0", meaning: "Not recommended. Your money is better spent elsewhere." },
];

const PROCESS_STEPS = [
  {
    icon: Search,
    title: "Gather Expert Sources",
    description: "We identify 3-12+ expert reviews per product from trusted publications: Wirecutter, Consumer Reports, Good Housekeeping, Martha Stewart Living, Architectural Digest, and more.",
  },
  {
    icon: Users,
    title: "Cross-Reference Owner Data",
    description: "Expert claims are verified against hundreds of owner reviews on Amazon and Reddit. A publication may praise a product, but if year-3 owners report failures, that lowers the durability score.",
  },
  {
    icon: BarChart3,
    title: "Score on Four Pillars",
    description: "Each product is rated 0-10 on Aesthetic Quality, Multi-Year Durability, Setup & Storage, and Value Per Season. The weighted composite becomes the ChristmasGear Score.",
  },
  {
    icon: CheckCircle,
    title: "Assign Verdict",
    description: "The composite score determines the verdict: Must Buy, Recommended, Good Value, Mixed, or Skip. Verdicts are consistent across categories and updated when new expert data is available.",
  },
];

function DatasetJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "PetPalHQ Product Scores",
    description: "Expert-aggregated consensus scores for Christmas and holiday products. Methodology: Aesthetic Quality 30% + Multi-Year Durability 25% + Setup & Storage 25% + Value Per Season 20%.",
    url: `${SITE_URL}/methodology`,
    creator: {
      "@type": "Organization",
      name: "PetPalHQ",
      url: SITE_URL,
    },
    variableMeasured: [
      "Aesthetic Quality (0-10)",
      "Multi-Year Durability (0-10)",
      "Setup & Storage (0-10)",
      "Value Per Season (0-10)",
      "ChristmasGear Score (weighted composite, 0-10)",
    ],
    measurementTechnique: "Expert review aggregation with owner data verification",
  };
  // Safe: all values are hardcoded constants, no user input
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default function MethodologyPage() {
  const allReviews = getAllReviewsByScore();

  return (
    <>
      <SiteHeader />
      <DatasetJsonLd />
      <main className="section-padding">
        <div className="container-content">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="editorial-tag mb-4 inline-block">Our Methodology</span>
            <h1 className="text-headline mb-4" style={{ color: "var(--color-evergreen)" }}>
              How the ChristmasGear Score Works
            </h1>
            <p className="text-lg" style={{ fontFamily: "var(--font-editorial)", color: "var(--text-secondary)" }}>
              We aggregate expert reviews and cross-reference owner data to produce a single, transparent score
              for every product we cover. No hands-on testing claims — just rigorous research you can verify.
            </p>
          </div>

          {/* Process Steps */}
          <div className="grid md:grid-cols-4 gap-6 mb-20">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.title} className="gift-card text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full" style={{ background: "hsla(150, 46%, 22%, 0.08)" }}>
                  <step.icon className="w-6 h-6" style={{ color: "var(--color-evergreen)" }} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-antique-gold)", fontFamily: "var(--font-sans)" }}>
                  Step {i + 1}
                </p>
                <h3 className="text-base font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen)" }}>
                  {step.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{step.description}</p>
              </div>
            ))}
          </div>

          {/* Four Pillars */}
          <div className="max-w-3xl mx-auto mb-20">
            <h2 className="text-subheadline text-center mb-8" style={{ color: "var(--color-evergreen)" }}>
              The Four Scoring Pillars
            </h2>
            <div className="space-y-6">
              {PILLARS.map((pillar) => (
                <div key={pillar.name} className="flex gap-4 p-5 rounded-lg" style={{ background: "var(--color-parchment-dark)" }}>
                  <span className="text-2xl shrink-0" style={{ color: "var(--color-antique-gold)" }}>{pillar.icon}</span>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen)" }}>
                        {pillar.name}
                      </h3>
                      <span className="text-sm font-bold" style={{ color: "var(--color-antique-gold)", fontFamily: "var(--font-sans)" }}>
                        {pillar.weight}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{pillar.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict Scale */}
          <div className="max-w-3xl mx-auto mb-20">
            <h2 className="text-subheadline text-center mb-8" style={{ color: "var(--color-evergreen)" }}>
              Verdict Scale
            </h2>
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: "rgba(26, 71, 38, 0.12)" }}>
              {VERDICTS.map((v) => (
                <div
                  key={v.verdict}
                  className="flex items-center gap-4 px-5 py-4 border-b last:border-b-0"
                  style={{ borderColor: "rgba(26, 71, 38, 0.08)" }}
                >
                  <VerdictBadge verdict={v.verdict} size="md" />
                  <span className="text-sm font-semibold w-24 shrink-0" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                    {v.range}
                  </span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{v.meaning}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What We Don't Do */}
          <div className="max-w-3xl mx-auto mb-20 p-6 rounded-lg" style={{ background: "var(--color-parchment-dark)" }}>
            <h2 className="text-subheadline mb-4" style={{ color: "var(--color-evergreen)" }}>
              What We Don&apos;t Do
            </h2>
            <ul className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li><strong>We don&apos;t claim hands-on testing.</strong> Our scores aggregate what trusted expert publications and verified owners report — not our personal experience with every product.</li>
              <li><strong>We don&apos;t accept payment for reviews.</strong> Products earn their score through expert consensus. We earn affiliate commissions if you purchase through our links, but this never affects scoring.</li>
              <li><strong>We don&apos;t inflate scores.</strong> The network-consistent verdict scale means a &quot;Must Buy&quot; here means the same thing it does on our sister sites.</li>
              <li><strong>We don&apos;t hide our sources.</strong> Every scored product lists its expert source count and last-updated date. You can verify our work.</li>
            </ul>
          </div>

          {/* Scored Products Table */}
          {allReviews.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-subheadline text-center mb-8" style={{ color: "var(--color-evergreen)" }}>
                All Scored Products
              </h2>
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: "rgba(26, 71, 38, 0.12)" }}>
                <table className="w-full text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: "rgba(26, 71, 38, 0.08)", color: "var(--text-muted)", background: "var(--color-parchment)" }}>
                      <th className="text-left px-4 py-3">Product</th>
                      <th className="text-left px-4 py-3">Category</th>
                      <th className="text-center px-4 py-3">Score</th>
                      <th className="text-center px-4 py-3">Verdict</th>
                      <th className="text-center px-4 py-3">Sources</th>
                      <th className="text-right px-4 py-3">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allReviews.map((review) => (
                      <tr key={review.id} className="border-b last:border-b-0" style={{ borderColor: "rgba(26, 71, 38, 0.06)" }}>
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                          {review.productName}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{review.category}</td>
                        <td className="px-4 py-3 text-center font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-evergreen)" }}>
                          {review.petpalGearScore.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <VerdictBadge verdict={review.verdict} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>{review.sourcesCount}</td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ fontFamily: "var(--font-heading)" }}>{review.priceRange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
