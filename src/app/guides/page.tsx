import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/schema";
import {
  getAllGuides,
  type Guide,
} from "@/lib/guides";

const PAGE_TITLE = "Buying guides & editorial hubs";
const PAGE_DESC =
  "Every PetPalHQ guide, grouped by topic. Ten editorial hubs anchor the site; each hub links to the buying guides for that vertical. Synthesized from veterinary references, regulatory guidance, peer-reviewed studies, and named hobbyist communities — never first-hand testing.";

interface VerticalDef {
  key: string;
  label: string;
  description: string;
  matchVertical: string;
  /** URL-segment aliases that filter to this vertical via ?vertical= */
  aliases: string[];
  /** When set, filter spokes by species membership too. */
  speciesFilter?: 'dog' | 'cat' | 'both';
}

const VERTICALS: VerticalDef[] = [
  {
    key: "dogs",
    label: "Dogs",
    description:
      "Editorial guides for dog owners — leash manners, grooming, behavior, mobility, and home systems. Synthesized from AVMA, AAHA, AVSAB, AKC, the Merck Veterinary Manual, and named manufacturer documentation.",
    matchVertical: "Cats & Dogs",
    aliases: ["dogs", "dog"],
    speciesFilter: "dog",
  },
  {
    key: "cats",
    label: "Cats",
    description:
      "Editorial guides for cat owners — litter boxes, hydration, scratchers, calming, and senior accessibility. Synthesized from AAFP, ISFM, the Cornell Feline Health Center, the Merck Veterinary Manual, and named manufacturer documentation.",
    matchVertical: "Cats & Dogs",
    aliases: ["cats", "cat"],
    speciesFilter: "cat",
  },
  {
    key: "cats-dogs",
    label: "Cats & Dogs",
    description:
      "Five editorial hubs covering nutrition, grooming, behavior, home systems, and senior-pet mobility — for both species, since the underlying veterinary consensus is shared. Spokes here cover dogs and cats together.",
    matchVertical: "Cats & Dogs",
    aliases: ["cats-dogs"],
    speciesFilter: "both",
  },
  {
    key: "aquarium",
    label: "Aquarium",
    description: "Two editorial hubs covering water quality and filtration for freshwater fishkeepers.",
    matchVertical: "Aquarium",
    aliases: ["aquarium"],
  },
  {
    key: "reptile",
    label: "Reptile",
    description: "Two editorial hubs covering habitat environmental control and UVB lighting for reptile keepers.",
    matchVertical: "Reptile",
    aliases: ["reptile"],
  },
  {
    key: "birds",
    label: "Birds",
    description: "Smart bird feeders and backyard birdwatching gear for U.S. yards.",
    matchVertical: "Birds",
    aliases: ["birds", "bird"],
  },
];

/**
 * Whether a spoke should appear under a given vertical filter.
 * - dogs / cats: include single-species + dual-species spokes
 * - cats-dogs (cross-species): include only dual-species spokes
 * - aquarium / reptile / birds: existing category match
 */
function spokeMatchesVertical(spoke: Guide, vertical: VerticalDef): boolean {
  if (vertical.speciesFilter === "dog") {
    return spoke.species?.includes("dog") ?? false;
  }
  if (vertical.speciesFilter === "cat") {
    return spoke.species?.includes("cat") ?? false;
  }
  if (vertical.speciesFilter === "both") {
    return Boolean(
      spoke.species?.includes("dog") && spoke.species?.includes("cat"),
    );
  }
  // Aquarium / Reptile / Birds — match by hub vertical
  return HUB_DISPLAY[spoke.hub ?? ""]?.vertical === vertical.matchVertical;
}

interface HubMeta {
  label: string;
  vertical: string;
}

