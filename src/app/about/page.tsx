import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buildOrganizationEntity, SITE_URL } from "@/lib/schema";
import SynthesisCallout from "@/components/SynthesisCallout";

const PAGE_URL = `${SITE_URL}/about`;
const PAGE_DESC =
  "PetPalHQ is an editorial synthesis of expert consensus for pet owners — veterinary references, regulatory guidance, manufacturer documentation, and hobbyist communities, distilled into practical gear recommendations with named sources and dated refresh signals.";

export const metadata: Metadata = {
  title: "About PetPalHQ",
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "About PetPalHQ",
    description: PAGE_DESC,
    url: PAGE_URL,
    type: "website",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [buildOrganizationEntity()],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <article className="max-w-3xl mx-auto px-4 py-12">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-teal)" }}
        >
          About
        </p>
        <h1
          className="font-serif text-4xl md:text-5xl font-bold mb-6 leading-tight"
          style={{ color: "var(--color-navy)" }}
        >
          Pet gear, through expert consensus.
        </h1>

        <div className="prose">
          <p>
            PetPalHQ is an editorial synthesis of expert consensus for dog,
            cat, aquarium, reptile, and bird owners. We don&apos;t run a
            testing lab. We do something more useful — and we cite the work:
            we read across veterinary references, regulatory guidance,
            peer-reviewed studies, manufacturer documentation, and hobbyist
            communities, and we surface what the experts actually agree on.
            Authority through transparency and citation, not first-hand
            testing.
          </p>

          <h2>Why this site exists</h2>
          <p>
            Pet content online is split between two failure modes.
            High-trust sources — the{" "}
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
            </a>{" "}
            (AAHA), the{" "}
            <a href="https://www.avma.org/" target="_blank" rel="noopener">
              American Veterinary Medical Association
            </a>{" "}
            (AVMA), the{" "}
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
            program, peer-reviewed journals — are dense, paywalled in places,
            and not written for someone shopping at midnight. The other half
            of the internet is influencer hot takes optimized for engagement,
            with no source attribution and a straight-line incentive to
            recommend whatever was bought. PetPalHQ exists to close that gap:
            we synthesize the high-trust references into the readability of
            the influencer post, with full source attribution by name.
          </p>
        </div>

        <SynthesisCallout>
          <p className="mb-3">
            We do not run a testing lab. Every recommendation is editorial
            synthesis of expert sources we name in the body of every guide.
            One editor with a sample size of one is not more trustworthy
            than the consensus of veterinary references, peer-reviewed
            studies, and regulatory bodies — combined.
          </p>
          <p className="mb-0">
            When ten experts converge on the same answer, that&apos;s a
            signal. When they disagree, that&apos;s also a signal — and we
            say so. The full framework lives on the{" "}
            <Link href="/methodology">methodology page</Link>.
          </p>
        </SynthesisCallout>

        <div className="prose">
          <p>
            The full source stack — by name — includes the references above
            plus the{" "}
            <a href="https://catvets.com/" target="_blank" rel="noopener">
              American Association of Feline Practitioners
            </a>{" "}
            (AAFP), the{" "}
            <a href="https://avsab.org/" target="_blank" rel="noopener">
              American Veterinary Society of Animal Behavior
            </a>{" "}
            (AVSAB), the{" "}
            <a href="https://www.aafco.org/" target="_blank" rel="noopener">
              Association of American Feed Control Officials
            </a>{" "}
            (AAFCO), the{" "}
            <a
              href="https://www.fda.gov/animal-veterinary"
              target="_blank"
              rel="noopener"
            >
              FDA Center for Veterinary Medicine
            </a>
            , the{" "}
            <a
              href="https://www.cdc.gov/healthy-pets/"
              target="_blank"
              rel="noopener"
            >
              CDC Healthy Pets, Healthy People
            </a>{" "}
            program, the{" "}
            <a
              href="https://www.epa.gov/pesticides"
              target="_blank"
              rel="noopener"
            >
              EPA Office of Pesticide Programs
            </a>
            , the{" "}
            <a
              href="https://www.centerforpetsafety.org/"
              target="_blank"
              rel="noopener"
            >
              Center for Pet Safety
            </a>
            , the{" "}
            <a
              href="https://www.birds.cornell.edu/home/"
              target="_blank"
              rel="noopener"
            >
              Cornell Lab of Ornithology
            </a>
            , and{" "}
            <a href="https://lafeber.com/vet/" target="_blank" rel="noopener">
              LafeberVet
            </a>
            . Every guide on the site cites the specific references it leans
            on, with the date the source was last checked.
          </p>

          <h2>What we cover</h2>
          <p>
            Five hubs anchor the site, and every spoke review links back to
            the hub it belongs to:
          </p>
          <ul>
            <li>
              <Link href="/guides/aquarium-water-quality-cycling-testing-beginners">
                Aquarium water quality, cycling &amp; testing
              </Link>{" "}
              — the nitrogen cycle, water-test kits, conditioners, and
              bacteria starters for first-time fishkeepers.
            </li>
            <li>
              <Link href="/guides/aquarium-filtration-maintenance-systems">
                Aquarium filtration &amp; maintenance
              </Link>{" "}
              — HOB, canister, and sponge filters, media, water-change
              tools, and ongoing tank care.
            </li>
            <li>
              <Link href="/guides/reptile-habitat-environmental-control">
                Reptile habitat &amp; environmental control
              </Link>{" "}
              — enclosures, UVB lighting, heat, thermostats, and substrate
              by species.
            </li>
            <li>
              <Link href="/guides/smart-bird-feeders-backyard-birdwatching">
                Smart bird feeders &amp; backyard birdwatching
              </Link>{" "}
              — AI-cam feeders, seed selection, and what the spec sheets
              don&apos;t tell you about backyard birding.
            </li>
            <li>
              Cat &amp; dog care across{" "}
              <Link href="/guides/cat-dog-nutrition-hydration-digestive-health">
                nutrition &amp; hydration
              </Link>
              ,{" "}
              <Link href="/guides/cat-dog-grooming-dental-shedding">
                grooming &amp; dental
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
                senior-pet mobility &amp; preventive care
              </Link>
              .
            </li>
          </ul>

          <h2>The author</h2>
          <p>
            Editorial direction is by{" "}
            <Link href="/author/nick-miles">Nick Miles</Link>, who founded
            PetPalHQ and also serves as editor-in-chief of the established
            sister site{" "}
            <a
              href="https://www.smarthomeexplorer.com/"
              target="_blank"
              rel="noopener"
            >
              SmartHomeExplorer
            </a>
            . Both publications run on the same editorial discipline:
            synthesis of expert consensus, named sources in body prose,
            dated refresh signals on every guide, and a transparent score
            formula. If you&apos;ve read SmartHomeExplorer&apos;s{" "}
            <a
              href="https://www.smarthomeexplorer.com/methodology/"
              target="_blank"
              rel="noopener"
            >
              methodology page
            </a>
            , the editorial voice here will feel familiar — it&apos;s the
            same one applied to a different vertical.
          </p>

          <h2>How we make money</h2>
          <p>
            PetPalHQ is funded by Amazon affiliate commissions. Every
            clickable product link uses our Associates tag (
            <code>{siteConfig.amazonTag}</code>); when a reader buys
            something through one of our links, Amazon pays us a small
            percentage at no cost to the reader. We don&apos;t accept
            payment from manufacturers, and a brand cannot pay to be
            recommended on this site. Editorial recommendations are
            independent of commission rate. See our{" "}
            <Link href="/affiliate-disclosure">affiliate disclosure</Link>{" "}
            for the full policy.
          </p>

          <h2>Get in touch</h2>
          <p>
            Corrections, source suggestions, and questions are all welcome
            at <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>.
            If you find a passage where we&apos;ve misread a source, the
            fastest way to get it fixed is a short email — every guide on
            this site has a documented <code>updatedDate</code> and{" "}
            <code>lastProductCheck</code>, and we update with attribution
            when the underlying sources do.
          </p>
        </div>
      </article>
    </>
  );
}
