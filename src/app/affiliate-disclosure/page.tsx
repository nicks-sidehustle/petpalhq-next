import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/schema";
import SynthesisCallout from "@/components/SynthesisCallout";

const PAGE_TITLE = "Affiliate disclosure";
const PAGE_DESC =
  "PetPalHQ earns Amazon affiliate commissions on qualifying purchases. Every product link uses our Associates tag petpalhq08-20. Recommendations are independent of commission rate, and rankings, scores, and picks are never sponsored and never for sale.";
const UPDATED_DATE = "2026-08-19";
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
          PetPalHQ is funded by Amazon affiliate commissions and by
          clearly-labelled sponsored placements.{" "}
          <strong>
            When you click a product link on this site and buy something,
            Amazon pays us a small percentage at no extra cost to you.
          </strong>{" "}
          That commission income covers the editorial work behind every guide.
          Sponsorship is the other part: today we run exactly one paid
          placement — a Waggle listing unit on our{" "}
          <Link href="/guides/best-pet-cameras-2026">
            best pet cameras guide
          </Link>
          , marked <strong>Sponsored</strong> and kept in its own section. It is
          the only sponsored placement on the site, and this page will name any
          future one the same way. Either way, rankings, scores, and picks are
          never sponsored and never for sale.
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
          Seven kinds of places carry affiliate links on our guides. Three of
          them are on every buyer&apos;s guide that has a ranked roster:
        </p>
        <ul>
          <li>
            <strong>Pick cards.</strong> Each ranked product in our buyer&apos;s
            guides has a price and a &quot;Check price&quot; link that goes to
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
        <p>The other four appear only in specific places:</p>
        <ul>
          <li>
            <strong>The mobile price bar.</strong> On phones and small tablets,
            a bar pinned to the bottom of a guide repeats the top pick&apos;s
            price and its &quot;Check price&quot; link. It is the same link as
            that pick&apos;s card, shown again where a thumb can reach it.
          </li>
          <li>
            <strong>Seasonal cross-guide blocks.</strong> A small number of
            guides carry a short seasonal block pointing at a pick from a
            related guide. On phones and tablets it sits in the body of the
            guide. Those links carry our tag too.
          </li>
          <li>
            <strong>The seasonal promotions module.</strong> During shopping
            seasons, those same few guides also carry a small promotions card
            in the sidebar on wide screens. It is the same kind of cross-guide
            recommendation as the block above, tracked separately from it, and
            it carries its own &quot;Affiliate link — we may earn a
            commission&quot; note on the card itself.
          </li>
          <li>
            <strong>Our sponsored placement.</strong> The Waggle unit on our{" "}
            <Link href="/guides/best-pet-cameras-2026">
              best pet cameras guide
            </Link>{" "}
            has two &quot;Check price&quot; links of its own. Waggle pays for
            the space; the links are ordinary affiliate links, tagged
            separately so we can tell sponsored clicks apart from editorial
            ones. Nothing in that unit is ranked, scored, or considered in the
            guide&apos;s picks.
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
          We do not accept payment to change a score, a ranking, or a verdict.
          No brand can buy a review, a higher score, or a place among our
          picks. The sponsored placement we run is labelled as sponsored and
          sits in its own section, separate from editorial —
          never folded into a guide&apos;s rankings, scores, or picks, because
          those are not for sale at any price. If a manufacturer sends us a
          product to try, we say so in the coverage that comes out of it, and
          the conclusion is still ours. Brand-supplied review copy is not
          published verbatim. When manufacturer technical pages are cited,
          they&apos;re cited alongside independent sources and labelled as
          manufacturer documentation.
        </p>

        <SynthesisCallout
          label="Worth saying out loud"
          heading="We don't run a testing lab — and we don't pretend to."
        >
          <p className="mb-0">
            Every recommendation on this site is editorial synthesis of expert
            sources we name in the body of every guide. Rankings and scores are
            never sponsored and never for sale. If a manufacturer sends us a
            product, we disclose it in the coverage that results, and we never
            claim hands-on testing we didn&apos;t do. The full framework —
            including our weighted score formula and named source stack — lives
            on the{" "}
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
          covers. There are two here, and both are stated plainly above:
          PetPalHQ earns a small commission when readers buy through Amazon
          links on this site, and Waggle pays for a labelled sponsored
          placement on one guide. Neither connection buys a rank, a score, or a
          verdict — including on the guides where Waggle&apos;s own products
          are ranked, which carry the same disclosure.
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
