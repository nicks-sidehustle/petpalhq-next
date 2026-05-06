import type { PillarScores } from "@/lib/content/consensus-data";

interface ScoreBreakdownProps {
  scores: PillarScores;
}

const PILLARS: Array<{ key: keyof PillarScores; label: string }> = [
  { key: "expertConsensus", label: "Expert consensus" },
  { key: "effectiveness", label: "Effectiveness" },
  { key: "animalSafety", label: "Animal safety" },
  { key: "durability", label: "Durability" },
  { key: "value", label: "Value" },
];

export default function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  return (
    <section className="my-8">
      <h2 className="font-serif text-2xl font-bold mb-4" style={{ color: "var(--color-navy)" }}>
        Score breakdown
      </h2>
      <ul className="space-y-3">
        {PILLARS.map(({ key, label }) => {
          const value = scores[key];
          const pct = (value / 10) * 100;
          return (
            <li key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: "var(--color-text)" }}>{label}</span>
                <span className="font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {value.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--color-cream-deep)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: "var(--color-coral)" }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
