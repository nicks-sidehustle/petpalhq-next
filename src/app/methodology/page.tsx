import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/schema";
import { getAllGuideSummaries } from "@/lib/guides";
import SynthesisCallout from "@/components/SynthesisCallout";

const PAGE_TITLE = "How we evaluate pet gear";
const PAGE_DESC =
  "PetPalHQ does not run a testing lab. We synthesize veterinary references, regulatory guidance, peer-reviewed studies, manufacturer documentation, and hobbyist signals into a transparent composite — the PetPal Gear Score. Every source is named; every guide is dated.";
const PUBLISH_DATE = "2026-05-01";
const UPDATED_DATE = "2026-05-05";
const PAGE_URL = `${SITE_URL}/methodology`;

export const metadata: Metadata = {
  title: "Methodology",
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `${PAGE_TITLE} | ${siteConfig.name}`,
    description: PAGE_DESC,
    url: PAGE_URL,
    type: "article",
  },
};

const FORMULA_TEXT = `PetPal Gear Score = (Expert Consensus × 0.30)
                  + (Effectiveness × 0.25)
                  + (Animal Safety × 0.20)
                  + (Durability × 0.15)
                  + (Value × 0.10)

Formula version: v1.0 (effective 2026-05-01)`;

interface SourceCategory {
  category: string;
  examples: { name: string; href: string }[];
  useCase: string;
}

