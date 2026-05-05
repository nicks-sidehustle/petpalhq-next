import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/lib/schema";

export const metadata: Metadata = {
  title: `About Us | ${siteConfig.name}`,
  description: `Learn about ${siteConfig.name} — independent gear reviews for aquarium, reptile, and bird keepers, built on expert consensus rather than personal testing claims.`,
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="py-10">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            About {siteConfig.name}
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-600 mb-6">
              We&apos;re an editorial team that got tired of pet-gear listicles written by people who clearly hadn&apos;t read a single expert source. Wrong UVB bulbs hurt reptiles. Bad filtration kills fish. Squirrel-defenseless feeders frustrate birders. The stakes are real, and the SERP is full of generic affiliate fluff.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Our Mission</h2>
            <p className="text-gray-600 mb-4">
              {siteConfig.name} synthesizes professional consensus from veterinarians, aquarists, herpetologists, and ornithologists to identify the gear that genuinely earns expert agreement. We focus on aquarium, reptile, and bird-feeder gear — exotic-pet categories where the wrong purchase has real consequences and where mainstream review sites barely scratch the surface.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>We do not personally test products.</strong> That&apos;s an honest framing, not a weakness. We read the reviews — academic papers, vet-school clinical guidance, multi-year owner durability data, and tested reviews from publications like <em>Tropical Fish Magazine</em>, <em>Reptiles Magazine</em>, and Cornell Lab of Ornithology — then synthesize where professional opinion converges. That&apos;s the work generic affiliate sites skip.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">How We Work</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>We read 20+ expert sources per category — vet schools, hobbyist publications, peer-reviewed durability studies, and verified owner data</li>
              <li>We aggregate ratings and identify where consensus is strongest</li>
              <li>We score every product on five pillars: Expert Consensus, Effectiveness, Animal Safety, Durability, and Value</li>
              <li>We name what we passed on and why — not just what we recommend</li>
              <li>We refresh prices and availability on a rolling 90-day cycle</li>
            </ul>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Affiliate Disclosure</h2>
            <p className="text-gray-600 mb-4">
              {siteConfig.name} participates in the Amazon Associates program. When you click an affiliate link and make a purchase, we may earn a small commission at no additional cost to you.
            </p>
            <p className="text-gray-600 mb-4">
              This funds the editorial work — the hours of source reading and consensus synthesis that the site is built on. Commission rates never influence our recommendations. If a product isn&apos;t worth it, we say so — even if it would have earned us a commission.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Contact</h2>
            <p className="text-gray-600">
              Questions, corrections, or expert feedback? Reach the editor at{" "}
              <a href={`mailto:hello@petpalhq.com`} className="text-[var(--color-evergreen)] hover:underline">
                hello@petpalhq.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
