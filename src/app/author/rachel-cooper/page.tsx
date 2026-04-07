import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buildPersonEntity, buildPageGraph } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Rachel Cooper — Senior Pet Editor",
  description: "Rachel Cooper is a former veterinary technician and Senior Pet Editor at PetPalHQ with 10+ years reviewing pet gear, nutrition, and health products.",
  alternates: { canonical: `${siteConfig.url}/author/rachel-cooper` },
};

export default function RachelCooperPage() {
  const personEntity = buildPersonEntity();
  const schema = buildPageGraph({});

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            ...schema,
            "@graph": [...schema["@graph"], personEntity],
          }),
        }}
      />

      <main className="mx-auto px-4 max-w-3xl py-12">
        <div className="mb-4">
          <Link href="/" className="text-sm text-amber-600 hover:text-amber-700">
            ← PetPalHQ
          </Link>
        </div>

        <div className="flex items-start gap-6 mb-8">
          <div className="shrink-0 w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-3xl font-bold border-2 border-amber-200">
            R
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Rachel Cooper</h1>
            <p className="text-amber-700 font-medium mb-2">Senior Pet Editor, PetPalHQ</p>
            <p className="text-sm text-gray-500">Former veterinary technician · 10+ years reviewing pet products</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {["Dog Harnesses & Leashes", "Cat Feeders & Toys", "Pet Nutrition", "Small Animal Care", "Pet Travel Gear", "Veterinary Wellness"].map((tag) => (
            <span key={tag} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <div className="prose max-w-none">
          <h2>About Rachel</h2>
          <p>
            Rachel Cooper joined PetPalHQ as Senior Pet Editor after nearly a decade working as a licensed
            veterinary technician in small animal practices across the Pacific Northwest. She&apos;s spent
            the last 10+ years translating her clinical experience into practical product guidance that
            helps pet owners navigate an overwhelming marketplace.
          </p>
          <p>
            Rachel has personally tested and reviewed over 200 pet products — from no-pull harnesses to
            automatic feeders to orthopedic dog beds. Her reviews combine real-world testing with veterinary
            knowledge to surface issues that standard consumer reviews often miss, like harness fit problems
            that cause joint stress or feeder designs that can cause portion inconsistency.
          </p>

          <h2>Expertise</h2>
          <ul>
            <li>Dog training equipment and behavioral aids</li>
            <li>Feline enrichment and automatic feeding systems</li>
            <li>Pet nutrition labels and ingredient analysis</li>
            <li>Small animal housing and environmental enrichment</li>
            <li>Travel safety for cats and dogs</li>
            <li>Senior pet care products and mobility aids</li>
          </ul>

          <h2>Background</h2>
          <p>
            Rachel holds a degree in Veterinary Technology and is a member of the National Association
            of Veterinary Technicians in America (NAVTA). She lives in Portland, Oregon, with two dogs
            (a Border Collie mix named Scout and a rescue Greyhound named Beau) and a tabby cat named Fig.
          </p>

          <h2>Editorial Standards</h2>
          <p>
            Rachel&apos;s reviews follow PetPalHQ&apos;s strict editorial guidelines: no pay-to-play
            placements, no inflated ratings for affiliate products, and all recommendations updated when
            better products emerge. Read more about our{" "}
            <Link href="/about">methodology and approach</Link>.
          </p>

          <h2>Contact</h2>
          <p>
            Rachel can be reached at{" "}
            <a href="mailto:rachel@petpalhq.com">rachel@petpalhq.com</a> for product submissions,
            corrections, or media inquiries.
          </p>
        </div>
      </main>
    </>
  );
}
