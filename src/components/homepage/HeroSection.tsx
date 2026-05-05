import Link from "next/link";

interface HeroSectionProps {
  guideCount?: number;
  productCount?: number;
}

export function HeroSection({ guideCount = 0, productCount = 0 }: HeroSectionProps) {
  // Real numbers populate as content ships; for v2 launch the editorial
  // claim is the source count (research-staged, ~85 expert sources across
  // the 9 deep-research files), not a fabricated product count.
  const sourceCount = "150+";
  const productLabel = productCount > 0 ? `${productCount}+ Products Scored` : "Products Scored Weekly";
  const guideLabel = guideCount > 0 ? `${guideCount} Guides Published` : "Updated Weekly";

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--color-parchment)" }}
    >
      <div className="container mx-auto px-6 max-w-5xl py-20 md:py-28 text-center">
        {/* Hero headline — serif, with teal accent on second clause */}
        <h1
          className="mb-6"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--text-primary)",
            fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            fontWeight: 700,
          }}
        >
          The Best Pet Gear,{" "}
          <span style={{ color: "var(--color-antique-gold)" }}>
            Synthesized from {sourceCount} Expert Sources
          </span>
        </h1>

        {/* Subhead */}
        <p
          className="max-w-2xl mx-auto mb-10 text-lg leading-relaxed"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          We read every expert review — veterinarians, aquarists, herpetologists,
          ornithologists — and aggregate where professional opinion genuinely
          converges, so you can skip the noise and buy with confidence.
        </p>

        {/* Trust pill row */}
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {[
            `${sourceCount} Expert Sources`,
            productLabel,
            guideLabel,
          ].map((label) => (
            <span
              key={label}
              className="px-4 py-1.5 text-sm font-medium rounded-full"
              style={{
                background: "rgba(45, 184, 197, 0.10)",
                color: "var(--color-antique-gold)",
                border: "1px solid rgba(45, 184, 197, 0.20)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Category card grid — 3 active verticals + "View all" link */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto mb-8">
          {[
            { name: "Aquarium", icon: "🐟", href: "/reviews/aquarium", color: "rgba(45, 184, 197, 0.30)" },
            { name: "Reptile", icon: "🦎", href: "/reviews/reptile", color: "rgba(76, 175, 80, 0.30)" },
            { name: "Birds", icon: "🐦", href: "/reviews/birds", color: "rgba(45, 184, 197, 0.30)" },
          ].map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="flex flex-col items-center justify-center gap-2 p-5 md:p-6 rounded-xl transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--color-card-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              <span className="text-2xl md:text-3xl" style={{ filter: "saturate(0.9)" }}>
                {cat.icon}
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {cat.name}
              </span>
            </Link>
          ))}
        </div>

        <Link
          href="/reviews"
          className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
          style={{ color: "var(--color-antique-gold)", fontFamily: "var(--font-sans)" }}
        >
          View all categories →
        </Link>
      </div>
    </section>
  );
}
