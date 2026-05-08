import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { getAllGuides, type Guide } from "@/lib/guides"
import { siteConfig } from "@/config/site"
import { SITE_URL } from "@/lib/schema"

const PAGE_TITLE = "PetPal Playground — Unserious Pet Gear for Pets with Personality"
const PAGE_DESC =
  "Costume picks, novelty gear, and pop-culture pet finds your followers will text you about. We still flag the actual safety considerations because we are who we are."
const PAGE_URL = `${SITE_URL}/playground`

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
}

export default function PlaygroundPage() {
  const allGuides = getAllGuides()
  const playgroundGuides = allGuides.filter(
    (g) => g.category.toLowerCase() === "playground",
  )

  return (
    <article className="max-w-6xl mx-auto px-4 py-12 md:py-16">
      {/* Hero header */}
      <header className="mb-12 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 bg-fuchsia-100 text-fuchsia-700">
          <span aria-hidden="true">🎪</span>
          <span>PetPal Playground</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-5 leading-tight text-fuchsia-700">
          Welcome to the Playground
        </h1>
        <p className="text-lg leading-relaxed text-gray-700 max-w-2xl">
          {PAGE_DESC}
        </p>

        {/* Cross-link to serious side */}
        <p className="mt-6 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Looking for vet-cited buying guides?{" "}
          <Link
            href="/guides"
            className="font-semibold underline hover:opacity-75 transition-opacity"
            style={{ color: "var(--color-teal)" }}
          >
            Visit PetPalHQ Guides →
          </Link>
        </p>
      </header>

      {/* Guide grid or empty state */}
      {playgroundGuides.length > 0 ? (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playgroundGuides.map((guide) => (
              <PlaygroundCard key={guide.slug} guide={guide} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState />
      )}
    </article>
  )
}

function PlaygroundCard({ guide }: { guide: Guide }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block bg-white rounded-xl overflow-hidden border-2 border-fuchsia-100 hover:border-fuchsia-300 hover:shadow-lg transition-all"
    >
      <div className="relative aspect-[16/9] bg-fuchsia-50">
        {guide.heroImage && (
          <Image
            src={guide.heroImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-fuchsia-600">
          Playground Pick
        </p>
        <h2
          className="font-serif text-lg font-bold mb-2 leading-snug group-hover:underline line-clamp-2"
          style={{ color: "var(--color-navy)" }}
        >
          {guide.title}
        </h2>
        <p
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          {guide.excerpt || guide.description}
        </p>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 bg-fuchsia-50 px-8 py-16 text-center max-w-xl mx-auto">
      <div className="text-5xl mb-4" aria-hidden="true">
        🐾
      </div>
      <h2
        className="font-serif text-2xl font-bold mb-3"
        style={{ color: "var(--color-navy)" }}
      >
        Launching shortly
      </h2>
      <p className="text-base leading-relaxed mb-6" style={{ color: "var(--color-text-muted)" }}>
        First Playground picks are launching shortly — bookmark this page or follow PetPalHQ for the kickoff.
      </p>
      <Link
        href="/guides"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{
          backgroundColor: "var(--color-navy)",
          color: "white",
        }}
      >
        Browse vet-cited guides →
      </Link>
    </div>
  )
}
