import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/schema";
import SynthesisCallout from "@/components/SynthesisCallout";

const PAGE_TITLE = "Affiliate disclosure";
const PAGE_DESC =
  "PetPalHQ earns Amazon affiliate commissions on qualifying purchases. Every product link uses our Associates tag petpalhq08-20. Recommendations are independent of commission rate; manufacturer sponsorships are not accepted.";
const UPDATED_DATE = "2026-05-05";
const PAGE_URL = `${SITE_URL}/affiliate-disclosure`;

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `${PAGE_TITLE} | ${siteConfig.name}`,
    description: PAGE_DESC,
    url: PAGE_URL,
    type: "article",
  },
};

export default function AffiliateDisclosurePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--color-teal)" }}
      >
        Disclosure
      </p>
      <h1
        className="font-serif text-4xl md:text-5xl font-bold mb-6 leading-tight"
        style={{ color: "var(--color-navy)" }}
      >
        Affiliate disclosure
      </h1>

      <div className="prose">
        <p>
          <strong>Last updated:</strong> {UPDATED_DATE}
        </p>

        <p>
          PetPalHQ is funded by Amazon affiliate commissions.{" "}
          <strong>
            When you click a product link on this site and buy something,
            Amazon pays us a small percentage at no extra cost to you.
          </strong>{" "}
          That commission income covers the editorial work behind every guide
          and keeps PetPalHQ independent of manufacturer sponsorships and paid
          placements.
        </p>

        <h2 id="amazon-associates">Amazon Associates Program</h2>
        <p>
          PetPalHQ is a participant in the Amazon Services LLC Associates
          Program, an affiliate advertising program designed to provide a means
          for sites to earn advertising fees by advertising and linking to{" "}
          <a href="https://www.amazon.com" target="_blank" rel="noopener">
            amazon.com
          </a>
          . Every clickable product link on this site carries our Associates
          tag <code>{siteConfig.amazonTag}</code> in its URL — that tag is what
          signals to Amazon that the visit came from PetPalHQ. As an Amazon
          Associate we earn from qualifying purchases.
        </p>

        <h2 id="how-links-appear">How affiliate links appear on this site</h2>
        <p>
          Three places carry affiliate links on every guide:
        </p>
        <ul>
          <li>
            <strong>Pick cards.</strong> Each ranked product in our buyer&apos;s
            guides has a price and "Check price on Amazon" link that goes to
            amazon.com with our tag attached.
          </li>
          <li>
            <strong>Inline product-name links.</strong> When a product name
            appears anywhere in a review&apos;s body prose, verdict paragraph,
            or bottom-line summary, it&apos;s automatically wrapped in a link
            to that product&apos;s Amazon page. This is rendering convenience
            — it does <strong>not</strong> change which product we recommend
            or how strongly.
          </li>
          <li>
            <strong>Comparison tables.</strong> Product names in our comparison
            tables link through to the corresponding Amazon listing.
          </li>
        </ul>
        <p>
          Affiliate links do <strong>not</strong> appear in our short-answer
          summaries or in FAQ answers — those sections stay clean for source
          citation and machine-readability. Editorial source citations (e.g.,{" "}
          <a href="https://www.merckvetmanual.com/" target="_blank" rel="noopener">
            Merck Veterinary Manual
          </a>
          , AAHA, AVMA, peer-reviewed studies) are always plain non-affiliate
          links to the original publication.
        </p>

        <h2 id="commission-policy">
          What an Amazon commission does — and doesn&apos;t — change
        </h2>
        <p>
          The commission rate Amazon pays for a category is <strong>not</strong>{" "}
          a factor in which products we recommend or how we rank them. The
          PetPal Gear Score (full breakdown on the{" "}
          <Link href="/methodology">methodology page</Link>) weights expert
          consensus (30%), effectiveness (25%), animal safety (20%), durability
          (15%), and value (10%). Commission rate is not a sixth factor, and
          the formula is publicly versioned.
        </p>
        <p>
          We do not accept payment from manufacturers. A brand cannot pay to be
          reviewed, recommended, scored higher, or featured in an article.
          Brand-supplied review copy is not published verbatim. When
          manufacturer technical pages are cited, they&apos;re cited alongside
          independent sources and labelled as manufacturer documentation.
        </p>

        <SynthesisCallout
          label="Worth saying out loud"
          heading="We don't run a testing lab — and we don't pretend to."
        >
          <p className="mb-0">
            Every recommendation on this site is editorial synthesis of expert
            sources we name in the body of every guide. We don&apos;t accept
            free product samples in exchange for coverage, we don&apos;t
            publish sponsored posts, and we never claim hands-on testing we
            didn&apos;t do. The full framework — including our weighted score
            formula and named source stack — lives on the{" "}
            <Link href="/methodology">methodology page</Link>.
          </p>
        </SynthesisCallout>

        <h2 id="ftc">Federal Trade Commission compliance</h2>
        <p>
          This disclosure exists to comply with the United States{" "}
          <a
            href="https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers"
            target="_blank"
            rel="noopener"
          >
            Federal Trade Commission&apos;s Endorsement Guides
          </a>{" "}
          (16 CFR Part 255), which require clear, conspicuous disclosure of
          material connections between an editorial site and the products it
          covers. The material connection here is straightforward: PetPalHQ
          earns a small commission when readers buy through Amazon links on
          this site. That&apos;s the whole disclosure.
        </p>
        <p>
          PetPalHQ also abides by the Amazon Associates Operating Agreement,
          which requires the identification statement included above and
          forbids misrepresentation of pricing, availability, or product
          attributes. Pricing and stock are checked at the{" "}
          <code>lastProductCheck</code> date shown in each guide; if you spot
          something that&apos;s gone stale,{" "}
          <a href="mailto:editor@petpalhq.com">tell us</a>.
        </p>

        <h2 id="questions">Questions or corrections</h2>
        <p>
          Send corrections, source suggestions, and disclosure questions to{" "}
          <a href="mailto:editor@petpalhq.com">editor@petpalhq.com</a>. The
          companion documents are our{" "}
          <Link href="/privacy-policy">privacy policy</Link> (data, cookies,
          analytics) and the{" "}
          <Link href="/methodology">methodology page</Link> (how a product gets
          recommended in the first place).
        </p>
      </div>
    </article>
  );
}
