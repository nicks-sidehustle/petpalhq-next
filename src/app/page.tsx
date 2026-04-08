import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, Dog, Cat, Rabbit, Bird, Fish, Compass } from "lucide-react";
import { siteConfig } from "@/config/site";
import { guides } from "@/data/guides";

export const metadata: Metadata = {
  alternates: { canonical: siteConfig.url },
};

const situations = [
  { title: "New Puppy Checklist", desc: "Everything you need for the first 30 days", href: "/guides", color: "#d4ead0" },
  { title: "Apartment Cat Setup", desc: "Space-saving gear for indoor cats", href: "/guides", color: "#fde8c8" },
  { title: "Senior Dog Essentials", desc: "Comfort and mobility for aging dogs", href: "/guides", color: "#e8e0d0" },
  { title: "First-Time Fish Owner", desc: "Tanks, filters, and starter kits", href: "/guides", color: "#dbeafe" },
];

const categoryIcons = [
  { name: "Dogs", icon: Dog, count: "5+ guides", href: "/reviews/dogs" },
  { name: "Cats", icon: Cat, count: "3+ guides", href: "/reviews/cats" },
  { name: "Small Pets", icon: Rabbit, count: "Coming soon", href: "/reviews/small-pets" },
  { name: "Birds", icon: Bird, count: "Coming soon", href: "/reviews/birds" },
  { name: "Fish", icon: Fish, count: "Coming soon", href: "/reviews/fish" },
  { name: "Outdoor", icon: Compass, count: "Coming soon", href: "/reviews/outdoor-travel" },
];

export default function HomePage() {
  const featuredGuides = guides.filter((g) => g.featured).slice(0, 3);

  return (
    <>
      {/* ─── A. Asymmetric Split Hero ─────────────────────────────────── */}
      <section className="hero-split">
        <div className="flex flex-col justify-center px-8 md:px-16 py-16 md:py-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Expert Pet Gear{" "}
            <span className="italic block" style={{ color: 'var(--terracotta)' }}>Reviews</span>
          </h1>
          <p className="text-base md:text-lg max-w-md mb-8 leading-relaxed" style={{ color: 'var(--hero-muted)' }}>
            Former vet tech Rachel Cooper tests and reviews the best gear for dogs, cats, and every pet in between — so you don&apos;t have to guess.
          </p>
          <div className="flex flex-wrap gap-3 mb-12">
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105"
              style={{ background: 'var(--terracotta)', color: '#fff' }}
            >
              Browse Guides <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/author/rachel-cooper"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:opacity-80"
              style={{ border: '1px solid rgba(107,143,113,0.3)', color: 'var(--hero-foreground)' }}
            >
              Meet Rachel
            </Link>
          </div>
          <div className="flex gap-10 flex-wrap">
            <div>
              <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>10+</div>
              <div className="text-xs mt-1" style={{ color: 'var(--hero-muted)' }}>Products Tested</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>Vet Tech</div>
              <div className="text-xs mt-1" style={{ color: 'var(--hero-muted)' }}>Expert Reviews</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>6</div>
              <div className="text-xs mt-1" style={{ color: 'var(--hero-muted)' }}>Pet Categories</div>
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center justify-center relative">
          <div className="pet-float text-[120px] opacity-80">🐾</div>
        </div>
      </section>

      {/* ─── B. Editor's Pick ─────────────────────────────────────────── */}
      {featuredGuides[0] && (
        <section className="py-16 px-6">
          <div className="mx-auto max-w-5xl">
            <span className="text-xs font-semibold tracking-wider uppercase mb-4 block" style={{ color: 'var(--gold)', fontFamily: 'var(--font-body)' }}>
              This Week&apos;s Pick
            </span>
            <Link href={`/guides/${featuredGuides[0].slug}`} className="block">
              <div className="expert-bar group hover:shadow-lg transition-shadow">
                <div className="flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--forest)', color: 'var(--parchment)' }}>
                    {featuredGuides[0].category}
                  </span>
                  <h2 className="text-2xl mt-3 mb-2 group-hover:opacity-80 transition-opacity" style={{ fontFamily: 'var(--font-heading)' }}>
                    {featuredGuides[0].title}
                  </h2>
                  <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>{featuredGuides[0].excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--terracotta)' }}>
                    Read the Guide <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ─── C. Browse by Situation ───────────────────────────────────── */}
      <section className="py-12 px-6" style={{ background: 'var(--parchment-alt)' }}>
        <div className="mx-auto max-w-5xl">
          <span className="text-xs font-semibold tracking-wider uppercase mb-4 block" style={{ color: 'var(--gold)' }}>
            Find What You Need
          </span>
          <h2 className="text-2xl mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Browse by Situation</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {situations.map((s) => (
              <Link key={s.title} href={s.href} className="category-card group">
                <div className="w-8 h-8 rounded-lg mb-3" style={{ background: s.color }} />
                <h3 className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
                <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── D. Latest Guides ─────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase mb-3 block" style={{ color: 'var(--gold)' }}>
                Buying Guides
              </span>
              <h2 className="text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>Latest Guides</h2>
            </div>
            <Link href="/guides" className="hidden sm:flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--terracotta)' }}>
              All Guides <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredGuides.map((guide) => (
              <Link key={guide.slug} href={`/guides/${guide.slug}`}>
                <article className="review-card group cursor-pointer">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--forest)', color: 'var(--parchment)' }}>
                    {guide.category}
                  </span>
                  <h3 className="text-lg mt-3 mb-2 group-hover:opacity-80 transition-opacity" style={{ fontFamily: 'var(--font-heading)' }}>
                    {guide.title}
                  </h3>
                  <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--ink-soft)' }}>{guide.excerpt}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{guide.readTime}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--terracotta)' }}>
                      Read Guide <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── E. Categories ────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: 'var(--parchment-alt)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-wider uppercase mb-3 block" style={{ color: 'var(--gold)' }}>
              Categories
            </span>
            <h2 className="text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>Browse by Pet</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {categoryIcons.map(({ name, icon: Icon, count, href }) => (
              <Link key={name} href={href}>
                <div className="category-card group text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors" style={{ background: 'rgba(27, 58, 45, 0.1)' }}>
                    <Icon className="w-6 h-6" style={{ color: 'var(--forest)' }} />
                  </div>
                  <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{name}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--gold)' }}>{count}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── F. Expert Bar ────────────────────────────────────────────── */}
      <section className="py-12 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="expert-bar flex-col sm:flex-row text-center sm:text-left">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'var(--forest)', border: '3px solid var(--gold)' }}>
              🩺
            </div>
            <div>
              <p className="font-bold" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem' }}>Rachel Cooper</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                Vet Tech · 10 yrs · 200+ products reviewed
              </p>
              <p className="text-sm mt-2 italic" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ink-soft)' }}>
                &ldquo;Every product I recommend is one I&apos;d trust with my own pets.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── G. Newsletter (inline) ───────────────────────────────────── */}
      <section className="py-6 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl" style={{ background: 'var(--forest)' }}>
            <Mail className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--gold)' }} />
            <p className="text-sm flex-1" style={{ color: 'var(--hero-foreground)', fontFamily: 'var(--font-heading)' }}>
              Get Rachel&apos;s picks every Thursday →
            </p>
            <form className="flex gap-2 w-full sm:w-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="px-4 py-2 rounded-full text-sm outline-none flex-1 sm:w-48"
                style={{ background: 'rgba(240,253,244,0.1)', color: 'var(--hero-foreground)' }}
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-full text-sm font-semibold hover:scale-105 transition-transform"
                style={{ background: 'var(--terracotta)', color: '#fff' }}
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
