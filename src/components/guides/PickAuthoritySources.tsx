import type { AuthoritySource } from "@/lib/guides";

interface PickAuthoritySourcesProps {
  sources?: AuthoritySource[];
}

/**
 * Commerce/monetized destinations that must NEVER render as links inside a
 * citation surface (portfolio citability law; ports SHE PR #408). Covers
 * Amazon storefronts, amzn.to shorteners, and our own monetized redirects
 * (`/go/`, `/recommend/`). A false positive is benign — the entry simply
 * renders as plain citation text, which is the neutral outcome we want.
 */
const COMMERCE_URL = /amazon\.|amzn\.to|\/go\/|\/recommend\//i;

/**
 * Compact per-pick "Sources" element. Lists each authority outlet followed by
 * the verbatim stat/finding it supports. Renders nothing when no structured
 * sources exist, so legacy picks without authoritySources are unaffected.
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
        {sources.map((s, i) => {
          // Citability law: this is a citation surface, so a monetized
          // destination must never render as a link here — not as a raw Amazon
          // URL and not routed through /go/ either. Amazon-listing sources fall
          // back to plain unlinked outlet + claim text (mirroring the already
          // clean SourcesPanel). Genuine third-party outlet citations are
          // unaffected and keep their plain nofollow link.
          const url = s.url?.trim() ?? "";
          const finalUrl = !url || COMMERCE_URL.test(url) ? null : url;
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
          );
        })}
      </ul>
    </div>
  );
}
