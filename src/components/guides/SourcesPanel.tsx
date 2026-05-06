import type { GuideSources, GuideMethodology } from "@/lib/guides";

interface SourcesPanelProps {
  sources?: GuideSources;
  methodology?: GuideMethodology;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function SourcesPanel({ sources, methodology }: SourcesPanelProps) {
  if (!sources) return null;

  return (
    <section id="sources" className="mb-16 scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6"
        style={{ color: "var(--color-navy)" }}
      >
        Sources & Methodology
      </h2>

      <div
        className="p-6 rounded-lg border space-y-5"
        style={{
          borderColor: "var(--color-cream-deep)",
          backgroundColor: "var(--color-cream-deep)",
        }}
      >
        {methodology?.formula && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-teal)" }}
            >
              Methodology
            </p>
            <pre
              className="font-mono text-xs overflow-x-auto whitespace-pre-wrap p-3 rounded bg-white"
              style={{ color: "var(--color-text)" }}
            >
              {methodology.formula}
            </pre>
          </div>
        )}

        {sources.expert && sources.expert.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-teal)" }}
            >
              Expert review sources
            </p>
            <ul className="text-sm flex flex-wrap gap-x-4 gap-y-1" style={{ color: "var(--color-text)" }}>
              {sources.expert.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {sources.community && sources.community.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-teal)" }}
            >
              Community sources
            </p>
            <ul className="text-sm flex flex-wrap gap-x-4 gap-y-1" style={{ color: "var(--color-text)" }}>
              {sources.community.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {sources.verifiedDate && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Prices and specs verified <strong>{formatDate(sources.verifiedDate)}</strong>.
          </p>
        )}

        {sources.authorBio && (
          <div className="pt-4 border-t" style={{ borderColor: "var(--color-cream)" }}>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-teal)" }}
            >
              About the author
            </p>
            <p className="text-sm" style={{ color: "var(--color-text)" }}>
              {sources.authorBio}
            </p>
          </div>
        )}

        <p className="text-xs pt-3 border-t" style={{
          borderColor: "var(--color-cream)",
          color: "var(--color-text-muted)",
        }}>
          PetPalHQ is a participant in the Amazon Services LLC Associates Program. We may
          earn commissions from qualifying purchases — at no extra cost to you.
        </p>
      </div>
    </section>
  );
}
