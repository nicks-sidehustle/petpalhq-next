import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "PetPalHQ's affiliate disclosure — how we earn commissions and how that affects our reviews.",
  alternates: { canonical: `${siteConfig.url}/affiliate-disclosure` },
  robots: { index: false, follow: true },
};

export default function AffiliateDisclosurePage() {
  return (
    <main className="mx-auto px-4 max-w-3xl py-12">
      <div className="mb-4">
        <Link href="/" className="text-sm text-amber-600 hover:text-amber-700">
          ← PetPalHQ
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Affiliate Disclosure</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: April 2026</p>

      <div className="prose max-w-none">
        <p>
          PetPalHQ (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) participates in affiliate marketing programs.
          This page explains our affiliate relationships and how they may affect the content on this site.
        </p>

        <h2>Amazon Associates Program</h2>
        <p>
          PetPalHQ is a participant in the Amazon Services LLC Associates Program, an affiliate advertising
          program designed to provide a means for sites to earn advertising fees by advertising and linking
          to Amazon.com. Our Amazon Associates tag is <strong>petpalhq-20</strong>.
        </p>
        <p>
          When you click a product link on PetPalHQ and make a qualifying purchase on Amazon, we may earn a
          small commission. This commission comes at no additional cost to you — you pay the same price you
          would pay if you navigated to Amazon directly.
        </p>

        <h2>Other Affiliate Programs</h2>
        <p>
          In addition to Amazon, we may occasionally participate in affiliate programs operated by other
          retailers, including but not limited to Chewy, Petco, and other pet product retailers. These
          relationships are governed by the same standards described in this disclosure.
        </p>

        <h2>How Affiliate Relationships Affect Our Content</h2>
        <p>
          We want to be completely transparent: affiliate commissions help fund the operation of PetPalHQ,
          including the time and resources required to research, test, and publish our buying guides.
        </p>
        <p>
          However, we do not allow affiliate relationships to influence our editorial recommendations.
          Our reviews and rankings are based on product quality, safety, value for money, and user
          feedback — not on commission rates or paid placements. We do not accept payment to rank a
          product higher than it deserves.
        </p>
        <p>
          If we include a product in a buying guide, it&apos;s because we genuinely believe it&apos;s
          worth recommending to our readers and their pets.
        </p>

        <h2>FTC Compliance</h2>
        <p>
          This disclosure is provided in accordance with the Federal Trade Commission&apos;s guidelines
          on endorsements and testimonials (16 CFR Part 255). Any material connection between PetPalHQ
          and a product or brand — including affiliate relationships — is disclosed clearly on the relevant
          pages.
        </p>
        <p>
          Pages containing affiliate links display the following notice at the top of the content:
          &quot;This page contains affiliate links. If you purchase through these links, we may earn a
          commission at no extra cost to you.&quot;
        </p>

        <h2>Questions</h2>
        <p>
          If you have questions about our affiliate relationships or editorial independence, please
          contact us at <a href="mailto:hello@petpalhq.com">hello@petpalhq.com</a>.
        </p>
      </div>
    </main>
  );
}