const HUB_DISPLAY: Record<string, HubMeta> = {
  "aquarium-water-quality-cycling-testing-beginners": { label: "Water Quality & Cycling", vertical: "Aquarium" },
  "aquarium-filtration-maintenance-systems": { label: "Filtration & Maintenance", vertical: "Aquarium" },
  "reptile-habitat-environmental-control": { label: "Habitat & Environmental Control", vertical: "Reptile" },
  "reptile-uvb-lighting-basking": { label: "UVB Lighting & Basking", vertical: "Reptile" },
  "smart-bird-feeders-backyard-birdwatching": { label: "Smart Feeders & Backyard Birding", vertical: "Birds" },
  "cat-dog-nutrition-hydration-digestive-health": { label: "Nutrition, Hydration & Digestive Health", vertical: "Cats & Dogs" },
  "cat-dog-grooming-dental-shedding": { label: "Grooming, Dental & Shedding", vertical: "Cats & Dogs" },
  "cat-dog-behavior-anxiety-enrichment": { label: "Behavior, Anxiety & Enrichment", vertical: "Cats & Dogs" },
  "pet-home-systems-cleanup-travel": { label: "Home Systems, Cleanup & Travel", vertical: "Cats & Dogs" },
  "senior-pet-mobility-preventive-care": { label: "Senior Mobility & Preventive Care", vertical: "Cats & Dogs" },
};

const HUB_ORDER = Object.keys(HUB_DISPLAY);

const PAGE_URL = `${SITE_URL}/guides`;

export const metadata: Metadata = {
  title: "Buying Guides",
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `${PAGE_TITLE} | ${siteConfig.name}`,
    description: PAGE_DESC,
    url: PAGE_URL,
    type: "website",
  },
};

interface GuidesPageProps {
  searchParams: Promise<{ vertical?: string }>;
}

