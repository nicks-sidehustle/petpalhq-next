import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Affiliate Disclosure | ${siteConfig.name}`,
  description: "Our affiliate disclosure and how we make money while keeping reviews honest.",
  alternates: {
    canonical: `${siteConfig.url}/affiliate-disclosure`,
  },
};

export default function AffiliateDisclosurePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Affiliate Disclosure</h1>

      <div className="prose prose-lg dark:prose-invert">
        <p className="text-lg text-muted-foreground mb-6">
          Transparency matters to us. Here&apos;s how {siteConfig.name} works and how we keep the lights on.
        </p>

        <h2>How We Make Money</h2>
        <p>
          {siteConfig.name} is a participant in the <strong>Amazon Services LLC Associates Program</strong>,
          an affiliate advertising program designed to provide a means for sites to earn advertising fees
          by advertising and linking to Amazon.com.
        </p>
        <p>
          When you click on product links on our site and make a purchase, we may earn a small commission
          at <strong>no additional cost to you</strong>. This funds the editorial work — the hours of source
          reading, expert-consensus synthesis, and methodology refinement that {siteConfig.name} is built on.
        </p>

        <h2>Our Editorial Independence</h2>
        <p>
          <strong>Our reviews and recommendations are never influenced by affiliate relationships.</strong>{" "}
          We aggregate expert opinions from veterinarians, aquarists, herpetologists, ornithologists, and
          peer-reviewed publications. Our PetPal Gear Score is calculated on five fixed pillars (Expert
          Consensus, Effectiveness, Animal Safety, Durability, Value) — not commission rates.
        </p>
        <p>
          We recommend products we genuinely believe earn expert consensus. If a product doesn&apos;t earn
          that consensus, we&apos;ll say so — even if it means we don&apos;t earn a commission. We also
          name what we passed on and why, not just what we recommend.
        </p>

        <h2>What This Means for You</h2>
        <ul>
          <li>You pay the <strong>same price</strong> whether you use our links or not</li>
          <li>Our reviews are based on <strong>expert consensus</strong>, not commission rates</li>
          <li>We clearly label product links that may earn us a commission</li>
          <li>We never accept payment for positive reviews</li>
          <li>We do not personally test products — we synthesize expert reviews and owner data, and we&apos;re explicit about that</li>
        </ul>

        <h2>Other Affiliate Programs</h2>
        <p>
          In addition to Amazon Associates, we may also participate in affiliate programs from:
        </p>
        <ul>
          <li>Specialty pet retailers (Chewy, Petco) — when relevant gear is sold there at competitive prices</li>
          <li>Manufacturer direct programs (e.g., aquarium and reptile equipment makers)</li>
          <li>Other retail partners offering pet gear</li>
        </ul>

        <h2>Questions?</h2>
        <p>
          If you have any questions about our affiliate relationships or how we make money,
          email us at <a href="mailto:hello@petpalhq.com">hello@petpalhq.com</a>. We believe in full transparency.
        </p>

        <p className="text-sm text-muted-foreground mt-8">
          Last updated: May 2026
        </p>
      </div>
    </div>
  );
}
