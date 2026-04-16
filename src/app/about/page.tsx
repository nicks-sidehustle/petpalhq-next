import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About Loyal & Found",
  description: "Independent pet product research. We read the experts, test what we can, and pick three products at three price points. No paid sponsorships.",
  alternates: { canonical: `${siteConfig.url}/about` },
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <h1 style={{ fontSize: 40, fontWeight: 500, color: "var(--espresso)", margin: "0 0 12px", letterSpacing: "-0.02em", fontFamily: "var(--font-display)" }}>
        About Loyal{" "}
        <em style={{ fontStyle: "italic", color: "var(--tomato)" }}>&amp;</em>{" "}
        Found
      </h1>
      <p style={{ fontSize: 17, color: "var(--shale)", lineHeight: 1.6, margin: "0 0 40px", fontFamily: "var(--font-body)" }}>
        Independent pet product research. Three picks, three price points, no fluff.
      </p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 26, fontWeight: 500, color: "var(--espresso)", margin: "0 0 12px", fontFamily: "var(--font-display)" }}>
          What we do
        </h2>
        <p style={{ fontSize: 16, color: "var(--walnut)", lineHeight: 1.75, margin: "0 0 12px", fontFamily: "var(--font-body)" }}>
          We read dozens of expert reviews &mdash; from veterinarians, certified trainers, behaviorists, and long-term product testers &mdash; and find where professional opinion genuinely converges. Then we pick three products at three price points: one for the budget, one sweet spot, and one worth the splurge.
        </p>
        <p style={{ fontSize: 16, color: "var(--walnut)", lineHeight: 1.75, fontFamily: "var(--font-body)" }}>
          Every recommendation includes an honest trade-off. We&apos;ll tell you what each product does well, who it&apos;s for, and when it&apos;s not the right call. No paid sponsorships. No brands reach out to us. The affiliate links earn us a small commission if you buy, which keeps the lights on &mdash; but they don&apos;t change what we recommend.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 26, fontWeight: 500, color: "var(--espresso)", margin: "0 0 12px", fontFamily: "var(--font-display)" }}>
          How we&apos;re different
        </h2>
        <div style={{ display: "grid", gap: 12 }}>
          {[
            { label: "Three picks, not fifteen", desc: "Every guide recommends exactly 3 products at 3 price points. Enough options to cover every budget, few enough to actually decide." },
            { label: "Honest trade-offs", desc: "Every pick has a downside. We'll tell you what it is. Splurge picks always include a \"skip it unless\" section." },
            { label: "Expert aggregation, not individual testing", desc: "We synthesize 20+ expert sources per guide. The aggregate opinion of 8+ reviewers is more reliable than any single test." },
          ].map((item) => (
            <div key={item.label} style={{ padding: "16px 20px", background: "#FFFFFF", border: "1px solid var(--oat)", borderRadius: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--espresso)", marginBottom: 4, fontFamily: "var(--font-body)" }}>{item.label}</div>
              <div style={{ fontSize: 14, color: "var(--shale)", lineHeight: 1.6, fontFamily: "var(--font-body)" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 26, fontWeight: 500, color: "var(--espresso)", margin: "0 0 12px", fontFamily: "var(--font-display)" }}>
          Affiliate disclosure
        </h2>
        <p style={{ fontSize: 16, color: "var(--walnut)", lineHeight: 1.75, fontFamily: "var(--font-body)" }}>
          Loyal &amp; Found participates in the Amazon Associates program. When you click a link and make a purchase, we may earn a small commission at no extra cost to you. This never influences our recommendations. Read our full{" "}
          <Link href="/affiliate-disclosure" style={{ color: "var(--tomato)", textDecoration: "underline", textUnderlineOffset: 2 }}>
            affiliate disclosure
          </Link>.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 26, fontWeight: 500, color: "var(--espresso)", margin: "0 0 12px", fontFamily: "var(--font-display)" }}>
          Get in touch
        </h2>
        <p style={{ fontSize: 16, color: "var(--walnut)", lineHeight: 1.75, fontFamily: "var(--font-body)" }}>
          Product suggestion, correction, or question? Email us at{" "}
          <a href="mailto:hello@petpalhq.com" style={{ color: "var(--tomato)", textDecoration: "underline", textUnderlineOffset: 2 }}>hello@petpalhq.com</a>.
        </p>
      </section>
    </main>
  );
}
