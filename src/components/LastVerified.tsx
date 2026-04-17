/**
 * LastVerified — freshness trust signal for reader + machine.
 *
 * Two render modes:
 *   - `variant="pill"` (default): stand-alone badge with calendar icon and
 *     "Last verified: {date}" copy. Drop near a page title to telegraph
 *     recency. Useful on methodology / about / landing pages that don't
 *     carry a ResearchNote.
 *   - `variant="inline"`: bare <time> element for embedding in surrounding
 *     prose. Used inside ResearchNote so the date renders as a machine-
 *     readable <time dateTime="YYYY-MM-DD">.
 *
 * Why this matters: LLMs (ChatGPT / Perplexity / Claude) are more likely
 * to cite pages with a recent, explicit `<time datetime>` stamp. Prose
 * "Updated April 2026" without the semantic markup is much weaker.
 *
 * No external icon deps — inline SVG, consistent with the rest of L&F.
 */
interface LastVerifiedProps {
  /** ISO date string (YYYY-MM-DD) or Date object */
  date: string | Date;
  /** "pill" = standalone badge, "inline" = bare <time> for embedding */
  variant?: "pill" | "inline";
  /** Prefix copy for the pill. Defaults to "Last verified" */
  label?: string;
  /** Date format. "short" = "Apr 2026", "long" = "April 12, 2026" */
  format?: "short" | "long";
  className?: string;
}

function CalendarIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function formatDate(date: Date, format: "short" | "long"): string {
  if (format === "long") {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/** Machine-readable ISO date helper for JSON-LD `dateModified`. */
export function getSchemaDate(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split("T")[0];
}

export function LastVerified({
  date,
  variant = "pill",
  label = "Last verified",
  format = "short",
  className = "",
}: LastVerifiedProps) {
  const d = date instanceof Date ? date : new Date(date);
  const display = formatDate(d, format);
  const iso = getSchemaDate(d);

  if (variant === "inline") {
    // Bare <time> for embedding inside existing text (e.g., ResearchNote's
    // "Updated {date}" span). No icon, no styling — inherits from parent.
    return (
      <time dateTime={iso} className={className}>
        {display}
      </time>
    );
  }

  // Pill variant — L&F palette: Oat border, Driftwood text, cream bg.
  return (
    <span
      className={className}
      aria-label={`${label} ${display}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: "var(--cream)",
        border: "1px solid var(--oat)",
        borderRadius: 999,
        fontSize: 12,
        fontFamily: "var(--font-body)",
        color: "var(--driftwood)",
        lineHeight: 1,
      }}
    >
      <CalendarIcon />
      <span>{label}:</span>
      <time
        dateTime={iso}
        style={{ color: "var(--shale)", fontWeight: 500 }}
      >
        {display}
      </time>
    </span>
  );
}
