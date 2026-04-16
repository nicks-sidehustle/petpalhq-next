interface SourcesListProps {
  sources: string[];
}

export function SourcesList({ sources }: SourcesListProps) {
  if (sources.length === 0) return null;

  return (
    <section
      style={{
        padding: "22px 26px",
        background: "#FFFFFF",
        border: "1px solid var(--oat)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--driftwood)",
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Sources we relied on
      </div>
      {sources.map((s, i) => (
        <div
          key={i}
          style={{
            fontSize: 13,
            color: "var(--shale)",
            padding: "6px 0",
            borderBottom:
              i < sources.length - 1
                ? "1px solid var(--linen)"
                : "none",
            fontFamily: "var(--font-body)",
            lineHeight: 1.5,
          }}
        >
          {s}
        </div>
      ))}
    </section>
  );
}
