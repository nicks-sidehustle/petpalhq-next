import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import { Guide } from "@/lib/guides";

interface GuidesSectionProps {
  guides: Guide[];
}

export function GuidesSection({ guides }: GuidesSectionProps) {
  if (!guides.length) return null;

  return (
    <section className="py-20 md:py-28 candle-glow">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="editorial-tag mb-4 inline-block">Buying Guides</span>
            <h2 className="text-3xl md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
              Expert-Consensus Guides
            </h2>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              In-depth comparisons to help you choose the right gear
            </p>
          </div>
          <Link
            href="/guides"
            className="hidden md:flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all"
            style={{ color: "var(--brand-red)" }}
          >
            All 36 Guides <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Gift-tag card grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {guides.slice(0, 6).map((guide) => (
            <Link key={guide.slug} href={`/guides/${guide.slug}`}>
              <article className="gift-card group cursor-pointer h-full flex flex-col">
                <div className="aspect-[4/3] overflow-hidden relative" style={{ background: "var(--brand-cream-dark)" }}>
                  {guide.image && (
                    <Image
                      src={guide.image}
                      alt={guide.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: "var(--brand-red)", color: "#fff" }}
                    >
                      {guide.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      <Clock className="w-3 h-3" /> {guide.readTime}
                    </span>
                  </div>
                  <h3 className="text-lg mb-2 leading-snug" style={{ fontFamily: "var(--font-heading)" }}>
                    {guide.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: "var(--text-muted)" }}>
                    {guide.excerpt}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all"
                    style={{ color: "var(--brand-red)" }}
                  >
                    Read Guide <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/guides"
            className="inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--brand-red)" }}
          >
            View All Guides <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
