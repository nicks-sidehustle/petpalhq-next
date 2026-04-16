import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { categories } from "@/data/categories";

export const metadata: Metadata = {
  title: "Pet Gear Reviews by Category",
  description: "Browse pet product reviews by category — dogs, cats, small pets, and more. Three picks at three price points.",
  alternates: { canonical: `${siteConfig.url}/reviews` },
};

export default function ReviewsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <h1 style={{ fontSize: 40, fontWeight: 500, color: "var(--espresso)", margin: "0 0 12px", letterSpacing: "-0.02em", fontFamily: "var(--font-display)" }}>
        Reviews by Category
      </h1>
      <p style={{ fontSize: 17, color: "var(--shale)", lineHeight: 1.6, margin: "0 0 40px", fontFamily: "var(--font-body)" }}>
        Browse product reviews by pet category. Every review features three picks at three price points.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {categories.map((cat) => (
          <Link key={cat.id} href={`/reviews/${cat.slug}`} style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, background: "#FFFFFF", border: "1px solid var(--oat)", borderRadius: 12, padding: "20px 22px", transition: "border-color 0.2s" }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{cat.icon}</span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, color: "var(--espresso)", marginBottom: 4, fontFamily: "var(--font-display)" }}>
                  {cat.name}
                </div>
                <p style={{ fontSize: 13, color: "var(--shale)", lineHeight: 1.5, margin: "0 0 8px", fontFamily: "var(--font-body)" }}>
                  {cat.description}
                </p>
                <span style={{ fontSize: 12, color: "var(--tomato)", fontWeight: 600, fontFamily: "var(--font-body)" }}>
                  {cat.count} products &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
