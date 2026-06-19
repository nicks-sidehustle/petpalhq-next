import type { AuthoritySource } from "@/lib/guides";

interface PickAuthoritySourcesProps {
  sources?: AuthoritySource[];
}

/**
 * Compact per-pick "Sources" element. Lists each authority outlet (clickable
 * when a non-empty url is present) followed by the verbatim stat/finding it
 * supports. Renders nothing when no structured sources exist, so legacy picks
 * without authoritySources are unaffected.
 *
 * Editorial: `stat` is a short verbatim figure or paraphrased finding (long
 * verbatim quotes are NOT stored here — see AuthoritySource docs in guides.ts).
 */
export default function PickAuthoritySources({ sources }: PickAuthoritySourcesProps) {
  if (!sources?.length) return null;

  return (
    <div className="mt-6">
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: "var(--color-teal)" }}
      >
        Sources
      </p>
      <ul className="space-y-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
        {sources.map((s, i) => (
          <li key={i} className="flex">
            <span className="mr-2" style={{ color: "var(--color-teal)" }} aria-hidden="true">
              •
            </span>
            <span>
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="font-semibold underline"
                  style={{ color: "var(--color-navy)" }}
                >
                  {s.outlet}
                </a>
              ) : (
                <span className="font-semibold" style={{ color: "var(--color-navy)" }}>
                  {s.outlet}
                </span>
              )}
              {s.stat ? <>: {s.stat}</> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
