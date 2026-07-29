import type { AuthoritySource } from "@/lib/guides";
import { amazonToGoHref } from "@/lib/affiliate-href";

interface PickAuthoritySourcesProps {
  sources?: AuthoritySource[];
  /** Parent pick's live purchasability flag (GuidePick.available). */
  available?: boolean;
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
export default function PickAuthoritySources({ sources, available }: PickAuthoritySourcesProps) {
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
        {sources.map((s, i) => {
          // Amazon source URLs carry the affiliate tag — route them through the
          // interaction-gated /go redirect (DG-2) with rel="…sponsored". Real
          // outlet citations (non-Amazon) pass through unchanged. When the
          // parent pick is marked unavailable (dead ASIN), an Amazon-hosted
          // citation must never render as a live affiliate link — fall back to
          // plain unlinked outlet text. Non-Amazon citations are unaffected.
          const go = s.url ? amazonToGoHref(s.url) : null;
          const isDeadAmazonSource = go !== null && available === false;
          const finalUrl = isDeadAmazonSource ? null : (go ?? s.url);
          const rel = go ? "nofollow sponsored noopener noreferrer" : "nofollow noopener noreferrer";
          return (
          <li key={i} className="flex">
            <span className="mr-2" style={{ color: "var(--color-teal)" }} aria-hidden="true">
              •
            </span>
            <span>
              {finalUrl ? (
                <a
                  href={finalUrl}
                  target="_blank"
                  rel={rel}
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
          );
        })}
      </ul>
    </div>
  );
}
