import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buildPersonEntity, buildPageGraph } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Rachel Cooper — Senior Pet Editor",
  description: "Rachel Cooper is a former veterinary technician and Senior Pet Editor at Loyal & Found with 10+ years reviewing pet gear, nutrition, and health products.",
  alternates: { canonical: `${siteConfig.url}/author/rachel-cooper` },
};

export default function RachelCooperPage() {
  const personEntity = buildPersonEntity();
  const schema = buildPageGraph({});
  // Safe JSON-LD: content from our own schema builders, not user input
  const jsonLd = JSON.stringify({
    ...schema,
    "@graph": [...schema["@graph"], personEntity],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--ivory)", border: "2px solid var(--oat)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 500, color: "var(--tomato)", fontFamily: "var(--font-display)", flexShrink: 0 }}>R</div>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 500, color: "var(--espresso)", margin: "0 0 4px", fontFamily: "var(--font-display)" }}>Rachel Cooper</h1>
            <p style={{ fontSize: 15, color: "var(--tomato)", fontWeight: 600, margin: "0 0 4px", fontFamily: "var(--font-body)" }}>Senior Pet Editor, Loyal &amp; Found</p>
            <p style={{ fontSize: 13, color: "var(--driftwood)", margin: 0, fontFamily: "var(--font-body)" }}>Former veterinary technician &middot; 10+ years reviewing pet products</p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
          {["Dog Harnesses & Leashes", "Cat Feeders & Fountains", "Pet Nutrition", "Small Animal Care", "Pet Travel Gear", "Veterinary Wellness"].map((tag) => (
            <span key={tag} style={{ fontSize: 12, padding: "4px 12px", background: "var(--ivory)", color: "var(--shale)", border: "1px solid var(--oat)", borderRadius: 6, fontFamily: "var(--font-body)" }}>{tag}</span>
          ))}
        </div>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 24, fontWeight: 500, color: "var(--espresso)", margin: "0 0 12px", fontFamily: "var(--font-display)" }}>About Rachel</h2>
          <p style={{ fontSize: 16, color: "var(--walnut)", lineHeight: 1.75, margin: "0 0 12px", fontFamily: "var(--font-body)" }}>
            Rachel Cooper joined the team after nearly a decade working as a licensed veterinary technician in small animal practices across the Pacific Northwest. She translates her clinical experience into practical product guidance that helps pet owners navigate an overwhelming marketplace.
          </p>
          <p style={{ fontSize: 16, color: "var(--walnut)", lineHeight: 1.75, fontFamily: "var(--font-body)" }}>
            Rachel leads the expert-review synthesis process for every guide &mdash; reading 20+ sources per category and identifying where professional opinion genuinely converges. Her veterinary background surfaces issues that standard consumer reviews miss, like harness fit problems that cause joint stress or feeder designs that enable portion drift.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 24, fontWeight: 500, color: "var(--espresso)", margin: "0 0 12px", fontFamily: "var(--font-display)" }}>Background</h2>
          <p style={{ fontSize: 16, color: "var(--walnut)", lineHeight: 1.75, fontFamily: "var(--font-body)" }}>
            Rachel holds a degree in Veterinary Technology and is a member of the National Association of Veterinary Technicians in America (NAVTA). She lives in Portland, Oregon, with two dogs (a Border Collie mix named Scout and a rescue Greyhound named Beau) and a tabby cat named Fig.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 24, fontWeight: 500, color: "var(--espresso)", margin: "0 0 12px", fontFamily: "var(--font-display)" }}>Editorial standards</h2>
          <p style={{ fontSize: 16, color: "var(--walnut)", lineHeight: 1.75, fontFamily: "var(--font-body)" }}>
            No pay-to-play placements. No inflated ratings for affiliate products. All recommendations updated when better products emerge. Read more about our{" "}
            <Link href="/methodology" style={{ color: "var(--tomato)", textDecoration: "underline", textUnderlineOffset: 2 }}>methodology</Link>.
          </p>
        </section>

        <p style={{ fontSize: 15, color: "var(--shale)", fontFamily: "var(--font-body)" }}>
          Reach Rachel at <a href="mailto:rachel@petpalhq.com" style={{ color: "var(--tomato)", textDecoration: "underline", textUnderlineOffset: 2 }}>rachel@petpalhq.com</a> for product submissions, corrections, or media inquiries.
        </p>
      </main>
    </>
  );
}
