import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { categories } from "@/data/categories";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return categories.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category);
  if (!cat) return {};

  return {
    title: `${cat.name} Product Reviews`,
    description: `Expert ${cat.name.toLowerCase()} product reviews — ${cat.description}`,
    alternates: { canonical: `${siteConfig.url}/reviews/${category}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <nav style={{ fontSize: 13, color: "var(--driftwood)", fontFamily: "var(--font-body)", marginBottom: 24 }}>
        <Link href="/" style={{ color: "var(--driftwood)", textDecoration: "none" }}>Home</Link>
        <span style={{ margin: "0 6px" }}>&rsaquo;</span>
        <Link href="/reviews" style={{ color: "var(--driftwood)", textDecoration: "none" }}>Reviews</Link>
        <span style={{ margin: "0 6px" }}>&rsaquo;</span>
        <span style={{ color: "var(--shale)" }}>{cat.name}</span>
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 32 }}>{cat.icon}</span>
        <h1 style={{ fontSize: 36, fontWeight: 500, color: "var(--espresso)", margin: 0, fontFamily: "var(--font-display)" }}>
          {cat.name} Reviews
        </h1>
      </div>
      <p style={{ fontSize: 16, color: "var(--shale)", lineHeight: 1.6, margin: "0 0 32px", fontFamily: "var(--font-body)" }}>
        {cat.description}
      </p>

      <div style={{ padding: "28px 24px", background: "var(--ivory)", border: "1px solid var(--oat)", borderRadius: 14, textAlign: "center" }}>
        <p style={{ fontSize: 15, color: "var(--walnut)", marginBottom: 16, fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Individual product reviews are coming soon. In the meantime, check our buying guides for expert-vetted recommendations in the {cat.name.toLowerCase()} category.
        </p>
        <Link
          href="/guides"
          style={{
            display: "inline-block",
            padding: "10px 22px",
            background: "var(--tomato)",
            color: "var(--cream)",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            textDecoration: "none",
          }}
        >
          Browse buying guides
        </Link>
      </div>
    </main>
  );
}
