import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { siteConfig, categories } from "@/config/site";
import { SITE_URL } from "@/lib/schema";
import {
  getAllGuides,
  getAllGuideSummaries,
  type Guide,
  type GuideSummary,
} from "@/lib/guides";
import SynthesisCallout from "@/components/SynthesisCallout";
import NewsletterInline from "@/components/homepage/NewsletterInline";

const HOME_DESC =
  "PetPalHQ is editorial synthesis of expert consensus for dog, cat, aquarium, reptile, and bird owners. We don't run a testing lab — we cite veterinary references, regulatory guidance, peer-reviewed studies, and manufacturer documentation by name, and date every refresh.";

interface HubDisplay {
  label: string;
  vertical: string;
}

const HUB_DISPLAY: Record<string, HubDisplay> = {
  "aquarium-water-quality-cycling-testing-beginners": {
    label: "Water Quality & Cycling",
    vertical: "Aquarium",
  },
  "aquarium-filtration-maintenance-systems": {
    label: "Filtration & Maintenance",
    vertical: "Aquarium",
  },
  "reptile-habitat-environmental-control": {
    label: "Habitat & Environmental Control",
    vertical: "Reptile",
  },
  "reptile-uvb-lighting-basking": {
    label: "UVB Lighting & Basking",
    vertical: "Reptile",
  },
  "smart-bird-feeders-backyard-birdwatching": {
    label: "Smart Feeders & Backyard Birding",
    vertical: "Birds",
  },
  "cat-dog-nutrition-hydration-digestive-health": {
    label: "Nutrition, Hydration & Digestive Health",
    vertical: "Cats & Dogs",
  },
  "cat-dog-grooming-dental-shedding": {
    label: "Grooming, Dental & Shedding",
    vertical: "Cats & Dogs",
  },
  "cat-dog-behavior-anxiety-enrichment": {
    label: "Behavior, Anxiety & Enrichment",
    vertical: "Cats & Dogs",
  },
  "pet-home-systems-cleanup-travel": {
    label: "Home Systems, Cleanup & Travel",
    vertical: "Cats & Dogs",
  },
  "senior-pet-mobility-preventive-care": {
    label: "Senior Mobility & Preventive Care",
    vertical: "Cats & Dogs",
  },
};

