import { LastVerified } from "@/components/LastVerified";

interface ResearchNoteProps {
  sourceCount: number;
  researchHours: number;
  /**
   * ISO date string (YYYY-MM-DD) for machine-readable <time> element.
   * Preferred going forward — pass guide.updatedDate directly.
   */
  updatedDate?: string;
  /**
   * Pre-formatted human date. Kept for backward compatibility — renders as
   * plain text if `updatedDate` isn't supplied. New callers should use
   * `updatedDate` so the date gets proper <time datetime> semantics.
   */
  lastUpdated?: string;
}

export function ResearchNote({
  sourceCount,
  researchHours,
  updatedDate,
  lastUpdated,
}: ResearchNoteProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 18px",
        background: "var(--ivory)",
        borderRadius: 10,
        fontFamily: "var(--font-body)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--walnut)" }}>
        <span style={{ fontWeight: 700, color: "var(--tomato)" }}>
          {sourceCount} sources
        </span>
        <span style={{ color: "var(--driftwood)", margin: "0 8px" }}>
          &middot;
        </span>
        <span style={{ color: "var(--shale)" }}>
          {researchHours} hrs research
        </span>
        {(updatedDate || lastUpdated) && (
          <>
            <span style={{ color: "var(--driftwood)", margin: "0 8px" }}>
              &middot;
            </span>
            <span style={{ color: "var(--shale)" }}>
              Updated{" "}
              {updatedDate ? (
                <LastVerified
                  variant="inline"
                  date={updatedDate}
                  format="long"
                />
              ) : (
                lastUpdated
              )}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