const SOURCE_STACK: SourceCategory[] = [
  {
    category: "Veterinary references",
    examples: [
      { name: "Merck Veterinary Manual", href: "https://www.merckvetmanual.com/" },
      { name: "AAHA Guidelines", href: "https://www.aaha.org/aaha-guidelines/" },
      { name: "AVMA", href: "https://www.avma.org/" },
      { name: "AAFP", href: "https://catvets.com/" },
      { name: "ISFM", href: "https://icatcare.org/veterinary/isfm/" },
      { name: "Cornell Feline Health Center", href: "https://www.vet.cornell.edu/departments/cornell-feline-health-center" },
      { name: "Tufts Cummings Petfoodology", href: "https://vet.tufts.edu/petfoodology" },
      { name: "LafeberVet", href: "https://lafeber.com/vet/" },
    ],
    useCase: "Primary authority for safety, animal-welfare, and clinical-care claims.",
  },
  {
    category: "Regulatory & safety",
    examples: [
      { name: "FDA Center for Veterinary Medicine", href: "https://www.fda.gov/animal-veterinary" },
      { name: "EPA Office of Pesticide Programs", href: "https://www.epa.gov/pesticides" },
      { name: "CDC Healthy Pets, Healthy People", href: "https://www.cdc.gov/healthy-pets/" },
      { name: "AAFCO", href: "https://www.aafco.org/" },
      { name: "FAA / TSA / IATA", href: "https://www.faa.gov/travelers/fly_pets" },
      { name: "Center for Pet Safety", href: "https://www.centerforpetsafety.org/" },
      { name: "USDA APHIS", href: "https://www.aphis.usda.gov/" },
    ],
    useCase: "Compliance, food-safety standards, transport rules, and crash-test certification.",
  },
  {
    category: "Peer-reviewed studies",
    examples: [
      { name: "Salonen et al. 2020 (Scientific Reports — canine separation anxiety)", href: "https://www.nature.com/articles/s41598-020-59837-z" },
      { name: "Vieira de Castro et al. 2020 (PLOS ONE — training methods)", href: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0225023" },
      { name: "Frank et al. 2010 (pheromone meta-review)", href: "https://pubmed.ncbi.nlm.nih.gov/20880455/" },
    ],
    useCase: "Evidence-based claims about behavior, training methods, and product efficacy.",
  },
  {
    category: "Manufacturer documentation",
    examples: [
      { name: "Brand spec sheets", href: "https://www.seachem.com" },
      { name: "Product manuals", href: "https://zoomed.com" },
      { name: "Care guidelines", href: "https://mybirdbuddy.com" },
    ],
    useCase: "Verified product features, dimensions, materials, and care instructions.",
  },
  {
    category: "Retailer & marketplace data",
    examples: [
      { name: "Amazon Creators API (ASIN, price, image)", href: "https://affiliate-program.amazon.com/" },
    ],
    useCase: "Live availability and pricing on the dated lastProductCheck shown in every guide.",
  },
  {
    category: "Hobbyist communities",
    examples: [
      { name: "r/dogs", href: "https://www.reddit.com/r/dogs/" },
      { name: "r/cats", href: "https://www.reddit.com/r/cats/" },
      { name: "r/aquariums", href: "https://www.reddit.com/r/aquariums/" },
      { name: "r/seniordogs", href: "https://www.reddit.com/r/seniordogs/" },
    ],
    useCase: "Real-world friction points and edge cases. Used as signal, never as authority.",
  },
];

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

export default function MethodologyPage() {
  // Live data-refresh table — sorted by updatedDate desc, top 15.
  const refreshes = [...getAllGuideSummaries()]
    .filter((g) => g.updatedDate)
    .sort((a, b) => b.updatedDate.localeCompare(a.updatedDate))
    .slice(0, 15);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: PAGE_TITLE,
    description: PAGE_DESC,
    url: PAGE_URL,
    datePublished: PUBLISH_DATE,
    dateModified: UPDATED_DATE,
    author: {
      "@type": "Person",
      name: "Nick Miles",
      url: `${SITE_URL}/author/nick-miles`,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: SITE_URL,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": PAGE_URL },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4 py-12">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-teal)" }}
        >
          Methodology
        </p>
        <h1
          className="font-serif text-4xl md:text-5xl font-bold mb-6 leading-tight"
          style={{ color: "var(--color-navy)" }}
        >
          {PAGE_TITLE}
        </h1>

        <div className="prose">
          <p>
            PetPalHQ is editorial synthesis of expert consensus. We read across
            veterinary references, regulatory guidance, peer-reviewed studies,
            manufacturer documentation, and hobbyist communities — and we name
            every source we lean on. Authority through transparency and
            citation, not first-hand testing.
          </p>
          <p>
            This page documents the framework: the sources we pull from, how
            we weight them in the PetPal Gear Score, how often we refresh
            pricing and source lists, and what we explicitly don&apos;t claim.
            It&apos;s the most quotable methodology document in pet content
            because every part of it is a verifiable promise.
          </p>
        </div>

        <SynthesisCallout>
          <p className="mb-3">
            We do not run a testing lab. Every recommendation on this site is
            editorial synthesis of expert sources we name in the body of every
            guide. One editor with a sample size of one is not more trustworthy
            than the consensus of veterinary references, peer-reviewed studies,
            and regulatory bodies — combined.
          </p>
          <p className="mb-0">
            When ten experts converge on the same answer, that&apos;s a
            signal. When they disagree, that&apos;s also a signal — and we say
            so.
          </p>
        </SynthesisCallout>

        <div className="prose">
          <h2 id="petpal-gear-score">The PetPal Gear Score</h2>
          <p>
            Every product we recommend gets a 0–10 PetPal Gear Score. The
            score is a transparent weighted composite of expert opinion and
            documented signals. It is <strong>not</strong> a laboratory
            measurement and we don&apos;t claim it is one.
          </p>
        </div>

        <pre
          className="my-6 overflow-x-auto rounded-md p-5 text-sm leading-relaxed"
          style={{
            backgroundColor: "var(--color-cream-deep)",
            color: "var(--color-text)",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          <code>{FORMULA_TEXT}</code>
        </pre>

        <div className="prose">
          <h3>What each factor means</h3>
          <ul>
            <li>
              <strong>Expert Consensus (30%)</strong> — How strongly the
              veterinary, regulatory, and academic sources we cite endorse the
              product or its category. The single largest weight, because it
              is the only factor that doesn&apos;t depend on a single
              editor&apos;s judgment.
            </li>
            <li>
              <strong>Effectiveness (25%)</strong> — Whether the product
              actually does what its category requires, judged against the
              functional standards described in the source stack (e.g.,
              filter flow rate adequate for tank size; UVB output sufficient
              for the species).
            </li>
            <li>
              <strong>Animal Safety (20%)</strong> — Documented safety
              record: recalls, FDA / EPA / Center for Pet Safety findings,
              materials disclosure, and known failure modes. A safety
              shortcoming caps the score regardless of effectiveness.
            </li>
            <li>
              <strong>Durability (15%)</strong> — Build quality and longevity,
              triangulated from manufacturer documentation, brand warranty
              terms, and hobbyist-community failure reports across multiple
              years.
            </li>
            <li>
              <strong>Value (10%)</strong> — Price relative to the field, on
              the dated <code>lastProductCheck</code> shown in every guide.
              Re-checked monthly; we update the score if the price-to-field
              relationship moves.
            </li>
          </ul>
          <p>
            The score is a composite of expert opinion, not a measurement.
            Two editors applying the same framework should reach similar
            scores; that&apos;s the design goal. When sources disagree, the
            disagreement is documented in the guide body rather than averaged
            away.
          </p>

          <h2 id="source-stack">Our source stack</h2>
          <p>
            Six categories of source feed every guide. We name organizations
            and authors by name in body prose so readers can verify each
            claim against the original document.
          </p>
        </div>

        <div className="my-8 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--color-cream-deep)" }}>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold" style={{ color: "var(--color-navy)" }}>
                  Category
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold" style={{ color: "var(--color-navy)" }}>
                  Examples (named, linked)
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold" style={{ color: "var(--color-navy)" }}>
                  Use case
                </th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_STACK.map((row) => (
                <tr key={row.category} className="align-top">
                  <td className="border border-gray-200 px-4 py-3 font-semibold" style={{ color: "var(--color-navy)" }}>
                    {row.category}
                  </td>
                  <td className="border border-gray-200 px-4 py-3">
                    {row.examples.map((ex, i) => (
                      <span key={ex.name}>
                        <a
                          href={ex.href}
                          target="_blank"
                          rel="noopener"
                          style={{
                            color: "var(--color-teal-deep)",
                            textDecoration: "underline",
                          }}
                        >
                          {ex.name}
                        </a>
                        {i < row.examples.length - 1 ? "; " : ""}
                      </span>
                    ))}
                  </td>
                  <td className="border border-gray-200 px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
                    {row.useCase}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="prose">
          <h2 id="refresh-policy">Refresh policy</h2>
          <p>
            Pet gear is a moving target — formulas reformulate, brands fold,
            recalls happen, and Amazon prices move daily. Every guide on this
            site shows two dated signals: a top-of-page <code>updatedDate</code>{" "}
            and a <code>lastProductCheck</code> for pricing and availability.
          </p>
          <ul>
            <li>
              <strong>Pricing</strong> is checked at least monthly, and more
              frequently on high-volatility products (litter, food, smart
              feeders).
            </li>
            <li>
              <strong>The source stack</strong> is reviewed quarterly for new
              veterinary guidance, peer-reviewed studies, and regulatory
              changes.
            </li>
            <li>
              <strong>The score formula</strong> is versioned. v1.0 is in
              effect from 2026-05-01. Version bumps happen when factor
              weights change; in that event, every score on the site is
              recalculated and the guide&apos;s <code>updatedDate</code>{" "}
              moves.
            </li>
            <li>
              Each guide carries its own dated refresh signals at the bottom
              of the page in the SourcesPanel — alongside the named source
              list for that specific guide.
            </li>
          </ul>
        </div>

        <h2
          id="latest-data-refreshes"
          className="font-serif text-2xl md:text-3xl font-bold mt-12 mb-4"
          style={{ color: "var(--color-navy)" }}
        >
          Latest data refreshes
        </h2>
        <p className="mb-6 max-w-3xl" style={{ color: "var(--color-text-muted)" }}>
          The 15 most-recently-updated guides on the site, sorted by{" "}
          <code>updatedDate</code> descending. Every entry links to the live
          guide. This table is generated from the same dated frontmatter that
          drives each guide&apos;s SourcesPanel — public-record refresh
          transparency, not a marketing claim.
        </p>

        <div className="-mx-4 sm:mx-0 overflow-x-auto mb-6">
          <table className="w-full max-w-5xl mx-auto border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--color-cream-deep)" }}>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold" style={{ color: "var(--color-navy)" }}>
                  Guide
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "var(--color-navy)" }}>
                  Last updated
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "var(--color-navy)" }}>
                  Last product check
                </th>
              </tr>
            </thead>
            <tbody>
              {refreshes.map((g) => (
                <tr key={g.slug}>
                  <td className="border border-gray-200 px-4 py-3">
                    <Link
                      href={`/guides/${g.slug}`}
                      style={{
                        color: "var(--color-teal-deep)",
                        textDecoration: "underline",
                      }}
                    >
                      {g.title}
                    </Link>
                  </td>
                  <td
                    className="border border-gray-200 px-4 py-3 whitespace-nowrap"
                    style={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      color: "var(--color-text)",
                    }}
                  >
                    {formatDate(g.updatedDate)}
                  </td>
                  <td
                    className="border border-gray-200 px-4 py-3 whitespace-nowrap"
                    style={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      color: "var(--color-text)",
                    }}
                  >
                    {formatDate(g.lastProductCheck)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mb-12 max-w-3xl" style={{ color: "var(--color-text-muted)" }}>
          Every guide carries its own dated refresh signal. This page shows
          the most recent across the site — the most current{" "}
          {refreshes.length} of {getAllGuideSummaries().length} live guides.
        </p>

        <div className="prose">
          <h2 id="what-we-dont-claim">What we don&apos;t claim</h2>
          <ul>
            <li>We don&apos;t run a testing lab.</li>
            <li>
              We don&apos;t have first-hand experience with every product
              we cover.
            </li>
            <li>
              The PetPal Gear Score is an editorial composite of expert
              opinion and documented signals — explicitly not a laboratory
              measurement.
            </li>
            <li>
              We don&apos;t accept payment from manufacturers and a brand
              cannot pay to be recommended on this site.
            </li>
            <li>
              We name our sources by organization and author. Readers can
              verify every claim against the original document.
            </li>
          </ul>

          <h2 id="how-we-earn">How we earn</h2>
          <p>
            PetPalHQ is funded by Amazon affiliate commissions through the
            Associates tag <code>{siteConfig.amazonTag}</code>. When a reader
            buys through a link on the site, Amazon pays us a small
            percentage at no cost to the reader. Editorial recommendations
            are independent of commission rate. The full policy lives on the{" "}
            <Link href="/affiliate-disclosure">affiliate-disclosure page</Link>.
          </p>

          <h2 id="questions-corrections">Questions &amp; corrections</h2>
          <p>
            Send corrections, source suggestions, and questions to{" "}
            <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>. If
            you find an outdated source citation or a product that&apos;s no
            longer accurate, write us — we update with attribution. The
            editorial direction here is by{" "}
            <Link href="/author/nick-miles">Nick Miles</Link>, who also
            edits the sister site{" "}
            <a
              href="https://www.smarthomeexplorer.com/"
              target="_blank"
              rel="noopener"
            >
              SmartHomeExplorer
            </a>{" "}
            on the same editorial principles.
          </p>
        </div>
      </article>
    </>
  );
}
