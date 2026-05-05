import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  guideCount: number;
  productCount: number;
}

export function HeroSection({ guideCount, productCount }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden" style={{ background: "var(--color-parchment)" }}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-antique-gold)]/40 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-[680px] max-w-7xl lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex items-center px-6 py-16 sm:px-10 lg:px-14">
          <div className="max-w-xl">
            <span className="editorial-tag mb-6 inline-block">Expert Consensus, Synthesized</span>
            <h1 className="text-display mb-6" style={{ color: "var(--color-evergreen-deep)" }}>
              Pet gear chosen by<br />
              <span className="italic" style={{ color: "var(--color-cranberry)" }}>expert consensus.</span>
            </h1>
            <p className="text-lg sm:text-xl max-w-lg mb-8 leading-8" style={{ fontFamily: "var(--font-editorial)", color: "var(--text-secondary)" }}>
              We read 20+ expert sources per category — veterinarians, aquarists, herpetologists, and ornithologists — then synthesize where professional opinion genuinely converges. Aquarium, reptile, and bird gear scored on five fixed pillars.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:-translate-y-0.5"
                style={{ background: "var(--color-cranberry)", fontFamily: "var(--font-sans)" }}
              >
                Browse All Guides <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/guides?pillar=water-quality"
                className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-bold tracking-wide transition-all hover:-translate-y-0.5 hover:bg-white"
                style={{ borderColor: "var(--color-antique-gold)", color: "var(--color-evergreen-deep)", fontFamily: "var(--font-sans)" }}
              >
                Start with aquarium water quality
              </Link>
            </div>

            {/* Trust signals replace vanity stats */}
            <div className="flex flex-wrap gap-5 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-evergreen)" }} />
                Expert-synthesis scoring
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-evergreen)" }} />
                Transparent methodology
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-evergreen)" }} />
                No fake testing claims
              </span>
            </div>
          </div>
        </div>

        <div className="relative min-h-[420px] lg:min-h-full flex items-center justify-center" style={{ background: "var(--color-evergreen-deep)" }}>
          <Image
            src="/logo-on-dark.png"
            alt="PetPalHQ — pet gear through expert consensus"
            width={620}
            height={350}
            priority
            className="object-contain p-12 max-w-full"
            sizes="(max-width: 1024px) 90vw, 50vw"
          />
          <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 p-5 shadow-2xl backdrop-blur-sm sm:left-auto sm:max-w-md" style={{ background: "rgba(19, 40, 78, 0.85)", color: "var(--color-parchment)" }}>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-antique-gold)", fontFamily: "var(--font-sans)" }}>
              How we score products
            </p>
            <div className="grid gap-2 text-sm leading-6">
              {[
                "Expert Consensus 30% — agreement across surveyed sources",
                "Effectiveness 25% — does it reliably do its job?",
                "Animal Safety 20% — chemical, thermal, mechanical safety",
                "Durability 15% — multi-year reliability",
                "Value 10% — price-to-quality given lifespan",
              ].map((item) => (
                <span key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-antique-gold)" }} />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
