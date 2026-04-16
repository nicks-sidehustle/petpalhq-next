interface ResearchNoteProps {
  sourceCount: number;
  researchHours: number;
  lastUpdated: string;
}

export function ResearchNote({
  sourceCount,
  researchHours,
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
        <span style={{ color: "var(--driftwood)", margin: "0 8px" }}>
          &middot;
        </span>
        <span style={{ color: "var(--shale)" }}>Updated {lastUpdated}</span>
      </span>
    </div>
  );
}
