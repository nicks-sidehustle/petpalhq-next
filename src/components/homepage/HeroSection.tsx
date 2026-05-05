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
      <div className="absolute inset-0 candle-glow" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-antique-gold)]/40 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-[680px] max-w-7xl lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex items-center px-6 py-16 sm:px-10 lg:px-14">
          <div className="max-w-xl">
            <span className="editorial-tag mb-6 inline-block">The Holiday Gear Almanac</span>
            <h1 className="text-display mb-6" style={{ color: "var(--color-evergreen-deep)" }}>
              Holiday gear chosen for<br />
              <span className="italic" style={{ color: "var(--color-cranberry)" }}>quality and taste.</span>
            </h1>
            <p className="text-lg sm:text-xl max-w-lg mb-8 leading-8" style={{ fontFamily: "var(--font-editorial)", color: "var(--text-secondary)" }}>
              We aggregate expert reviews and cross-reference owner data to score every product on design quality, durability, and value per season — so you can choose with confidence.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:-translate-y-0.5"
                style={{ background: "var(--color-cranberry)", fontFamily: "var(--font-sans)" }}
              >
                Browse Gift Guides <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/guides?pillar=tree-setup"
                className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-bold tracking-wide transition-all hover:-translate-y-0.5 hover:bg-white"
                style={{ borderColor: "var(--color-antique-gold)", color: "var(--color-evergreen-deep)", fontFamily: "var(--font-sans)" }}
              >
                Start with premium trees
              </Link>
            </div>

            {/* Trust signals replace vanity stats */}
            <div className="flex flex-wrap gap-5 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-evergreen)" }} />
                Expert-aggregated scores
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

        <div className="relative min-h-[420px] lg:min-h-full">
          <Image
            src="https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1400&q=85"
            alt="Warm Christmas tree, lights, and wrapped gifts in a refined holiday room"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 58vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-evergreen-deep)]/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[var(--color-parchment)]/20 lg:via-transparent lg:to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 p-5 shadow-2xl backdrop-blur-sm sm:left-auto sm:max-w-md" style={{ background: "hsla(150, 50%, 16%, 0.85)", color: "var(--color-parchment)" }}>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-antique-gold)", fontFamily: "var(--font-sans)" }}>
              How we score products
            </p>
            <div className="grid gap-2 text-sm leading-6">
              {[
                "Aesthetic Quality 30% — does it look premium?",
                "Multi-Year Durability 25% — will it last?",
                "Setup & Storage 25% — is it worth your time?",
                "Value Per Season 20% — cost per year of use",
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
