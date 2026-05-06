import Link from "next/link";

export default function LatestReviews() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
          Latest Reviews
        </h2>
        <Link href="/reviews" className="text-sm font-medium hover:underline" style={{ color: "var(--color-teal)" }}>
          See all
        </Link>
      </div>
      <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center" style={{ color: "var(--color-text-muted)" }}>
        <p className="text-sm">No reviews yet — first wave coming soon.</p>
      </div>
    </section>
  );
}