export default async function GuidesIndexPage({ searchParams }: GuidesPageProps) {
  const params = await searchParams;
  const verticalParam = (params.vertical || "").toLowerCase();
  const activeVertical = VERTICALS.find((v) => v.aliases.includes(verticalParam));

  const allGuides = getAllGuides();
  const visibleVerticals = activeVertical ? [activeVertical] : VERTICALS;

  // Group all guides under their hub. Hubs come first, spokes after.
  // When a single species vertical is active, filter spokes by species membership.
  function groupByHub(
    guides: Guide[],
    vertical: VerticalDef | undefined,
  ): { hubSlug: string; hub?: Guide; spokes: Guide[] }[] {
    return HUB_ORDER.map((hubSlug) => {
      const hubSpokes = guides
        .filter((g) => g.guideType === "spoke" && g.hub === hubSlug)
        .filter((g) => (vertical ? spokeMatchesVertical(g, vertical) : true))
        .sort((a, b) => a.title.localeCompare(b.title));
      return {
        hubSlug,
        hub: guides.find((g) => g.slug === hubSlug),
        spokes: hubSpokes,
      };
    });
  }

  const grouped = groupByHub(allGuides, activeVertical);
  const totalVisible = grouped
    .filter((g) => visibleVerticals.some((v) => HUB_DISPLAY[g.hubSlug]?.vertical === v.matchVertical))
    .reduce((sum, g) => sum + (g.hub ? 1 : 0) + g.spokes.length, 0);

  return (
    <article className="max-w-6xl mx-auto px-4 py-12 md:py-16">
      <header className="mb-10 max-w-3xl">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-teal)" }}
        >
          Editorial guides
        </p>
        <h1
          className="font-serif text-4xl md:text-5xl font-bold mb-4 leading-tight"
          style={{ color: "var(--color-navy)" }}
        >
          {PAGE_TITLE}
        </h1>
        <p
          className="text-base leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          {PAGE_DESC}
        </p>
      </header>

      {/* Filter bar */}
      <nav
        aria-label="Filter by vertical"
        className="flex flex-wrap items-center gap-2 mb-10 pb-6 border-b"
        style={{ borderColor: "rgba(0,0,0,0.08)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest mr-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          Filter:
        </span>
        <FilterPill href="/guides" label="All" active={!activeVertical} />
        {VERTICALS.map((v) => (
          <FilterPill
            key={v.key}
            href={`/guides?vertical=${v.key}`}
            label={v.label}
            active={activeVertical?.key === v.key}
          />
        ))}
        {activeVertical && (
          <span
            className="ml-auto text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Showing {totalVisible} guides in {activeVertical.label}
          </span>
        )}
      </nav>

      {/* Vertical sections */}
      {visibleVerticals.map((vertical) => {
        const verticalGroups = grouped.filter(
          (g) => HUB_DISPLAY[g.hubSlug]?.vertical === vertical.matchVertical
        );
        if (verticalGroups.length === 0) return null;

        return (
          <section key={vertical.key} className="mb-16">
            <header className="mb-8">
              <h2
                className="font-serif text-2xl md:text-3xl font-bold mb-2"
                style={{ color: "var(--color-navy)" }}
              >
                {vertical.label}
              </h2>
              <p
                className="text-sm max-w-3xl leading-relaxed"
                style={{ color: "var(--color-text-muted)" }}
              >
                {vertical.description}
              </p>
            </header>

            {verticalGroups.map(({ hubSlug, hub, spokes }) => (
              <div key={hubSlug} className="mb-12 last:mb-0">
                {hub && (
                  <div className="mb-5">
                    <HubFeatureCard hub={hub} display={HUB_DISPLAY[hubSlug]} />
                  </div>
                )}

                {spokes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pl-0 md:pl-4 md:border-l-2" style={{ borderColor: "var(--color-cream-deep)" }}>
                    {spokes.map((s) => (
                      <SpokeCard
                        key={s.slug}
                        spoke={s}
                        activeVerticalKey={activeVertical?.key}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        );
      })}
    </article>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
      style={
        active
          ? {
              backgroundColor: "var(--color-navy)",
              color: "white",
            }
          : {
              backgroundColor: "var(--color-cream-deep)",
              color: "var(--color-navy)",
            }
      }
    >
      {label}
    </Link>
  );
}

function HubFeatureCard({ hub, display }: { hub: Guide; display?: HubMeta }) {
  return (
    <Link
      href={`/guides/${hub.slug}`}
      className="group flex flex-col md:flex-row gap-5 bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
    >
      <div
        className="relative w-full md:w-72 flex-shrink-0 aspect-[16/9] md:aspect-auto"
        style={{ backgroundColor: "var(--color-cream-deep)" }}
      >
        {hub.heroImage && (
          <Image
            src={hub.heroImage}
            alt=""
            fill
            sizes="(min-width: 768px) 288px, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex-1 p-5 md:p-6">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--color-teal)" }}
        >
          Editorial Hub · {display?.vertical || hub.category}
        </p>
        <h3
          className="font-serif text-xl md:text-2xl font-bold mb-2 leading-snug group-hover:underline"
          style={{ color: "var(--color-navy)" }}
        >
          {display?.label || hub.title}
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          {hub.excerpt}
        </p>
      </div>
    </Link>
  );
}

function SpokeCard({
  spoke,
  activeVerticalKey,
}: {
  spoke: Guide;
  activeVerticalKey?: string;
}) {
  // Show "Also covers cats/dogs" pill when a dual-species spoke is being
  // viewed under a single-species filter. Tells the dog reader they're not
  // missing cat coverage and vice versa.
  const isDual = Boolean(
    spoke.species?.includes("dog") && spoke.species?.includes("cat"),
  );
  const otherSpecies =
    activeVerticalKey === "dogs" ? "cats" : activeVerticalKey === "cats" ? "dogs" : null;
  const showAlsoCoversPill = isDual && otherSpecies !== null;

  return (
    <Link
      href={`/guides/${spoke.slug}`}
      className="group block bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div
        className="relative aspect-[16/9]"
        style={{ backgroundColor: "white" }}
      >
        {spoke.heroImage && (
          <Image
            src={spoke.heroImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-teal)" }}
          >
            Buying Guide
          </p>
          {showAlsoCoversPill && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest"
              style={{
                backgroundColor: "var(--color-cream-deep)",
                color: "var(--color-teal)",
              }}
            >
              Also covers {otherSpecies}
            </span>
          )}
        </div>
        <h4
          className="font-serif text-base font-bold mb-1.5 leading-snug group-hover:underline line-clamp-2"
          style={{ color: "var(--color-navy)" }}
        >
          {spoke.title}
        </h4>
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          {spoke.excerpt}
        </p>
      </div>
    </Link>
  );
}
