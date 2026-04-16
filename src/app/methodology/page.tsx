import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How We Research',
  description:
    'How we pick our three recommendations: 20+ expert sources per guide, weighted scoring, and honest trade-offs at every price point.',
  alternates: {
    canonical: `${siteConfig.url}/methodology`,
  },
};

function buildDatasetJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${siteConfig.url}/methodology#dataset`,
    name: 'Loyal & Found Expert Consensus Dataset',
    description:
      'Consensus-based pet product scores aggregated from expert reviews.',
    url: `${siteConfig.url}/methodology`,
    creator: {
      '@type': 'Organization',
      '@id': `${siteConfig.url}/#organization`,
      name: 'Loyal & Found',
    },
    dateModified: new Date().toISOString().split('T')[0],
    license: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  };
}

export default function MethodologyPage() {
  // Safe: content from our own schema builder, not user input
  const jsonLd = JSON.stringify(buildDatasetJsonLd());

  const pillars = [
    { name: 'Safety', weight: '35%', color: 'var(--tomato)', desc: 'Toxic-free materials, structural integrity, choking hazard assessment, and recall history.' },
    { name: 'Pet Comfort', weight: '25%', color: 'var(--sage)', desc: 'Ergonomic fit, material softness, noise levels, and stress-free design.' },
    { name: 'Durability', weight: '25%', color: 'var(--leaf)', desc: 'Build quality, material longevity, warranty coverage, and daily-use performance.' },
    { name: 'Value', weight: '15%', color: 'var(--honey)', desc: 'Price relative to feature set, replacement frequency, and cost-per-use.' },
  ];

  const verdicts = [
    { range: '9.0 \u2013 10.0', label: 'Must Buy', color: 'var(--leaf)', bg: '#f0f7ed', desc: 'Best-in-class. Expert consensus is overwhelming.' },
    { range: '8.0 \u2013 8.9', label: 'Recommended', color: 'var(--sage)', bg: '#f0f4ed', desc: 'Strong performer with broad expert approval.' },
    { range: '7.5 \u2013 7.9', label: 'Good Value', color: 'var(--honey)', bg: '#faf3e6', desc: 'Solid option, especially at its price point.' },
    { range: '6.0 \u2013 7.4', label: 'Mixed', color: 'var(--tomato)', bg: '#faf0ed', desc: 'Some strengths, but notable weaknesses.' },
    { range: 'Below 6.0', label: 'Skip', color: 'var(--driftwood)', bg: 'var(--ivory)', desc: 'Not recommended \u2014 better options exist.' },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 40, fontWeight: 500, color: 'var(--espresso)', margin: '0 0 12px', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
          How We Research
        </h1>
        <p style={{ fontSize: 17, color: 'var(--shale)', lineHeight: 1.6, margin: '0 0 40px', fontFamily: 'var(--font-body)' }}>
          We read dozens of expert reviews so you don&apos;t have to &mdash; then pick three products at three price points. Here&apos;s how the scoring works.
        </p>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 500, color: 'var(--espresso)', margin: '0 0 12px', fontFamily: 'var(--font-display)' }}>
            The Expert Consensus Score
          </h2>
          <p style={{ fontSize: 16, color: 'var(--walnut)', lineHeight: 1.75, margin: '0 0 12px', fontFamily: 'var(--font-body)' }}>
            Every product we recommend is backed by a composite score from 0 to 10 that distills expert opinion into a single number. We don&apos;t invent scores &mdash; we aggregate them from trusted pet publications and veterinary sources, then weight by source authority and recency.
          </p>
          <p style={{ fontSize: 16, color: 'var(--walnut)', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>
            No product gets scored without data from at least <strong style={{ color: 'var(--espresso)' }}>3 independent expert sources</strong>. Most of our guides draw from 20+.
          </p>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 500, color: 'var(--espresso)', margin: '0 0 16px', fontFamily: 'var(--font-display)' }}>
            The Four Pillars
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {pillars.map((p) => (
              <div key={p.name} style={{ background: '#FFFFFF', border: '1px solid var(--oat)', borderLeft: `4px solid ${p.color}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--espresso)', fontFamily: 'var(--font-body)' }}>{p.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: p.color, fontFamily: 'var(--font-body)' }}>{p.weight}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--shale)', lineHeight: 1.5, margin: 0, fontFamily: 'var(--font-body)' }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--ivory)', border: '1px solid var(--oat)', borderRadius: 10, padding: '14px 20px', marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--shale)', margin: 0, fontFamily: 'var(--font-body)' }}>
              Score = (Safety &times; 0.35) + (Pet Comfort &times; 0.25) + (Durability &times; 0.25) + (Value &times; 0.15)
            </p>
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 500, color: 'var(--espresso)', margin: '0 0 16px', fontFamily: 'var(--font-display)' }}>
            Verdict Scale
          </h2>
          <div style={{ border: '1px solid var(--oat)', borderRadius: 12, overflow: 'hidden' }}>
            {verdicts.map((v, i) => (
              <div key={v.label} style={{ display: 'grid', gridTemplateColumns: '100px 120px 1fr', alignItems: 'center', padding: '12px 16px', borderBottom: i < verdicts.length - 1 ? '1px solid var(--linen)' : 'none', fontFamily: 'var(--font-body)' }}>
                <span style={{ fontSize: 14, color: 'var(--shale)' }}>{v.range}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: v.color, background: v.bg, padding: '3px 10px', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>{v.label}</span>
                <span style={{ fontSize: 13, color: 'var(--shale)' }}>{v.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 500, color: 'var(--espresso)', margin: '0 0 12px', fontFamily: 'var(--font-display)' }}>Our Sources</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--shale)', marginBottom: 16 }}>
            {['Wirecutter (Pets)', 'American Kennel Club', 'PetMD', 'The Spruce Pets', 'Your Best Digs', 'Rover', 'Consumer Reports', 'Whole Dog Journal', 'Catster / Dogster', 'Chewy Editorial'].map((s) => (
              <div key={s} style={{ padding: '4px 0' }}>&bull; {s}</div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 500, color: 'var(--espresso)', margin: '0 0 12px', fontFamily: 'var(--font-display)' }}>What We Don&apos;t Do</h2>
          <p style={{ fontSize: 16, color: 'var(--walnut)', lineHeight: 1.75, margin: '0 0 12px', fontFamily: 'var(--font-body)' }}>
            We don&apos;t accept payment for scores. We don&apos;t boost products with higher affiliate commissions. We don&apos;t fabricate expert quotes. If a product doesn&apos;t have enough data, it doesn&apos;t get scored.
          </p>
        </section>

        <div style={{ padding: '18px 22px', background: 'var(--ivory)', border: '1px solid var(--oat)', borderRadius: 12, marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: 'var(--tomato)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-body)' }}>A note on pet health</div>
          <p style={{ fontSize: 14, color: 'var(--walnut)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-body)' }}>
            Our reviews cover gear performance, not veterinary advice. Always consult your veterinarian for health-related decisions about your pet.
          </p>
        </div>

        <p style={{ fontSize: 15, color: 'var(--shale)', fontFamily: 'var(--font-body)' }}>
          Questions? Email{' '}
          <a href="mailto:hello@petpalhq.com" style={{ color: 'var(--tomato)', textDecoration: 'underline', textUnderlineOffset: 2 }}>hello@petpalhq.com</a>
          {' '}&middot;{' '}
          <Link href="/affiliate-disclosure" style={{ color: 'var(--tomato)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Affiliate disclosure</Link>
        </p>
      </main>
    </>
  );
}
