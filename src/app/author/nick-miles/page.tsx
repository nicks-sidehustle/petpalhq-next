import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buildOrganizationEntity, buildPersonEntity, SITE_URL } from "@/lib/schema";
import SynthesisCallout from "@/components/SynthesisCallout";

const PAGE_URL = `${SITE_URL}/author/nick-miles`;
const PAGE_DESC =
  "Nick Miles is the editor and founder of PetPalHQ and editor-in-chief of SmartHomeExplorer. He builds buying recommendations on documented expert consensus — veterinary references, peer-reviewed studies, regulatory guidance, manufacturer documentation — rather than first-hand testing.";

export const metadata: Metadata = {
  title: "Nicholas Miles",
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `Nicholas Miles | ${siteConfig.name}`,
    description: PAGE_DESC,
    url: PAGE_URL,
    type: "profile",
  },
};

export default function NickMilesPage() {
  // Spread-and-augment Person entity to add cross-domain sameAs without
  // touching @omc/config (which is the canonical site-config source).
  const personEntity = {
    ...buildPersonEntity(),
    sameAs: [
      "https://www.smarthomeexplorer.com/",
      "https://www.smarthomeexplorer.com/author/nick-miles",
    ],
  };

  const personJsonLd = {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationEntity(), personEntity],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4 py-12">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-teal)" }}
        >
          Editor
        </p>
        <h1
          className="font-serif text-4xl md:text-5xl font-bold mb-2 leading-tight"
          style={{ color: "var(--color-navy)" }}
        >
          Nicholas Miles
        </h1>
        <p
          className="text-base mb-8"
          style={{ color: "var(--color-text-muted)" }}
        >
          Editor &amp; founder, PetPalHQ. Editor-in-Chief, SmartHomeExplorer.
        </p>

        <div className="mb-10 flex items-center gap-5">
          <div
            className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full font-serif text-4xl font-bold"
            style={{
              backgroundColor: "var(--color-coral)",
              color: "var(--color-cream)",
            }}
            aria-label="Nick Miles"
          >
            NM
          </div>
          <p
            className="text-base leading-relaxed max-w-md"
            style={{ color: "var(--color-text)" }}
          >
            Synthesis editor across two affiliate publications. I treat editorial
            discipline as the moat — citing sources by name, dating every
            product check, and naming what I don&apos;t know. I think it&apos;s
            the most honest way to write about pet gear.
          </p>
        </div>

        <div className="prose">
          <p>
            I&apos;m Nick. I edit{" "}
            <Link href="/">PetPalHQ</Link> and the sister site{" "}
            <a
              href="https://www.smarthomeexplorer.com/"
              target="_blank"
              rel="noopener"
            >
              SmartHomeExplorer
            </a>
            . Both sites run on the same editorial principle: synthesis of
            documented expert consensus is more useful — and more honest —
            than one writer&apos;s anecdotes about products they happen to
            own.
          </p>
          <p>
            On PetPalHQ specifically, that means I read across the{" "}
            <a
              href="https://www.merckvetmanual.com/"
              target="_blank"
              rel="noopener"
            >
              Merck Veterinary Manual
            </a>
            , the{" "}
            <a href="https://www.aaha.org/" target="_blank" rel="noopener">
              American Animal Hospital Association
            </a>
            , the{" "}
            <a href="https://www.avma.org/" target="_blank" rel="noopener">
              American Veterinary Medical Association
            </a>
            , the{" "}
            <a href="https://catvets.com/" target="_blank" rel="noopener">
              American Association of Feline Practitioners
            </a>
            , the{" "}
            <a
              href="https://www.vet.cornell.edu/departments/cornell-feline-health-center"
              target="_blank"
              rel="noopener"
            >
              Cornell Feline Health Center
            </a>
            , the{" "}
            <a
              href="https://vet.tufts.edu/petfoodology"
              target="_blank"
              rel="noopener"
            >
              Tufts Cummings Petfoodology
            </a>{" "}
            program, the{" "}
            <a href="https://lafeber.com/vet/" target="_blank" rel="noopener">
              LafeberVet
            </a>{" "}
            avian library, regulatory bodies including the{" "}
            <a
              href="https://www.fda.gov/animal-veterinary"
              target="_blank"
              rel="noopener"
            >
              FDA Center for Veterinary Medicine
            </a>{" "}
            and the{" "}
            <a
              href="https://www.centerforpetsafety.org/"
              target="_blank"
              rel="noopener"
            >
              Center for Pet Safety
            </a>
            , peer-reviewed studies on behavior and training, and the
            hobbyist communities where real-world failure modes show up
            first.
          </p>
        </div>

        <SynthesisCallout
          label="Editor's note"
          heading="I don't run a testing lab."
        >
          <p className="mb-3">
            I do something different. I read deeply, cross-reference, name my
            sources, and build buying recommendations on documented expert
            consensus rather than my own anecdotes. I think it&apos;s the most
            honest way to write about pet gear, and it&apos;s the editorial
            engine behind both sites I edit.
          </p>
          <p className="mb-0">
            One editor with a sample size of one is not more trustworthy than
            ten veterinary references that agree. So I don&apos;t pretend
            otherwise.
          </p>
        </SynthesisCallout>

        <div className="prose">
          <h2>What I do</h2>
          <p>
            I synthesize sources. For every guide, that means pulling
            veterinary guidance for the safety and welfare claims, regulatory
            documents for compliance and food-safety standards, manufacturer
            documentation for spec accuracy, peer-reviewed studies where the
            literature exists, and hobbyist-community signals for the failure
            modes spec sheets don&apos;t advertise. I assemble those signals
            into the PetPal Gear Score — a transparent weighted composite,
            documented in detail on the{" "}
            <Link href="/methodology">methodology page</Link>.
          </p>
          <p>
            I date-stamp every product check. Every guide on this site shows
            its <code>updatedDate</code> and <code>lastProductCheck</code> in
            the SourcesPanel at the bottom of the page; the{" "}
            <Link href="/methodology#latest-data-refreshes">methodology page</Link>{" "}
            renders a live table of the most recent refreshes across the
            site. If a guide is stale, the timestamp will say so.
          </p>

          <h2>What I don&apos;t claim</h2>
          <ul>
            <li>I don&apos;t run a testing lab.</li>
            <li>
              I haven&apos;t personally owned every product on this site, and
              I won&apos;t pretend I have.
            </li>
            <li>
              When I quote a brand, I link to the brand&apos;s own
              documentation so readers can verify the spec.
            </li>
            <li>
              When I cite a peer-reviewed study, I name the authors and the
              year — Salonen 2020, Vieira de Castro 2020, Frank 2010 — so the
              citation is locatable.
            </li>
            <li>
              When I cite a hobbyist-community signal, I label it as such.
              Reddit threads are signal, not authority.
            </li>
            <li>
              The PetPal Gear Score is a composite of expert opinion. It is
              not a laboratory measurement and I don&apos;t describe it as
              one.
            </li>
          </ul>

          <h2>My beat</h2>
          <p>
            PetPalHQ organizes around five hubs and dozens of spoke guides
            beneath each:
          </p>
          <ul>
            <li>
              <Link href="/guides/aquarium-water-quality-cycling-testing-beginners">
                Aquarium water quality, cycling &amp; testing
              </Link>{" "}
              — the nitrogen cycle, water-test kits, conditioners, bacteria
              starters.
            </li>
            <li>
              <Link href="/guides/aquarium-filtration-maintenance-systems">
                Aquarium filtration &amp; maintenance
              </Link>{" "}
              — HOB, canister, sponge filters, media, water-change tools.
            </li>
            <li>
              <Link href="/guides/reptile-habitat-environmental-control">
                Reptile habitat &amp; environmental control
              </Link>{" "}
              — enclosures, UVB lighting, heat, thermostats by species.
            </li>
            <li>
              <Link href="/guides/smart-bird-feeders-backyard-birdwatching">
                Smart bird feeders &amp; backyard birdwatching
              </Link>{" "}
              — AI-cam feeders, seed selection, what the spec sheets miss.
            </li>
            <li>
              Cat &amp; dog care across{" "}
              <Link href="/guides/cat-dog-nutrition-hydration-digestive-health">
                nutrition
              </Link>
              ,{" "}
              <Link href="/guides/cat-dog-grooming-dental-shedding">
                grooming
              </Link>
              ,{" "}
              <Link href="/guides/cat-dog-behavior-anxiety-enrichment">
                behavior &amp; enrichment
              </Link>
              ,{" "}
              <Link href="/guides/pet-home-systems-cleanup-travel">
                home systems &amp; travel
              </Link>
              , and{" "}
              <Link href="/guides/senior-pet-mobility-preventive-care">
                senior-pet preventive care
              </Link>
              .
            </li>
          </ul>

          <h2>Sister site: SmartHomeExplorer</h2>
          <p>
            I&apos;m also editor-in-chief of{" "}
            <a
              href="https://www.smarthomeexplorer.com/"
              target="_blank"
              rel="noopener"
            >
              SmartHomeExplorer
            </a>
            , an established publication covering smart-home gear with the
            same editorial discipline that drives PetPalHQ. The{" "}
            <a
              href="https://www.smarthomeexplorer.com/methodology/"
              target="_blank"
              rel="noopener"
            >
              SmartHomeExplorer methodology page
            </a>{" "}
            describes the same approach in a different vertical: synthesis of
            expert consensus, named sources, dated refresh signals, and a
            transparent score formula. If you&apos;ve read SmartHomeExplorer
            before, the editorial voice on PetPalHQ will feel familiar
            because it&apos;s the same one.
          </p>

          <h2>Get in touch</h2>
          <p>
            Corrections, source suggestions, story ideas, or fact-check
            requests — write me at{" "}
            <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>. I
            read every reply. If a source on this site is out of date or a
            product spec has changed, the fastest way to get it fixed is a
            short email pointing me at the new document — I&apos;ll update
            the guide and credit you in the SourcesPanel if you&apos;d like
            attribution.
          </p>
        </div>
      </article>
    </>
  );
}