const HUB_ORDER = Object.keys(HUB_DISPLAY);

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — ${siteConfig.tagline}` },
  description: HOME_DESC,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: HOME_DESC,
    url: SITE_URL,
    type: "website",
  },
};

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

export default function HomePage() {
  const allGuides = getAllGuides();

  const hubs: Guide[] = HUB_ORDER
    .map((slug) => allGuides.find((g) => g.slug === slug))
    .filter((g): g is Guide => Boolean(g));

  const latest: GuideSummary[] = [...getAllGuideSummaries()]
    .filter((g) => g.updatedDate)
    .sort((a, b) => b.updatedDate.localeCompare(a.updatedDate))
    .slice(0, 6);

  const totalGuides = allGuides.length;
  const spokeCount = allGuides.filter((g) => g.guideType === "spoke").length;
  const hubCount = allGuides.filter((g) => g.guideType === "hub").length;

  return (
    <>
      {/* Hero — cream-deep, typography-forward, matches methodology page voice */}
      <section
        className="border-b"
        style={{
          backgroundColor: "var(--color-cream-deep)",
          borderColor: "rgba(0,0,0,0.05)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--color-teal-deep)" }}
          >
            PetPalHQ · Editorial synthesis · {totalGuides} guides
          </p>
          <h1
            className="font-serif text-4xl md:text-6xl font-bold leading-tight mb-5"
            style={{ color: "var(--color-navy)" }}
          >
            Pet gear, through expert consensus.
          </h1>
          <p
            className="text-lg md:text-xl leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ color: "var(--color-text)" }}
          >
            We don&apos;t run a testing lab. We synthesize what veterinary
            references, regulators, peer-reviewed studies, and hobbyist
            communities actually agree on — then cite every claim by name
            and date the refresh.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/guides"
              className="inline-flex items-center px-6 py-3 rounded-md text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--color-coral)",
                color: "white",
              }}
            >
              Browse all guides
            </Link>
            <Link
              href="/methodology"
              className="inline-flex items-center px-6 py-3 rounded-md text-sm font-semibold transition-colors"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-navy)",
                border: "1px solid var(--color-navy)",
              }}
            >
              How we evaluate
            </Link>
          </div>
          <p
            className="text-xs mt-8 max-w-xl mx-auto"
            style={{ color: "var(--color-text-muted)" }}
          >
            {hubCount} editorial hubs · {spokeCount} buying guides · sources cited by name
            · refresh dates on every page
          </p>
        </div>
      </section>

      {/* Browse by pet — compact icon tiles, replaces the dense hub-card grid */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="mb-8 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-teal)" }}
          >
            Browse by pet
          </p>
          <h2
            className="font-serif text-3xl md:text-4xl font-bold"
            style={{ color: "var(--color-navy)" }}
          >
            Pick your vertical
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/guides?vertical=${cat.slug}`}
              className="flex flex-col items-center justify-center gap-2 rounded-lg py-7 md:py-8 text-white text-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: CATEGORY_COLORS[cat.id] || "var(--color-navy)" }}
            >
              <span className="text-3xl md:text-4xl">{cat.icon}</span>
              <span className="text-sm font-semibold">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Editorial hubs — compact list grouped by vertical */}
      <section
        className="max-w-5xl mx-auto px-4 py-12 md:py-14 border-t"
        style={{ borderColor: "rgba(0,0,0,0.08)" }}
      >
        <div className="mb-8 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--color-teal)" }}
          >
            Editorial hubs
          </p>
          <h2
            className="font-serif text-2xl md:text-3xl font-bold mb-2"
            style={{ color: "var(--color-navy)" }}
          >
            Topic-anchored buying guides
          </h2>
          <p
            className="text-sm max-w-2xl mx-auto"
            style={{ color: "var(--color-text-muted)" }}
          >
            Each hub synthesizes expert consensus on a topic and links to the buying guides for that vertical.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {hubs.map((hub) => (
            <HubLink
              key={hub.slug}
              hub={hub}
              display={HUB_DISPLAY[hub.slug]}
            />
          ))}
        </div>
      </section>

      {/* Latest 6 guide updates */}
      <section
        className="border-y"
        style={{
          backgroundColor: "var(--color-cream-deep)",
          borderColor: "rgba(0,0,0,0.05)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-16">
          <div className="mb-10 flex items-end justify-between flex-wrap gap-3">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--color-teal-deep)" }}
              >
                Most recent
              </p>
              <h2
                className="font-serif text-3xl md:text-4xl font-bold"
                style={{ color: "var(--color-navy)" }}
              >
                Latest guide updates
              </h2>
            </div>
            <Link
              href="/methodology#latest-data-refreshes"
              className="text-sm font-medium hover:underline"
              style={{ color: "var(--color-teal-deep)" }}
            >
              See full refresh log →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latest.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust callout */}
      <section className="max-w-3xl mx-auto px-4 py-14">
        <SynthesisCallout
          label="Why we're different"
          heading="Cited by name. Synthesized by editors. Dated on every page."
        >
          <p className="mb-3">
            Every claim on this site is sourced. Veterinary references — the{" "}
            <a href="https://www.merckvetmanual.com/" target="_blank" rel="noopener">
              Merck Veterinary Manual
            </a>
            , the{" "}
            <a href="https://www.aaha.org/" target="_blank" rel="noopener">
              American Animal Hospital Association
            </a>{" "}
            (AAHA), the{" "}
            <a href="https://www.avma.org/" target="_blank" rel="noopener">
              American Veterinary Medical Association
            </a>{" "}
            (AVMA), the AAFP, ISFM, Cornell Feline Health Center, and Tufts —
            anchor the safety claims. Peer-reviewed studies anchor the behavior
            and treatment claims. Manufacturer pages, cited as such, anchor the
            spec claims. Hobbyist communities are signal, never authority.
          </p>
          <p className="mb-0">
            And every guide is dated: top-of-page <code>updatedDate</code> for
            editorial, <code>lastProductCheck</code> for pricing. The full
            framework — weighted score formula, named source stack, refresh
            policy — lives on the{" "}
            <Link href="/methodology">methodology page</Link>.
          </p>
        </SynthesisCallout>
      </section>

      {/* Newsletter */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <NewsletterInline />
      </section>
    </>
  );
}

interface HubLinkProps {
  hub: Guide;
  display?: HubDisplay;
}

const CATEGORY_COLORS: Record<string, string> = {
  dogs: "var(--color-navy)",
  cats: "var(--color-teal)",
  aquarium: "var(--color-teal-deep)",
  reptile: "var(--color-green)",
  birds: "var(--color-coral)",
};

function HubLink({ hub, display }: HubLinkProps) {
  return (
    <Link
      href={`/guides/${hub.slug}`}
      className="group flex items-center gap-3 py-3 border-b transition-colors"
      style={{ borderColor: "rgba(0,0,0,0.06)" }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
          style={{ color: "var(--color-teal)" }}
        >
          {display?.vertical || hub.category}
        </p>
        <p
          className="font-serif text-base font-semibold group-hover:underline"
          style={{ color: "var(--color-navy)" }}
        >
          {display?.label || hub.title}
        </p>
      </div>
      <span
        className="text-lg transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--color-text-muted)" }}
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  );
}

interface GuideCardProps {
  guide: GuideSummary;
}

function GuideCard({ guide }: GuideCardProps) {
  const isHub = HUB_DISPLAY[guide.slug] !== undefined;
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
    >
      <div
        className="relative aspect-[16/9]"
        style={{ backgroundColor: "white" }}
      >
        {guide.heroImage && (
          <Image
            src={guide.heroImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="p-5">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2"
          style={{ color: "var(--color-teal)" }}
        >
          <span>{isHub ? "Editorial Hub" : "Buying Guide"}</span>
          <span style={{ color: "var(--color-text-muted)" }}>·</span>
          <span style={{ color: "var(--color-text-muted)" }}>
            {formatDate(guide.updatedDate)}
          </span>
        </p>
        <h3
          className="font-serif text-lg font-bold mb-2 leading-snug group-hover:underline"
          style={{ color: "var(--color-navy)" }}
        >
          {guide.title}
        </h3>
        <p
          className="text-sm leading-relaxed line-clamp-3"
          style={{ color: "var(--color-text-muted)" }}
        >
          {guide.excerpt}
        </p>
      </div>
    </Link>
  );
}
