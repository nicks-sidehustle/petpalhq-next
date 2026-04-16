import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Our Methodology — How PetPal Scores Work',
  description:
    'How we calculate the PetPal Score: Safety 35%, Pet Comfort 25%, Durability 25%, Value 15%. Transparent scoring for pet products from expert review synthesis.',
  alternates: {
    canonical: `${siteConfig.url}/methodology`,
  },
};

// ─── Dataset JSON-LD ─────────────────────────────────────────────────────────
// schema.org/Dataset makes this scoring data citable by search engines and LLMs.

function buildDatasetJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${siteConfig.url}/methodology#dataset`,
    name: 'PetPal Score Dataset',
    description:
      'Consensus-based pet product scores aggregated from expert reviews. Each product receives a composite PetPal Score weighted across four pillars: Safety (35%), Pet Comfort (25%), Durability (25%), and Value (15%).',
    url: `${siteConfig.url}/methodology`,
    creator: {
      '@type': 'Organization',
      '@id': `${siteConfig.url}/#organization`,
      name: 'PetPalHQ',
    },
    dateModified: new Date().toISOString().split('T')[0],
    license: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: 'PetPal Score',
        description:
          'Composite score (0–10) derived from expert review synthesis across Safety, Pet Comfort, Durability, and Value.',
        minValue: 0,
        maxValue: 10,
      },
      {
        '@type': 'PropertyValue',
        name: 'Safety',
        description:
          'Toxic-free materials, structural integrity under chewing and scratching, choking hazard assessment, and recall history. Weight: 35%.',
        unitText: 'weight: 0.35',
      },
      {
        '@type': 'PropertyValue',
        name: 'Pet Comfort',
        description:
          'Ergonomic fit, material softness, noise levels, and stress-free design for the animal. Weight: 25%.',
        unitText: 'weight: 0.25',
      },
      {
        '@type': 'PropertyValue',
        name: 'Durability',
        description:
          'Build quality, material longevity, warranty coverage, and performance under daily pet use. Weight: 25%.',
        unitText: 'weight: 0.25',
      },
      {
        '@type': 'PropertyValue',
        name: 'Value',
        description:
          'Price relative to feature set, replacement frequency, and cost-per-use over the product lifespan. Weight: 15%.',
        unitText: 'weight: 0.15',
      },
    ],
    measurementTechnique:
      'Expert review synthesis from leading pet publications and veterinary sources, weighted by editorial rigor, testing depth, and recency. Verified purchaser data used as a secondary signal.',
    distribution: {
      '@type': 'DataDownload',
      contentUrl: `${siteConfig.url}/methodology`,
      encodingFormat: 'text/html',
    },
    includedInDataCatalog: {
      '@type': 'DataCatalog',
      name: 'PetPalHQ Product Research',
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MethodologyPage() {
  // Safe JSON-LD injection — content is from our own buildDatasetJsonLd(),
  // not user input. This matches the pattern in layout.tsx.
  const jsonLd = JSON.stringify(buildDatasetJsonLd());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className="py-10">
        <div className="mx-auto px-4 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Our Methodology
          </h1>
          <p className="text-lg text-gray-500 mb-10">
            How the PetPal Score works — and why you should trust it.
          </p>

          <div className="prose prose-gray max-w-none">
            {/* ── Overview ─────────────────────────────────────────── */}
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
              What Is the PetPal Score?
            </h2>
            <p className="text-gray-600 mb-4">
              The PetPal Score is a composite rating from 0 to 10 that distills
              expert opinion into a single, comparable number. We don&apos;t invent
              scores — we aggregate them from trusted pet publications and
              veterinary sources, normalize to a common scale, and weight by
              source authority and recency.
            </p>
            <p className="text-gray-600 mb-4">
              Every score is anchored to real expert reviews. No product receives
              a PetPal Score without data from at least three independent expert
              sources.
            </p>

            {/* ── Why Safety First ──────────────────────────────────── */}
            <h2 className="text-xl font-bold text-gray-900 mt-10 mb-3">
              Why Safety Leads at 35%
            </h2>
            <p className="text-gray-600 mb-4">
              A faulty garden tool wastes money. A faulty pet product can injure
              an animal. That&apos;s why Safety carries the heaviest weight in
              every PetPal Score. We evaluate toxic-free materials, structural
              integrity under chewing and scratching, choking hazard potential,
              and CPSC/FDA recall history before anything else.
            </p>

            {/* ── The Formula ──────────────────────────────────────── */}
            <h2 className="text-xl font-bold text-gray-900 mt-10 mb-3">
              The Formula
            </h2>
            <p className="text-gray-600 mb-4">
              Each product&apos;s PetPal Score is a weighted average of four
              pillars:
            </p>
          </div>

          {/* Pillar cards — outside prose for custom layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 not-prose">
            {[
              {
                name: 'Safety',
                weight: '35%',
                color: 'bg-red-50 border-red-200',
                icon: '🛡️',
                desc: 'Toxic-free materials, structural integrity under chewing/scratching, choking hazard assessment, and recall history.',
              },
              {
                name: 'Pet Comfort',
                weight: '25%',
                color: 'bg-green-50 border-green-200',
                icon: '🐾',
                desc: 'Ergonomic fit, material softness, noise levels, and stress-free design for the animal.',
              },
              {
                name: 'Durability',
                weight: '25%',
                color: 'bg-blue-50 border-blue-200',
                icon: '⚙️',
                desc: 'Build quality, material longevity, warranty coverage, and performance under daily pet use.',
              },
              {
                name: 'Value',
                weight: '15%',
                color: 'bg-amber-50 border-amber-200',
                icon: '💰',
                desc: 'Price relative to feature set, replacement frequency, and cost-per-use over the product lifespan.',
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-lg border p-4 ${p.color}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{p.icon}</span>
                  <span className="font-semibold text-gray-900">{p.name}</span>
                  <span className="ml-auto text-sm font-bold text-gray-700">
                    {p.weight}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="prose prose-gray max-w-none">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 my-6 not-prose">
              <p className="text-sm font-mono text-gray-700 text-center">
                PetPal Score = (Safety &times; 0.35) + (Pet Comfort &times; 0.25) + (Durability &times; 0.25) + (Value &times; 0.15)
              </p>
            </div>

            {/* ── Verdict Scale ────────────────────────────────────── */}
            <h2 className="text-xl font-bold text-gray-900 mt-10 mb-3">
              Verdict Scale
            </h2>
            <p className="text-gray-600 mb-4">
              The composite score maps to a plain-language verdict:
            </p>
          </div>

          <div className="not-prose overflow-x-auto mb-8">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Score Range</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Verdict</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">What It Means</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="px-4 py-2">9.0 – 10.0</td><td className="px-4 py-2"><span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">Must Buy</span></td><td className="px-4 py-2 text-gray-600">Best-in-class. Expert consensus is overwhelming.</td></tr>
                <tr><td className="px-4 py-2">8.0 – 8.9</td><td className="px-4 py-2"><span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">Recommended</span></td><td className="px-4 py-2 text-gray-600">Strong performer with broad expert approval.</td></tr>
                <tr><td className="px-4 py-2">7.5 – 7.9</td><td className="px-4 py-2"><span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded">Good Value</span></td><td className="px-4 py-2 text-gray-600">Solid option, especially at its price point.</td></tr>
                <tr><td className="px-4 py-2">6.0 – 7.4</td><td className="px-4 py-2"><span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded">Mixed</span></td><td className="px-4 py-2 text-gray-600">Some strengths, but notable weaknesses.</td></tr>
                <tr><td className="px-4 py-2">Below 6.0</td><td className="px-4 py-2"><span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded">Skip</span></td><td className="px-4 py-2 text-gray-600">Not recommended — better options exist.</td></tr>
              </tbody>
            </table>
          </div>

          <div className="prose prose-gray max-w-none">
            {/* ── Our Sources ──────────────────────────────────────── */}
            <h2 className="text-xl font-bold text-gray-900 mt-10 mb-3">
              Our Sources
            </h2>
            <p className="text-gray-600 mb-4">
              We synthesize expert reviews from leading pet publications and
              veterinary sources, including:
            </p>
            <ul className="text-gray-600 mb-4">
              <li>Wirecutter (Pets)</li>
              <li>American Kennel Club</li>
              <li>PetMD</li>
              <li>The Spruce Pets</li>
              <li>Your Best Digs</li>
              <li>Rover</li>
              <li>Consumer Reports</li>
              <li>Whole Dog Journal</li>
              <li>Catster / Dogster</li>
              <li>Chewy Editorial</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Each product requires a minimum of <strong>3 independent expert sources</strong> before
              we assign a PetPal Score. We weight sources by editorial rigor,
              testing depth, and recency.
            </p>

            {/* ── What We Don't Do ─────────────────────────────────── */}
            <h2 className="text-xl font-bold text-gray-900 mt-10 mb-3">
              What We Don&apos;t Do
            </h2>
            <p className="text-gray-600 mb-4">
              We don&apos;t accept payment for scores. We don&apos;t boost products
              with higher affiliate commissions. We don&apos;t fabricate expert
              quotes. If a product doesn&apos;t have enough independent expert
              data, it doesn&apos;t get a PetPal Score — period.
            </p>
            <p className="text-gray-600 mb-4">
              We also don&apos;t claim to test every product in a lab. Our model
              is transparent: we&apos;re expert-review synthesizers with selective
              hands-on validation for key products. We believe the aggregate
              opinion of 8+ expert reviewers is more reliable than any single
              test.
            </p>

            {/* ── Veterinary Note ──────────────────────────────────── */}
            <h2 className="text-xl font-bold text-gray-900 mt-10 mb-3">
              A Note on Pet Health
            </h2>
            <p className="text-gray-600 mb-4">
              Our reviews cover gear performance, not veterinary advice. While
              our editor Rachel Cooper is a former licensed veterinary
              technician, product scores reflect expert consensus on build
              quality, safety, and value — not clinical recommendations. Always
              consult your veterinarian for health-related decisions about your
              pet.
            </p>

            {/* ── Contact ──────────────────────────────────────────── */}
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
              Questions About Our Methodology?
            </h2>
            <p className="text-gray-600 mb-4">
              We welcome scrutiny. If you think a score is off, or if you&apos;ve
              found an expert review we missed, email us at{' '}
              <a href="mailto:hello@petpalhq.com" className="text-amber-600 hover:underline">
                hello@petpalhq.com
              </a>
              . We&apos;ll review the data and update the score if warranted.
            </p>
            <p className="text-gray-600">
              <Link href="/affiliate-disclosure" className="text-amber-600 hover:underline">
                Affiliate disclosure
              </Link>{' '}
              ·{' '}
              <Link href="/about" className="text-amber-600 hover:underline">
                About us
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
