import type { GuideTopPick } from "@/lib/guides";

interface EvidenceAtAGlanceProps {
  picks?: GuideTopPick[];
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EvidenceAtAGlance({ picks }: EvidenceAtAGlanceProps) {
  if (!picks?.length) return null;

  return (
    <section id="evidence-at-a-glance" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6"
        style={{ color: "var(--color-navy)" }}
      >
        Evidence at a Glance
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {picks.map((pick, i) => (
          <article
            key={i}
            className="p-5 rounded-lg border bg-white"
            style={{ borderColor: "var(--color-cream-deep)" }}
          >
            <h3
              className="font-serif text-lg font-bold mb-2"
              style={{ color: "var(--color-navy)" }}
            >
              {pick.name}
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--color-text)" }}>
              {pick.keyFeature}
            </p>
            {pick.sources?.length > 0 && (
              <p
                className="text-xs mb-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                <span className="font-semibold" style={{ color: "var(--color-teal)" }}>
                  Sources:
                </span>{" "}
                {pick.sources.join(", ")}
              </p>
            )}
            {pick.verifiedDate && (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Verified {formatDate(pick.verifiedDate)}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
