import Link from "next/link";

export function MethodologyCallout() {
  return (
    <section className="py-16 md:py-20" style={{ background: "var(--color-parchment)" }}>
      <div className="container mx-auto px-6 max-w-3xl">
        <div
          className="rounded-2xl p-8 md:p-12 text-center"
          style={{
            background: "var(--color-card-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-base md:text-lg leading-relaxed mb-6"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            We read every expert review from{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              veterinary schools, peer-reviewed studies, and tested reviews from
              publications like Tropical Fish Magazine, Reptiles Magazine, and
              Cornell Lab of Ornithology
            </strong>
            , then synthesize where professional opinion converges. A product earns
            a consensus score only when at least 3 independent experts agree.
          </p>

          {/* Inline metrics row */}
          <div
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <span style={{ color: "var(--color-antique-gold)" }}>150+ Sources</span>
            <span aria-hidden="true">·</span>
            <span>Products Scored Weekly</span>
            <span aria-hidden="true">·</span>
            <span>No Sponsored Content</span>
          </div>

          <Link
            href="/methodology"
            className="inline-block mt-6 text-sm font-semibold hover:underline"
            style={{ color: "var(--color-antique-gold)", fontFamily: "var(--font-sans)" }}
          >
            Read our full methodology →
          </Link>
        </div>
      </div>
    </section>
  );
}
