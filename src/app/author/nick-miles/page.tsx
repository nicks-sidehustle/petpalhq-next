import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { SITE_URL } from "@/lib/schema";

// Schema.org Person entity for Nick Miles is emitted at the layout/page-graph
// level via the @omc/schema factory bound in src/lib/schema.ts (which has the
// Nick Miles persona override). No page-specific JSON-LD injection needed
// here — the Person @id is resolvable from the buildOrganizationEntity +
// buildPersonEntity calls in the root graph.

export const metadata = {
  title: "Nick Miles, Chief Editor | PetPalHQ",
  description:
    "Meet Nick Miles, Chief Editor at PetPalHQ. Nick leads a network of expert-review publications synthesizing professional consensus on aquarium, reptile, and bird gear.",
  alternates: {
    canonical: `${SITE_URL}/author/nick-miles`,
  },
};

export default function NickMilesPage() {
  return (
    <>
      <SiteHeader />
      <main className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Author header */}
          <div className="flex items-center gap-6 mb-10">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0"
              style={{ background: "#f7eedd", color: "#1e3a6e" }}
            >
              N
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#1a2440" }}>
                Nick Miles
              </h1>
              <p className="text-lg font-medium mt-1" style={{ color: "#1e3a6e" }}>
                Chief Editor
              </p>
              <p className="text-sm text-gray-500 mt-1">PetPalHQ</p>
            </div>
          </div>

          {/* Bio */}
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4" style={{ color: "#1a2440" }}>
              About Nick
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Nick Miles is the chief editor of PetPalHQ and a network of sister review
                publications covering smart-home, garden, desk, and seasonal gear. The unifying
                editorial premise across every site he edits: read the experts, synthesize
                where consensus is genuine, and be honest about trade-offs.
              </p>
              <p>
                For PetPalHQ specifically, that means reading 20+ sources per category — academic
                papers from veterinary schools, peer-reviewed husbandry guidance, multi-year
                durability data from active hobbyist communities, and tested reviews from
                publications like <em>Tropical Fish Magazine</em>, <em>Reptiles Magazine</em>,
                <em> Practical Fishkeeping</em>, and Cornell Lab of Ornithology. The picks PetPalHQ
                publishes are the ones where professional opinion actually converges, scored on
                five fixed pillars: Expert Consensus, Effectiveness, Animal Safety, Durability,
                and Value.
              </p>
              <p>
                <strong>What Nick doesn&apos;t do is claim hands-on testing.</strong> The PetPalHQ
                editorial model is expert synthesis, not personal review. Synthesizing a category
                well takes hours of source reading per guide; faking testing claims to inflate
                authority is exactly the affiliate-site shortcut the site exists to reject.
              </p>
            </div>
          </section>

          {/* Expertise */}
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4" style={{ color: "#1a2440" }}>
              Editorial Coverage Areas
            </h2>
            <ul className="space-y-2">
              {[
                "Aquarium setup, water quality, and the nitrogen cycle",
                "Aquarium filtration, filter media, and long-term tank maintenance",
                "Reptile habitat design and species-specific husbandry (bearded dragon, leopard gecko, ball python, crested gecko)",
                "Reptile UVB lighting, basking heat, and temperature gradient safety",
                "Smart bird feeders, backyard birdwatching gear, and bird-camera technology",
                "Exotic-pet health and gear safety (chemical, thermal, mechanical)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-700">
                  <span className="mt-1 flex-shrink-0" style={{ color: "#f29c3a" }}>
                    &#10003;
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Methodology */}
          <section className="mb-10 rounded-xl p-6" style={{ background: "#fdfaf3" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#1a2440" }}>
              How We Review
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Every product on PetPalHQ goes through a structured synthesis process. Nick and the
              editorial team apply a consistent four-step method:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-semibold w-40 flex-shrink-0" style={{ color: "#1a2440" }}>
                  Source reading
                </span>
                <span>20+ expert sources per category — vet schools, hobbyist publications, peer-reviewed durability studies.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold w-40 flex-shrink-0" style={{ color: "#1a2440" }}>
                  Consensus mapping
                </span>
                <span>We identify where professional opinion converges across sources — that&apos;s the moat AI content can&apos;t shortcut.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold w-40 flex-shrink-0" style={{ color: "#1a2440" }}>
                  Five-pillar scoring
                </span>
                <span>Every product scored 0–10 on Expert Consensus (30%), Effectiveness (25%), Animal Safety (20%), Durability (15%), and Value (10%).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold w-40 flex-shrink-0" style={{ color: "#1a2440" }}>
                  Honest trade-offs
                </span>
                <span>Every recommendation paired with what it costs you — where it falls short, who should consider an alternative.</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              See the full methodology at{" "}
              <Link href="/methodology" className="underline" style={{ color: "#1e3a6e" }}>
                /methodology
              </Link>.
            </p>
          </section>

          {/* Links */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#1a2440" }}>
              Browse Nick&apos;s Editorial
            </h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
                style={{ background: "#1e3a6e" }}
              >
                Browse All Guides
              </Link>
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-medium px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Browse All Reviews
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
